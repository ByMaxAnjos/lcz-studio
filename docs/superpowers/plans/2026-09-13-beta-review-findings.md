# LCZ Studio Beta Review — Findings & Triage

## Coverage (generic LCZ4py introspection mechanism)

Root causes identified in `desktop/sidecar/api.py`'s catalog/coercion code:

1. **`year`/`month`/`day`/`hour` filter params have no type annotation** → `_input_kind()` falls through to `kind='text'` → a single value like `"2020"` is sent as a raw string → LCZ4py's shared time-filter helper does `[int(y) for y in (year if hasattr(year,'__iter__') else [year])]`, and a Python `str` IS iterable, so `"2020"` silently becomes `[2,0,2,0]`. **Silent data corruption.**
   Affects: `lcz_ts`, `lcz_anomaly`, `lcz_anomaly_map`, `lcz_uhi_intensity`, `lcz_dtr`, `lcz_degree_hours`, `lcz_interp_map`, `lcz_interp_map_plus`, `lcz_interp_eval`, `lcz_interp_eval_plus`, `lcz_variogram`.
2. **`vg_model`/`ml_model` Literal-type aliases not detected** — the module uses `from __future__ import annotations` (PEP 563), so `inspect` reports the bare alias name (`'VgModel'`, `'MLModel'`) instead of the expanded `Literal[...]`. `_literal_options()` only matches a raw `'Literal['` substring, so these render as free text instead of a dropdown of valid values.
   Affects: `lcz_anomaly_map`, `lcz_interp_map`, `lcz_interp_map_plus`, `lcz_interp_eval`, `lcz_interp_eval_plus`.
3. **`lcz_get_ucp`'s `stations` param**: catalog says `kind='dataframe'`, but `_coerce_value()` has an independent name-based rule (`name in {'roi','grid','stations'}`) that forces `gpd.read_file()` regardless — breaks on a plain lat/lon CSV before `lcz_get_ucp`'s own smarter DataFrame handling ever runs.
4. **`lcz_get_lst`'s `source`/`satellite`/`units`**: docstring-derived options ARE parsed by `_doc_options()` but `_input_kind()` never consults them — only fires `kind='select'` on a literal `'Literal['` match — so parsed options are silently discarded and the field renders as free text.
5. Documented-gap, not fixed for Beta (low impact / already inert): `lcz_plot_map`/`lcz_cal_indexes`'s `band` param type misclassification (currently globally hidden by the frontend anyway); `lcz_climate_compute_spei`/`spi`'s tuple-default not surfacing in the UI (cosmetic — omitting the field still applies LCZ4py's real default).

## Bugs (functional)

1. **[HIGH, fix] SQL injection surface in `duckdb.ts`** — `loadCSV`, `loadGeoJSON`, `querySpatialData`, `aggregateByLCZ` splice table/column names directly into SQL text with no validation, contradicting CLAUDE.md's explicit requirement. Currently no live caller passes user-controlled names (latent), but it's exported public API — fix now before something wires user input into it.
2. **[MEDIUM, fix] CSV importer breaks on quoted commas** — `dataImporter.ts` splits lines naively on `,`, misaligning columns when a field like `"Site, A"` is quoted. Silent corruption since `validateStationData` only samples first 10 rows and shifted values can coincidentally still parse as numbers.
3. **[MEDIUM, fix] `validateStationData` only checks the first 10 rows** — malformed data beyond row 10 imports silently as "success."
4. **[HIGH, fix] `MapCanvas` layer-sync effect no-ops permanently when style isn't loaded yet** — a layer added to the store during a ~300-500ms style-load window is silently dropped from the map and never retried (effect only depends on `[layers]`, no style-load listener).
5. **[LOW, documented — folded into docs fix] `DeckGLManager.ts` doesn't exist** — CLAUDE.md describes it; real raster path is `cogHandler.ts`. Captured under UX/docs findings below.
6. **[MEDIUM, fix] Hardcoded Portuguese-only error strings in `Lcz4pyBrowserPanel.tsx`** bypass i18n (`'Selecione pelo menos um parâmetro UCP para gerar.'` etc. shown verbatim regardless of selected language).
7. **[HIGH, fix] Sidecar parameter-coercion errors return non-JSON 500s** — `_coerce_kwargs` runs outside the route's `try/except`, so a bad date string or invalid file path produces Starlette's plain-text 500, which `rService.ts`'s unconditional `res.json()` then fails to parse — user sees a JSON-parsing error instead of what was actually wrong.

## UX

1. **[fix] Duplicate basemap selector** — `BasemapPicker.tsx` (on-map) and `SettingsPanel.tsx` both control `basemapStyle` with two independently hand-rolled label lists. Keep `BasemapPicker`, remove the `SettingsPanel` selector.
2. **[fix] `FileUpload.tsx`/`.css` are dead code** — never rendered anywhere; `LayerManager.tsx`'s `handleImportFile` is the real, live import path. Delete.
3. RStatusBar/Toolbar "duplication" — investigated, **false lead**, no action.
4. **[documented-gap, post-beta]** ~80+ one-off hex colors across component CSS with no shared tokens (success/warning/error/brand). Real debt, but a token-introduction refactor is broader than a Beta-blocking bug — defer.
5. **[fix, folded into close-out]** Stale `CLAUDE.md`: the `frontend/src/analysis/` section (doesn't exist), the `DeckGLManager`/deck.gl description (doesn't exist — no deck.gl anywhere in the repo), and the Project Overview line still crediting the R package (`LCZ4r`) instead of the Python sidecar.

## Triage → Phase 3 assignment

- **Sidecar agent**: coverage gaps #1–#4 above (year/month/day/hour, vg_model/ml_model Literal detection via `typing.get_type_hints()`, `lcz_get_ucp` stations coercion, `lcz_get_lst` doc-options→select), plus bug #7 (wrap coercion in try/except → JSON error; fix `rService.ts` to check `res.ok`/content-type before `res.json()`).
- **Map/DuckDB agent**: bugs #1, #2, #3, #4.
- **i18n agent**: bug #6.
- **UX agent**: UX findings #1, #2.
- **Close-out (Phase 4, solo)**: CLAUDE.md stale-doc fixes (UX finding #5), lint/tsc, final checklist.
- **Documented gaps, not fixed for Beta**: coverage #5, UX #4.
