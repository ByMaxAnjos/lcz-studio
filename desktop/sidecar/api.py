"""FastAPI sidecar for LCZ Studio — wraps the real LCZ4py package.

Two generic routes (POST /lcz4py/{category}/{fn_name}) expose every public
LCZ4py function through one allowlisted invoke path + one shared result
serializer, plus a GET /lcz4py/catalog endpoint that introspects the package
so the frontend never hardcodes a per-function schema. A handful of legacy
`/lcz/*` routes are kept so the existing hand-tuned Sidebar panels keep working.
"""

import dataclasses
import importlib.util
import inspect
import os
import re
import shutil
import sys
import tempfile
import uuid
from collections import OrderedDict
from pathlib import Path
from typing import Any, Optional

import numpy as np

_mpl_cache = Path.home() / ".cache" / "lcz-studio" / "matplotlib"
_mpl_cache.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(_mpl_cache))

import matplotlib
matplotlib.use("Agg")

import pandas as pd
import plotly.graph_objects as go

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

try:
    import polars as pl
except Exception:
    pl = None

try:
    import geopandas as gpd
except Exception:
    gpd = None

# ---------------------------------------------------------------------------
# Load the real LCZ4py package
# ---------------------------------------------------------------------------

try:
    import LCZ4py.general as lcz_general
    import LCZ4py.local as lcz_local
    LCZ_IMPORT_OK = True
    LCZ_IMPORT_ERROR = None
except Exception as exc:
    print(f"[lcz-api] WARNING: failed to import LCZ4py: {exc}", file=sys.stderr)
    LCZ_IMPORT_OK = False
    LCZ_IMPORT_ERROR = str(exc)
    lcz_general = lcz_local = None

# Internal helpers accidentally exported via __all__ that aren't meant to be
# invoked directly by a user (they take raw numpy arrays / internal grids,
# not paths or dataframes a form can produce).
_UTILITY_EXCLUDE = {
    "raster_to_geoarrow", "read_with_warped_vrt", "map_class_to_params_vectorized",
    "krige_predict", "rbf_predict", "idw_predict",
}


def _build_registry(module) -> dict:
    if module is None:
        return {}
    registry = {}
    for name in getattr(module, "__all__", []):
        if name.startswith("_") or name in _UTILITY_EXCLUDE:
            continue
        fn = getattr(module, name, None)
        if inspect.isfunction(fn):
            registry[name] = fn
    return registry


GENERAL_REGISTRY = _build_registry(lcz_general)
LOCAL_REGISTRY = _build_registry(lcz_local)
REGISTRIES = {"general": GENERAL_REGISTRY, "local": LOCAL_REGISTRY}

# ---------------------------------------------------------------------------
# Catalog metadata: group labels + param overrides for the handful of
# functions whose primary input isn't a flat scalar/dataframe/raster-path.
# ---------------------------------------------------------------------------

_GROUP_BY_PREFIX_GENERAL = [
    ("lcz_get_map", "Map"),
    ("lcz_plot_map", "Map"),
    ("lcz_get_parameters", "Parameters"),
    ("lcz_plot_parameters", "Parameters"),
    ("lcz_get_ucp", "Parameters"),
    ("lcz_cal_area", "Area calculation"),
    ("lcz_cal_indices", "Satellite data"),
    ("lcz_cal_indexes", "Satellite data"),
    ("lcz_get_indices", "Satellite data"),
    ("lcz_get_lst", "Satellite data"),
    ("lcz_get_planetary_computer", "Satellite data"),
    ("lcz_list_pc_assets", "Satellite data"),
    ("lcz_grid_", "Gridded climate data"),
    ("plot_grid_only", "Gridded climate data"),
    ("plot_lcz_relationship", "Gridded climate data"),
    ("lcz_clear_cache", "Utility"),
]
_GROUP_BY_PREFIX_LOCAL = [
    ("lcz_ts", "Time series"),
    ("lcz_dtr", "Time series"),
    ("lcz_degree_hours", "Time series"),
    ("lcz_anomaly", "Anomaly"),
    ("lcz_uhi_", "Thermal & UHI"),
    ("lcz_thermal", "Thermal & UHI"),
    ("lcz_utci", "Thermal & UHI"),
    ("lcz_anthropogenic_heat", "Thermal & UHI"),
    ("lcz_interp_", "Interpolation"),
    ("lcz_plot_interp", "Interpolation"),
    ("lcz_variogram", "Interpolation"),
    ("lcz_climate_compute_", "Climate indices"),
]


def _group_for(name: str, category: str) -> str:
    prefixes = _GROUP_BY_PREFIX_GENERAL if category == "general" else _GROUP_BY_PREFIX_LOCAL
    for prefix, label in prefixes:
        if name.startswith(prefix):
            return label
    return "Other"


# Overrides are deliberately small. Most field behaviour is derived from the
# real signature and docstring, keeping the desktop catalog aligned with the
# installed LCZ4py version.
_PARAM_KIND_OVERRIDES: dict[tuple[str, str], str] = {
    ("lcz_get_map", "roi"): "resource",
    ("lcz_get_map_euro", "roi"): "resource",
    ("lcz_get_map_usa", "roi"): "resource",
    ("lcz_get_ucp", "stations"): "dataframe",
    ("plot_grid_only", "grid"): "resource",
    ("lcz_anthropogenic_heat", "lcz_classes"): "json",
    ("lcz_utci", "air_temp"): "json",
    ("lcz_utci", "wind_speed"): "json",
    ("lcz_utci", "relative_humidity"): "json",
    ("lcz_utci", "mean_radiant_temp"): "json",
    ("lcz_utci", "lc_z"): "json",
}

_SECRET_PARAMS = {"cds_key", "earthdata_pass", "password", "token", "api_key"}
_DATE_PARAMS = {"start_date", "end_date", "ref_start", "ref_end", "start", "end"}

# Function name -> import name required at call time, for functions gated on
# optional heavy/credentialed dependencies not installed by default.
_OPTIONAL_DEPS = {
    "lcz_grid_era5_global": "cdsapi",
    "lcz_get_ucp": "dask",
    "lcz_get_planetary_computer": "planetary_computer",
    "lcz_list_pc_assets": "planetary_computer",
    "lcz_get_lst": "pystac_client",
}


def _requires_setup(name: str) -> Optional[str]:
    mod = _OPTIONAL_DEPS.get(name)
    if mod and importlib.util.find_spec(mod) is None:
        return f"Requires the '{mod}' package (and possibly credentials) — not installed in this build."
    return None


def _parse_param_docs(doc: str) -> dict[str, str]:
    """Extract NumPy-style parameter descriptions from a function docstring."""
    if not doc or "Parameters" not in doc:
        return {}
    lines = doc.splitlines()
    descriptions: dict[str, str] = {}
    in_params = False
    current: list[str] = []
    current_names: list[str] = []

    def flush() -> None:
        if not current_names:
            return
        text = " ".join(part.strip() for part in current if part.strip())
        for item in current_names:
            descriptions[item] = text

    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "Parameters" and index + 1 < len(lines):
            in_params = True
            continue
        if not in_params:
            continue
        if stripped and set(stripped) == {"-"}:
            continue
        if stripped in {"Returns", "Raises", "Notes", "Examples", "See Also", "Warnings"}:
            flush()
            break
        match = re.match(r"^\s*([A-Za-z_][\w\s,]*)\s*:\s*(.+)$", line)
        if match and not line.startswith((" ", "\t")):
            flush()
            current_names = [name.strip() for name in match.group(1).split(",")]
            current = []
        elif current_names:
            current.append(stripped)
    else:
        flush()
    return descriptions


def _literal_options(annotation: str) -> list[str]:
    match = re.search(r"Literal\[(.*)\]", annotation, re.DOTALL)
    if not match:
        return []
    return re.findall(r"[\"']([^\"']+)[\"']", match.group(1))


def _doc_options(description: str) -> list[str]:
    match = re.search(r"\{([^{}]+)\}", description)
    if not match:
        return []
    return [value.strip().strip("`\"'") for value in match.group(1).split(",") if value.strip()]


def _input_kind(fn_name: str, param_name: str, annotation: str, default: Any) -> str:
    override = _PARAM_KIND_OVERRIDES.get((fn_name, param_name))
    if override:
        return override
    lower_annotation = annotation.lower()
    lower_name = param_name.lower()
    if lower_name in _SECRET_PARAMS or any(token in lower_name for token in ("password", "secret", "token")):
        return "secret"
    if param_name in _DATE_PARAMS or "timestamp" in lower_annotation or "datetime" in lower_annotation:
        return "date"
    if param_name in {"data_frame", "df"} or "dataframe" in lower_annotation:
        return "dataframe"
    if "literal[" in lower_annotation:
        return "select"
    if isinstance(default, bool) or "bool" in lower_annotation:
        return "boolean"
    if isinstance(default, (int, float)) and not isinstance(default, bool):
        return "number"
    if re.search(r"\b(int|float)\b", lower_annotation) and not any(
        token in lower_annotation for token in ("list", "sequence", "array", "tuple")
    ):
        return "number"
    if any(token in lower_annotation for token in ("ndarray", "list[", "sequence[", "tuple[", "dict", "mapping")):
        return "json"
    if any(token in lower_annotation for token in (
        "path", "datasetreader", "geodataframe", "lczgridresult", "lczindicesresult",
        "lczpcresult", "lczlstresult", "xr.dataset",
    )) or param_name in {"x", "lcz_map", "lst_x", "grid", "roi", "variable_path", "lcz_path"}:
        return "resource"
    return "text"


# ---------------------------------------------------------------------------
# Result serialization — turns whatever an LCZ4py function returns into JSON
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path(os.environ.get("LCZ_OUTPUT_DIR", tempfile.gettempdir())) / "lcz-output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Keep a bounded in-memory registry of raw results so functions can consume the
# dataclass/object returned by a previous function without lossy JSON rebuilding.
_RESULT_REGISTRY: OrderedDict[str, Any] = OrderedDict()
_RESULT_REGISTRY_LIMIT = 50


def _remember_result(value: Any) -> str:
    result_id = uuid.uuid4().hex
    _RESULT_REGISTRY[result_id] = value
    _RESULT_REGISTRY.move_to_end(result_id)
    while len(_RESULT_REGISTRY) > _RESULT_REGISTRY_LIMIT:
        _RESULT_REGISTRY.popitem(last=False)
    return result_id


def uid() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_servable(path: str) -> str:
    """Relocate a file into OUTPUT_DIR if it isn't already there.

    LCZ4py functions commonly save under a relative "LCZ4r_output/" folder
    (CWD-relative) or under "~/.lcz4r_cache" — both outside the Tauri
    asset-protocol scope ($APPDATA/$APPLOCALDATA/$DOWNLOAD/$DOCUMENT/$TEMP)
    and outside OUTPUT_DIR, so the frontend can't load them as-is. Copy into
    OUTPUT_DIR (which lives under $TEMP) so every returned path is servable.
    """
    abs_path = os.path.abspath(path)
    try:
        already_ok = Path(abs_path).is_relative_to(OUTPUT_DIR)
    except ValueError:
        already_ok = False
    if already_ok or not os.path.isfile(abs_path):
        return abs_path
    dest = OUTPUT_DIR / f"{uid()}_{Path(abs_path).name}"
    shutil.copy2(abs_path, dest)
    return str(dest)


def serialize_result(value: Any) -> Any:
    """Convert an LCZ4py return value into a useful JSON-safe result tree."""
    if value is None:
        return None

    if isinstance(value, os.PathLike):
        value = os.fspath(value)

    if isinstance(value, str):
        path_suffixes = (
            ".tif", ".tiff", ".html", ".htm", ".png", ".jpg", ".jpeg", ".svg",
            ".csv", ".parquet", ".geojson", ".json", ".gpkg", ".nc", ".pdf", ".npy",
        )
        if os.path.isfile(value) or value.lower().endswith(path_suffixes):
            abs_value = _ensure_servable(value)
            ext = Path(value).suffix.lower()
            key = {
                ".tif": "tiff_path", ".tiff": "tiff_path", ".html": "html_path", ".htm": "html_path",
                ".png": "image_path", ".jpg": "image_path", ".jpeg": "image_path", ".svg": "image_path",
                ".csv": "csv_path", ".geojson": "geojson_path", ".gpkg": "geojson_path",
            }.get(ext, "file_path")
            return {key: abs_value}
        return {"value": value}

    if isinstance(value, np.generic):
        return {"value": value.item()}

    if isinstance(value, (int, float, bool)):
        return {"value": value}

    if isinstance(value, np.ndarray):
        if value.size <= 10_000:
            return {"value": value.tolist(), "shape": list(value.shape)}
        path = str(OUTPUT_DIR / f"array_{uid()}.npy")
        np.save(path, value)
        return {"file_path": path, "shape": list(value.shape), "dtype": str(value.dtype)}

    if isinstance(value, go.Figure):
        path = str(OUTPUT_DIR / f"plot_{uid()}.html")
        value.write_html(path, include_plotlyjs=True)
        return {"html_path": path}

    try:
        from matplotlib.figure import Figure as MatplotlibFigure
        if isinstance(value, MatplotlibFigure):
            path = str(OUTPUT_DIR / f"plot_{uid()}.png")
            value.savefig(path, dpi=180, bbox_inches="tight")
            return {"image_path": path}
    except Exception:
        pass

    if gpd is not None and isinstance(value, gpd.GeoDataFrame):
        path = str(OUTPUT_DIR / f"vector_{uid()}.geojson")
        value.to_file(path, driver="GeoJSON")
        return {"geojson_path": path, "n_rows": len(value), "columns": list(value.columns)}

    if pl is not None and isinstance(value, pl.LazyFrame):
        value = value.collect()

    if pl is not None and isinstance(value, pl.DataFrame):
        path = str(OUTPUT_DIR / f"table_{uid()}.csv")
        value.write_csv(path)
        return {"csv_path": path, "n_rows": value.height, "columns": value.columns}

    if isinstance(value, pd.DataFrame):
        path = str(OUTPUT_DIR / f"table_{uid()}.csv")
        value.to_csv(path, index=False)
        return {"csv_path": path, "n_rows": len(value), "columns": list(value.columns)}

    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {
            field.name: serialize_result(getattr(value, field.name))
            for field in dataclasses.fields(value)
            if getattr(value, field.name) is not None
        }

    if isinstance(value, (list, tuple, set)):
        return [serialize_result(item) for item in value]

    if isinstance(value, dict):
        return {str(key): serialize_result(item) for key, item in value.items()}

    dataset_path = getattr(value, "name", None)
    if isinstance(dataset_path, str) and os.path.isfile(dataset_path):
        return serialize_result(dataset_path)

    return {"value": str(value), "note": f"Unsupported {type(value).__name__}; displayed as text."}


def _require_import_ok() -> None:
    if not LCZ_IMPORT_OK:
        raise HTTPException(status_code=503, detail=f"LCZ4py failed to import: {LCZ_IMPORT_ERROR}")


def _coerce_value(name: str, value: Any, annotation: str) -> Any:
    if isinstance(value, dict) and "__lcz_result_id" in value:
        result_id = str(value["__lcz_result_id"])
        if result_id not in _RESULT_REGISTRY:
            raise HTTPException(status_code=410, detail="The selected intermediate result expired; run its source function again.")
        return _RESULT_REGISTRY[result_id]

    if value is None:
        return None

    lower_annotation = annotation.lower()
    if name in {"data_frame", "df"} or ("dataframe" in lower_annotation and "geodataframe" not in lower_annotation):
        if isinstance(value, list):
            return pd.DataFrame(value)
        if isinstance(value, str) and os.path.isfile(value):
            if Path(value).suffix.lower() in {".parquet", ".pq"}:
                return pd.read_parquet(value)
            return pd.read_csv(value)

    if ("geodataframe" in lower_annotation or name in {"roi", "grid", "stations"}) and isinstance(value, str):
        if gpd is None:
            raise HTTPException(status_code=424, detail="GeoPandas is required to read this spatial input.")
        return gpd.read_file(value)

    if "ndarray" in lower_annotation and isinstance(value, (list, tuple)):
        return np.asarray(value)
    if "tuple[" in lower_annotation and isinstance(value, list):
        return tuple(value)
    if "timestamp" in lower_annotation and isinstance(value, str):
        return pd.Timestamp(value)
    return value


def _coerce_kwargs(fn, body: dict) -> dict:
    """Build typed keyword arguments for a catalog function."""
    sig = inspect.signature(fn)
    kwargs = {}
    for name, value in body.items():
        if name not in sig.parameters:
            continue
        annotation = str(sig.parameters[name].annotation)
        kwargs[name] = _coerce_value(name, value, annotation)
    return kwargs


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="LCZ Studio API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": "0.2.0",
        "backend": "python",
        "lcz_functions": LCZ_IMPORT_OK,
        "general_count": len(GENERAL_REGISTRY),
        "local_count": len(LOCAL_REGISTRY),
    }


@app.get("/output/list")
async def output_list() -> dict:
    files = sorted(str(f) for f in OUTPUT_DIR.glob("*") if f.is_file())
    return {"success": True, "files": files, "count": len(files)}


@app.get("/output/file/{filename}")
async def serve_output_file(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    file_path = OUTPUT_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict:
    safe_name = Path(file.filename or f"upload_{uid()}").name
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUTPUT_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(await file.read())
    return {"success": True, "path": str(dest)}


# ---------------------------------------------------------------------------
# Generic LCZ4py catalog + invoke routes
# ---------------------------------------------------------------------------

@app.get("/lcz4py/catalog")
async def lcz4py_catalog() -> dict:
    _require_import_ok()
    entries = []
    for category, registry in REGISTRIES.items():
        for name, fn in registry.items():
            sig = inspect.signature(fn)
            doc = inspect.getdoc(fn) or ""
            param_docs = _parse_param_docs(doc)
            params = []
            for pname, p in sig.parameters.items():
                if pname == "self" or p.kind in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
                    continue
                annotation = str(p.annotation) if p.annotation is not inspect.Parameter.empty else ""
                has_default = p.default is not inspect.Parameter.empty
                default_is_json = has_default and isinstance(p.default, (str, int, float, bool, type(None)))
                description = param_docs.get(pname, "")
                options = _literal_options(annotation) or _doc_options(description)
                params.append({
                    "name": pname,
                    "annotation": annotation or None,
                    "default": p.default if default_is_json else None,
                    "default_repr": repr(p.default) if has_default and not default_is_json else None,
                    "has_default": has_default,
                    "required": not has_default,
                    "kind": _input_kind(name, pname, annotation, p.default if has_default else None),
                    "description": description,
                    "options": options,
                })
            entries.append({
                "id": name,
                "category": category,
                "group": _group_for(name, category),
                "label": name.replace("lcz_", "").replace("_", " ").title(),
                "summary": doc.strip().split("\n")[0] if doc else "",
                "params": params,
                "requires_setup": _requires_setup(name),
            })
    entries.sort(key=lambda e: (e["category"], e["group"], e["id"]))
    return {"success": True, "functions": entries}


@app.post("/lcz4py/{category}/{fn_name}")
async def lcz4py_invoke(category: str, fn_name: str, request: Request) -> dict:
    _require_import_ok()
    registry = REGISTRIES.get(category)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Unknown category '{category}'")
    fn = registry.get(fn_name)
    if fn is None:
        raise HTTPException(status_code=404, detail=f"Unknown function '{fn_name}' in category '{category}'")

    setup_note = _requires_setup(fn_name)
    if setup_note:
        raise HTTPException(status_code=424, detail=setup_note)

    body: dict = await request.json()
    kwargs = _coerce_kwargs(fn, body)
    try:
        result = fn(**kwargs)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc

    result_id = _remember_result(result)
    return {"success": True, "result_id": result_id, "result": serialize_result(result)}


# ---------------------------------------------------------------------------
# Legacy /lcz/* routes — kept so existing Sidebar panels keep working.
# Each delegates straight into the real LCZ4py function, matching its
# actual (real-package) signature rather than the old vendored one.
# ---------------------------------------------------------------------------

def _station_df(records: list) -> pd.DataFrame:
    if not records:
        raise HTTPException(status_code=400, detail="data (station records) required")
    return pd.DataFrame(records)


@app.post("/lcz/get-map")
async def api_get_map(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    try:
        tiff_path = lcz_general.lcz_get_map(city=body.get("city"))
        return {"success": True, "tiff_path": _ensure_servable(tiff_path)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/get-map-generator")
async def api_get_map_generator(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    try:
        tiff_path = lcz_general.lcz_get_map_generator(
            id=body.get("ID", "3110e623fbe4e73b1cde55f0e9832c4f5640ac21"),
            band=body.get("band", "lczFilter"),
        )
        return {"success": True, "tiff_path": _ensure_servable(tiff_path)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/get-map-usa")
async def api_get_map_usa(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    try:
        tiff_path = lcz_general.lcz_get_map_usa(city=body.get("city"))
        return {"success": True, "tiff_path": _ensure_servable(tiff_path)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/get-map-euro")
async def api_get_map_euro(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    try:
        tiff_path = lcz_general.lcz_get_map_euro(city=body.get("city"))
        return {"success": True, "tiff_path": _ensure_servable(tiff_path)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/get-map2")
async def api_get_map2(request: Request) -> dict:
    raise HTTPException(status_code=501, detail="Use /lcz4py/general/lcz_get_map with a city or ROI instead")


@app.post("/lcz/get-parameters")
async def api_get_parameters(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    try:
        result = lcz_general.lcz_get_parameters(tiff_path, iselect=body.get("iselect"), isave=True)
        out_path = getattr(result, "path", None) if dataclasses.is_dataclass(result) else result
        if not out_path:
            raise HTTPException(status_code=500, detail="lcz_get_parameters produced no raster path")
        return {"success": True, "tiff_path": _ensure_servable(out_path), "parameters": body.get("iselect") or "all"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/cal-area")
async def api_cal_area(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    try:
        result = lcz_general.lcz_cal_area(tiff_path, plot_type=body.get("plot_type", "bar"))
        fig = getattr(result, "fig", None) if dataclasses.is_dataclass(result) else result
        if not isinstance(fig, go.Figure):
            raise HTTPException(status_code=500, detail="lcz_cal_area returned no plot")
        plot_path = str(OUTPUT_DIR / f"area_{uid()}.html")
        fig.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/plot-map")
async def api_plot_map(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    try:
        result = lcz_general.lcz_plot_map(tiff_path)
        fig = getattr(result, "fig", None)
        if not isinstance(fig, go.Figure):
            raise HTTPException(status_code=500, detail="lcz_plot_map returned no plot")
        plot_path = str(OUTPUT_DIR / f"plot_map_{uid()}.html")
        fig.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/uhi-intensity")
async def api_uhi_intensity(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    df = _station_df(body.get("data", []))
    try:
        result = lcz_local.lcz_uhi_intensity(
            tiff_path, data_frame=df,
            var=body.get("var", ""), station_id=body.get("station_id", ""),
            time_freq=body.get("time_freq", "hour"), by=body.get("by"),
        )
        if not isinstance(result, go.Figure):
            raise HTTPException(status_code=500, detail="lcz_uhi_intensity returned no plot")
        plot_path = str(OUTPUT_DIR / f"uhi_{uid()}.html")
        result.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/anomaly")
async def api_anomaly(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    df = _station_df(body.get("data", []))
    try:
        result = lcz_local.lcz_anomaly(
            tiff_path, data_frame=df,
            var=body.get("var", ""), station_id=body.get("station_id", ""),
            plot_type=body.get("plot_type", "diverging_bar"),
        )
        if not isinstance(result, go.Figure):
            raise HTTPException(status_code=500, detail="lcz_anomaly returned no plot")
        plot_path = str(OUTPUT_DIR / f"anomaly_{uid()}.html")
        result.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/anomaly-map")
async def api_anomaly_map(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    df = _station_df(body.get("data", []))
    try:
        out_path = lcz_local.lcz_anomaly_map(
            tiff_path, data_frame=df,
            var=body.get("var", ""), station_id=body.get("station_id", ""),
            sp_res=body.get("sp_res", 100.0), tp_res=body.get("tp_res", "hour"),
            vg_model=body.get("vg_model", "Sph"), LCZinterp=body.get("LCZinterp", True),
        )
        if not out_path:
            raise HTTPException(status_code=500, detail="lcz_anomaly_map produced no output")
        return {"success": True, "tiff_path": _ensure_servable(out_path)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/interp-eval")
async def api_interp_eval(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    df = _station_df(body.get("data", []))
    try:
        result = lcz_local.lcz_interp_eval(
            tiff_path, data_frame=df,
            var=body.get("var", ""), station_id=body.get("station_id", ""),
            LOOCV=body.get("LOOCV", True), sp_res=body.get("sp_res", 100.0),
            tp_res=body.get("tp_res", "hour"), vg_model=body.get("vg_model", "Sph"),
            LCZinterp=body.get("LCZinterp", True),
        )
        csv_path = str(OUTPUT_DIR / f"interp_eval_{uid()}.csv")
        result.write_csv(csv_path)
        return {"success": True, "csv_path": csv_path, "n_rows": result.height}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/plot-interp")
async def api_plot_interp(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    try:
        fig = lcz_local.lcz_plot_interp(tiff_path)
        plot_path = str(OUTPUT_DIR / f"plot_interp_{uid()}.html")
        fig.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/clear-cache")
async def api_clear_cache(request: Request) -> dict:
    _require_import_ok()
    try:
        lcz_general.lcz_clear_cache()
        return {"success": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/lcz/ts")
async def api_ts(request: Request) -> dict:
    _require_import_ok()
    body: dict = await request.json()
    tiff_path = body.get("tiff_path", "")
    if not tiff_path:
        raise HTTPException(status_code=400, detail="tiff_path required")
    df = _station_df(body.get("data", []))
    try:
        result = lcz_local.lcz_ts(
            tiff_path, data_frame=df,
            var=body.get("var", ""), station_id=body.get("station_id", ""),
            time_freq=body.get("time_freq", "hour"), by=body.get("by"),
            plot_type=body.get("plot_type", "basic_line"),
        )
        if not isinstance(result, go.Figure):
            raise HTTPException(status_code=500, detail="lcz_ts returned no plot")
        plot_path = str(OUTPUT_DIR / f"ts_{uid()}.html")
        result.write_html(plot_path, include_plotlyjs=True)
        return {"success": True, "plot_path": plot_path}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
