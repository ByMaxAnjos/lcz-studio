"""Smoke checks for LCZ Studio's LCZ4py generic catalog integration."""

from __future__ import annotations

import argparse
import json
import tempfile

import httpx
from fastapi.testclient import TestClient


def get_function(functions: list[dict], category: str, function_id: str) -> dict:
    return next(
        function
        for function in functions
        if function["category"] == category and function["id"] == function_id
    )


def get_parameter(function: dict, name: str) -> dict:
    return next(parameter for parameter in function["params"] if parameter["name"] == name)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        help="Validate an already running packaged sidecar instead of importing api.py.",
    )
    args = parser.parse_args()

    api_module = None
    if args.base_url:
        client = httpx.Client(base_url=args.base_url, timeout=90.0)
    else:
        import api as api_module

        client = TestClient(api_module.app)
    catalog_response = client.get("/lcz4py/catalog")
    assert catalog_response.status_code == 200, catalog_response.text
    functions = catalog_response.json()["functions"]
    general = [function for function in functions if function["category"] == "general"]
    local = [function for function in functions if function["category"] == "local"]

    assert len(general) == 24, f"Expected 24 general functions, got {len(general)}"
    assert len(local) == 17, f"Expected 17 local functions, got {len(local)}"
    assert all(function["group"] for function in functions)
    assert all(
        {"kind", "description", "options", "has_default"}.issubset(parameter)
        for function in functions
        for parameter in function["params"]
    )

    get_map = get_function(functions, "general", "lcz_get_map")
    assert get_parameter(get_map, "roi")["kind"] == "resource"
    assert get_parameter(get_map, "lang")["kind"] == "text"

    time_series = get_function(functions, "local", "lcz_ts")
    assert get_parameter(time_series, "x")["kind"] == "resource"
    assert get_parameter(time_series, "data_frame")["kind"] == "dataframe"
    assert get_parameter(time_series, "time_freq")["description"]

    utci_response = client.post(
        "/lcz4py/local/lcz_utci",
        json={
            "air_temp": [31.0, 33.0],
            "wind_speed": [1.2, 1.6],
            "relative_humidity": [58.0, 62.0],
            "output": "index",
            "lang": "en",
        },
    )
    assert utci_response.status_code == 200, utci_response.text
    utci = utci_response.json()
    assert utci["success"] is True
    assert utci["result"] is not None
    if api_module is not None:
        assert utci["result_id"] in api_module._RESULT_REGISTRY

    # Regression: a `roi`/`grid` param typed `gpd.GeoDataFrame` must be read via
    # gpd.read_file, not silently swallowed by the dataframe-coercion branch
    # ("geodataframe" contains the substring "dataframe").
    grid_path = tempfile.mktemp(suffix=".geojson")
    with open(grid_path, "w") as f:
        json.dump({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature", "properties": {},
                "geometry": {"type": "Polygon", "coordinates": [[
                    [-9.15, 38.70], [-9.10, 38.70], [-9.10, 38.75], [-9.15, 38.75], [-9.15, 38.70],
                ]]},
            }],
        }, f)
    grid_response = client.post(
        "/lcz4py/general/plot_grid_only",
        json={"grid": grid_path, "add_basemap": False},
    )
    assert grid_response.status_code == 200, grid_response.text

    if isinstance(client, httpx.Client):
        client.close()

    print(
        "LCZ4py catalog smoke test passed: "
        f"{len(general)} general, {len(local)} local, typed UTCI invocation OK."
    )


if __name__ == "__main__":
    main()
