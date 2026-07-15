#!/usr/bin/env bash
# Build the LCZ Studio Python sidecar binary via PyInstaller.
# Produces: desktop/src-tauri/binaries/lcz-api-<target-triple>
#
# Usage: cd desktop/sidecar && ./build_sidecar.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Creating Python virtual environment..."
# Prefer native arm64 Python (Homebrew) over conda x86_64 to avoid Rosetta 2 overhead.
# PyInstaller binary arch must match the rustc host triple for Tauri bundling.
if [ "$(uname -m)" = "arm64" ] && [ -x "/opt/homebrew/bin/python3.13" ]; then
    PYTHON_BIN="/opt/homebrew/bin/python3.13"
    echo "==> Using native arm64 Python: $PYTHON_BIN"
elif [ "$(uname -m)" = "arm64" ] && [ -x "/opt/homebrew/bin/python3" ]; then
    PYTHON_BIN="/opt/homebrew/bin/python3"
    echo "==> Using native arm64 Python: $PYTHON_BIN"
else
    PYTHON_BIN="python3"
    echo "==> Using system Python: $PYTHON_BIN ($(python3 -c 'import platform; print(platform.machine())'))"
fi
"$PYTHON_BIN" -m venv .venv-sidecar-native
# shellcheck source=/dev/null
source .venv-sidecar-native/bin/activate

echo "==> Installing dependencies..."
pip install --upgrade pip --quiet
pip install fastapi uvicorn python-multipart pyinstaller --quiet

# Pin the exact wheel published on TestPyPI instead of relying on a
# machine-specific source checkout. The hash was verified against the
# TestPyPI release metadata before integration.
LCZ4PY_WHEEL_URL="https://test-files.pythonhosted.org/packages/fd/69/17472248394c84c736b121f06ca0c828f87766d94672d4108363b7bcc1f5/lcz4py-0.1.0-py3-none-any.whl"
LCZ4PY_SHA256="2a32239b246b76f5738298f39b37cc223bf0054facf8322b35f9ff4b282ed6ee"

curl -fsSL "$LCZ4PY_WHEEL_URL" -o lcz4py-0.1.0-py3-none-any.whl
ACTUAL_SHA256=$(shasum -a 256 lcz4py-0.1.0-py3-none-any.whl | awk '{print $1}')
if [ "$ACTUAL_SHA256" != "$LCZ4PY_SHA256" ]; then
    echo "ERROR: LCZ4py wheel checksum mismatch" >&2
    exit 1
fi

# Install every published optional capability so the desktop catalog can run
# general and local workflows without silently dropping interpolation,
# visualization, zonal, UCP, LST, ERA5, DuckDB, or GeoArrow support.
pip install "LCZ4py[all] @ file://$SCRIPT_DIR/lcz4py-0.1.0-py3-none-any.whl" --quiet

echo "==> Running PyInstaller..."
pyinstaller \
    --onefile \
    --name lcz-api \
    --runtime-tmpdir /tmp/lcz-studio-runtime \
    --hidden-import rasterio._shim \
    --hidden-import rasterio.drivers \
    --hidden-import rasterio._features \
    --hidden-import fiona \
    --hidden-import fiona.ogrext \
    --hidden-import shapely \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan \
    --hidden-import uvicorn.lifespan.on \
    --collect-all rasterio \
    --collect-all fiona \
    --collect-all pyogrio \
    --collect-all LCZ4py \
    --collect-all polars \
    --collect-all datashader \
    --collect-all holoviews \
    --collect-all colorcet \
    --collect-all contextily \
    --collect-all geoarrow \
    --collect-all duckdb \
    --collect-all exactextract \
    --collect-all pykrige \
    --collect-all sklearn \
    --collect-all xarray \
    --collect-all dask \
    --collect-all pystac_client \
    --collect-all planetary_computer \
    --collect-all h5netcdf \
    --collect-all h5py \
    --collect-all cdsapi \
    --copy-metadata rasterio \
    --copy-metadata geopandas \
    --copy-metadata shapely \
    --copy-metadata pandas \
    --copy-metadata numpy \
    --copy-metadata fastapi \
    --copy-metadata uvicorn \
    --copy-metadata scipy \
    --copy-metadata polars \
    --copy-metadata pyarrow \
    --copy-metadata plotly \
    --copy-metadata rioxarray \
    --copy-metadata pyogrio \
    --copy-metadata datashader \
    --copy-metadata holoviews \
    --copy-metadata contextily \
    --copy-metadata duckdb \
    --copy-metadata exactextract \
    --copy-metadata scikit-learn \
    --copy-metadata xarray \
    --copy-metadata dask \
    --copy-metadata pystac-client \
    --copy-metadata planetary-computer \
    --copy-metadata h5netcdf \
    --copy-metadata h5py \
    --copy-metadata cdsapi \
    --hidden-import plotly \
    --hidden-import pyarrow \
    --hidden-import rioxarray \
    api.py

# Determine the Rust target triple for the binary name
if command -v rustc &>/dev/null; then
    TRIPLE=$(rustc -vV 2>/dev/null | grep "^host:" | awk '{print $2}')
else
    # Fallback detection
    ARCH=$(uname -m)
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "$OS" in
        darwin) TRIPLE="${ARCH}-apple-darwin" ;;
        linux)  TRIPLE="${ARCH}-unknown-linux-gnu" ;;
        *)      TRIPLE="${ARCH}-pc-windows-msvc" ;;
    esac
fi

echo "==> Target triple: $TRIPLE"

BINARIES_DIR="$SCRIPT_DIR/../src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

DEST="$BINARIES_DIR/lcz-api-${TRIPLE}"
cp dist/lcz-api "$DEST"
chmod +x "$DEST"

echo "==> Sidecar binary ready: $DEST"
echo ""
echo "==> NOTE: The dev shell script launcher was replaced by the PyInstaller binary."
echo "==> To restore the dev launcher, run:"
echo "==>   git checkout desktop/src-tauri/binaries/lcz-api-\${TRIPLE}"
echo "==> or regenerate it from desktop/sidecar/build_sidecar.sh comments."
echo ""
echo "==> Done. Run 'cargo build' in desktop/src-tauri to bundle."
