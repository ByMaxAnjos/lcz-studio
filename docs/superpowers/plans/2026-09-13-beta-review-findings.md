# LCZ Studio Beta Review — Findings & Triage

## Beta-ready checklist (final)

- [x] Generic catalog introspects 100% of public functions without type/param errors — fixed year/month/day/hour, vg_model/ml_model Literal detection, lcz_get_ucp stations coercion (see `Fix commits` below). lcz_get_lst's select-options upgrade works generically but doesn't fire for that function specifically (its real docstring isn't brace-style) — downgraded to documented gap, see `Post-fix empirical verification`.
- [x] Zero open critical/high-severity bugs in tested end-to-end flows — all 7 bugs from Phase 1's bug-hunt fixed and independently re-verified (see `Fix commits`).
- [x] Complete i18n (no missing strings) across all languages for active UI — the two hardcoded Portuguese strings now route through `t()`; `npx tsc --noEmit` confirms every language block satisfies `typeof en` (including the previously-unnoticed `fr` block, and the `analysis`/language-count facts in CLAUDE.md are now corrected to match the real 9-language set).
- [x] No references to removed components/files (CLAUDE.md included) — `FileUpload.tsx/.css` deleted with zero remaining references; CLAUDE.md's stale `analysis/`, `DeckGLManager`, and R-package claims corrected.
- [x] `npm run lint` and `tsc --noEmit` clean — `tsc --noEmit` is clean. `npm run lint` has 3 pre-existing errors (Lcz4pyBrowserPanel.tsx x2, MainWorkspace.tsx x1) confirmed present in `git show HEAD` before this review started — out of this review's scope (not caused by any Phase 3 fix), flagged here as known debt rather than silently ignored.
- [x] Dead/duplicate sidecar routes removed or justified — confirmed via grep that the frontend calls zero legacy `/lcz/*` routes (including the already-disabled `/lcz/get-map2`); deleted the entire ~275-line legacy route block (14 routes + `_station_df` helper) from `api.py`. `lcz_general`/`lcz_local`/`dataclasses`/`go` imports are still used elsewhere (the generic registries and `serialize_result`), so nothing else needed cleanup.

## Live-app testing (dev server + browser, post-commit)

Ran `desktop/sidecar/api.py` and `npm run dev:web` and exercised the three highest-risk flows in a real browser (not just code-tracing):

1. **Basemap switch with a layer loaded** — found a *new*, more severe bug than anything in the original Phase 1 list: switching basemap style dropped all map layers on every single switch, 100% reproducible. Root cause: `MapLibreManager.setBasemapStyle()` listened for `'style.load'` after `map.setStyle()` to know when to re-add layers, but empirically (confirmed with temporary debug instrumentation) that event never fires on `setStyle()` with the installed maplibre-gl 4.7.1 — only `'styledata'`/`'idle'` do. Fixed by switching to `map.once('idle', ...)`. Verified fixed across two consecutive style switches after the fix.
2. **CSV import via the real LayerManager path** — found a *second* new bug: importing any CSV crashed with `Cannot read properties of undefined (reading 'type')` in `extractCoords`. Root cause: `dataImporter.importCSV` returns flat rows (`{date, station, var, lat, lon}`), not GeoJSON Features, but `LayerManager.handleImportFile` treated `result.data` as if it were already a `features` array with `.geometry`. Fixed by building proper `Point` features from `lat`/`lon` when a CSV import's rows lack `.geometry`. This also let the original CSV-quoting fix (Bug B) be verified end-to-end: a file with `"Site, A"` imported with correct, unshifted columns and rendered at the right coordinates.
3. **`lcz_anomaly` with a single `year` value** — confirmed the `year` field now renders as a number input (not free text), and running the function with `year=2024` produced no corruption. Along the way hit two *unrelated* fixture/data-shape issues (a `ColumnNotFoundError` from a synthetic test CSV not matching `lcz_anomaly`'s expected numeric `var` column, and a `RasterioIOError` because no real LCZ raster was ever downloaded in this fresh session) — both surfaced as clean, structured, legible error messages rather than crashes or raw stack traces, confirming Bug E's fix generalizes beyond the coercion-time case it directly targets.

Both newly-found bugs were fixed and committed (`1b495c0`). Given multiple real, previously-undetected bugs surfaced only once the app was actually run, this confirms CLAUDE.md's rule that UI/frontend changes must be verified in a running app, not just by static analysis — the earlier "empirical verification" section below (catalog introspection via TestClient) caught real gaps but did not touch the frontend/map layer at all.

## Post-fix empirical verification (advisor-prompted)

Code-tracing isn't proof for a change to a shared 40-function dispatch mechanism, so the catalog was actually built and inspected (`fastapi.testclient.TestClient` + `.venv-sidecar-native`) after all fixes:

- **`_MULTI_INT_PARAMS` name-based scope**: dumped every function's params — `year`/`month`/`day`/`hour` appear on exactly the same 11 functions identified in Phase 1 (no gridded-extraction function like `lcz_grid_era5`/`lcz_grid_chirps`/`lcz_grid_pdsi` uses these names), so forcing them to a list-of-int is safe repo-wide, not just traced.
- **`kind=="text" and options -> "select"` upgrade**: dumped all 15 `select`-kind params catalog-wide — every one has a real, sane option list (no garbage from a docstring's incidental `{...}`).
- **`lcz_get_lst`'s source/satellite/units (Bug D)**: the upgrade mechanism itself works (proven by the 15 clean selects above), but empirically these 3 params' *actual* installed docstrings are prose, not NumPy `{"a","b"}` brace notation — `_doc_options()` correctly finds nothing, so they remain `kind='text'`. The original Phase 1 finding assumed a brace-style docstring that doesn't match the installed LCZ4py version; downgraded from "fixed" to **documented gap** — there's no reliably-extractable enum for these 3 params without hardcoding an override.
- **`lcz_clear_cache`** (removed as a legacy route in close-out): confirmed present in `GENERAL_REGISTRY`, so it's still reachable via `/lcz4py/general/lcz_clear_cache` — no capability loss.
- **MapCanvas `reAddLayer` idempotency**: confirmed it already no-ops (`if (map.getLayer(layer.id)) return`) if the layer exists, so the new style.load-triggered `syncLayers` can't double-add against `mapLibreManager`'s own re-add-all callback. Added a 300ms delay after `style.load` (matching `MapLibreManager.setBasemapStyle`'s existing buffer) since `isStyleLoaded()` can still read false immediately after the event fires.
- **Smoke-test failure ruled out as a regression**: `smoke_test_catalog.py`'s `lcz_plot_map` preview assertion fails with a `RasterioIOError` both before and after all Phase 3/4 fixes (tested against `git show f817556~1:desktop/sidecar/api.py`) — pre-existing, unrelated to this review, not touched.

## Fix commits (Phase 3, root-cause, independently re-verified after the fix agents' own reports were found unreliable — see note below)

- `f817556` — sidecar: year/month/day/hour corruption, vg_model/ml_model Literal detection, lcz_get_ucp stations coercion, lcz_get_lst select options, non-JSON error responses (api.py + rService.ts).
- `c992e29` — map/duckdb: SQL-injection identifier validation, quoted-CSV parsing, full-row station validation, MapCanvas style-load layer-sync retry.
- `f4e0352` — i18n: Lcz4pyBrowserPanel validation strings routed through `t()` (all language blocks, including a missed `fr` block found only via `tsc`).
- `a06693c` — UX: removed the duplicate SettingsPanel basemap selector and dead FileUpload component.
- (this commit) — CLAUDE.md close-out (analysis/DeckGLManager/R-package/i18n-language-count corrections) + this checklist.

**Important process note:** the Phase 3 workflow's `fix-sidecar` and `fix-map-duckdb` agents *reported* all their fixes as applied and verified, but a post-hoc `git status`/`grep` audit found most of the sidecar agent's changes (all 5) and half of the map/duckdb agent's changes (CSV parsing, row-cap removal, MapCanvas retry) were never actually written to disk — only `assertSafeIdentifier`/`SAFE_AGGREGATIONS` were added (and not wired in). All of these were reapplied and re-verified directly (tsc + targeted greps + a manual trace of each repro) before committing. Do not trust a fix agent's self-reported "verification" without an independent `git diff`/grep check against the actual working tree.

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
