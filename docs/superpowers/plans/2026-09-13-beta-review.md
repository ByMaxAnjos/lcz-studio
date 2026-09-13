# LCZ Studio Beta Readiness Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: this plan is executed via the `Workflow` tool (multi-agent orchestration), per explicit user opt-in ("múltiplos agentes em paralelo e um workflow orquestrado"), not via subagent-driven-development/executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring LCZ Studio to Beta-ready state: audit LCZ4py↔Studio coverage, find and fix bugs across core flows, and clean up UX/docs debt — without expanding scope.

**Architecture:** Four phases. Phase 1 runs 3 read-only investigation agents in parallel (coverage audit, functional bug hunt, UX/docs audit). Phase 2 is a solo triage/synthesis step. Phase 3 runs fix agents in parallel, partitioned by non-overlapping code area, each fixing+verifying its own bugs. Phase 4 is solo close-out (docs, lint, checklist).

**Tech Stack:** React+Vite (frontend), FastAPI sidecar (Python) wrapping LCZ4py, DuckDB-WASM, Tauri v2 (desktop, out of scope).

**Spec:** `docs/superpowers/specs/2026-09-13-beta-review-design.md`

## Global Constraints
- Stability/lean UX beats full LCZ4py coverage — gaps get documented, not force-fixed.
- Root-cause fixes only: grep every caller before editing a shared function (per CLAUDE.md and ponytail conventions).
- Removal-first for UX: propose cuts, not additions.
- No desktop packaging/build changes (icons, Tauri bundling) — unrelated churn, out of scope.
- `Layer` interface stays `'raster' | 'vector' | 'geojson'`; map managers (`mapLibreManager`, `deckGLManager`) must be kept manually in sync if touched.
- DuckDB table/column names must be validated/sanitized before SQL interpolation.

---

### Task 1: Coverage audit (Phase 1, Agent A)

**Files:** none created/modified — investigation only. Output captured in the workflow result, then written by Task 4 to `docs/superpowers/plans/2026-09-13-beta-review-findings.md` (section: Coverage).

**Interfaces:**
- Consumes: LCZ4py public API list already gathered (~40 functions across `general/` and `local/`, see spec). `desktop/sidecar/api.py`'s `GET /lcz4py/catalog` and `POST /lcz4py/{category}/{fn_name}`. `frontend/src/components/Lcz4pyBrowserPanel.tsx`.
- Produces: a gap table — one row per LCZ4py function: `{name, category, introspection_ok: bool, ui_form_ok: bool, issue}`. Consumed by Task 4 (triage).

- [ ] **Step 1: Read the introspection mechanism**
  Read `desktop/sidecar/api.py`'s catalog-building code (the function that walks `LCZ4py.general`/`LCZ4py.local` to produce `/lcz4py/catalog`). Note how it derives param names, types, and defaults (e.g. via `inspect.signature`).

- [ ] **Step 2: For each of the ~40 public functions, check introspection fidelity**
  For every function listed in the spec's LCZ4py inventory, compare its real signature (read the source file, e.g. `lcz_ts.py`) against what the catalog endpoint would report. Flag mismatches: missing params, wrong inferred type (e.g. a `dates: list[str]` param inferred as plain `str`), defaults not surfaced, or params requiring complex objects (rasters, `stations` dataframes) that a generic form can't represent.

- [ ] **Step 3: Check the frontend form rendering**
  Read `Lcz4pyBrowserPanel.tsx`. For each param type found in Step 2, confirm the form renders an appropriate input (text/number/select/date/file). Flag any type the panel silently mishandles (e.g. renders a bare text box for a list-typed param, dropping structure).

- [ ] **Step 4: Produce the gap table**
  One row per function per the `Produces` interface above. No fixing yet — this is Phase 1, read-only.

---

### Task 2: Functional bug hunt (Phase 1, Agent B)

**Files:** none created/modified — investigation only. Output written by Task 4 to the findings doc (section: Bugs).

**Interfaces:**
- Consumes: `frontend/src/data/duckdb.ts` (`initializeDuckDB`, `executeSQLQuery`, `loadCSV`, `loadGeoJSON`, `validateStationData`, `querySpatialData`, `aggregateByLCZ`), `frontend/src/data/dataImporter.ts`, `frontend/src/map/MapLibreManager.ts`, `frontend/src/map/DeckGLManager.ts`, `frontend/src/i18n/translations.ts`, sidecar UHI/anomaly routes.
- Produces: a bug list — one entry per bug: `{title, severity: critical|high|medium|low, repro_steps, expected, actual, suspected_file}`. Consumed by Task 4 (triage) and Task 5+ (fix agents).

- [ ] **Step 1: Exercise data import**
  Trace a CSV import through `dataImporter.ts` → `loadCSV`/`validateStationData` in `duckdb.ts`. Confirm the required columns (`date, station, var, lat, lon`) are actually validated and that malformed/missing-column CSVs produce a clear error, not a silent failure or crash. Do the same for GeoJSON via `loadGeoJSON`.

- [ ] **Step 2: Exercise map layers**
  Trace how a loaded layer becomes visible on the map: store `layers[]` (`useStore.ts`) → `mapLibreManager` (raster/fill/line) or `deckGLManager` (Bitmap/Scatterplot). Confirm both managers stay in sync when a layer is added/removed/restyled (per CLAUDE.md's manual-sync warning) — this is a known risk area, look for one manager updating without the other.

- [ ] **Step 3: Exercise DuckDB spatial queries**
  Run `querySpatialData`/`aggregateByLCZ` against a sample dataset (use any fixture CSV in the repo, or construct a minimal one). Confirm table/column names passed into SQL are validated per CLAUDE.md's injection-safety note — try a station name or column value containing `'` or `;` and confirm it doesn't break the query or allow injection.

- [ ] **Step 4: Exercise analysis + sidecar round-trip**
  Trigger a UHI intensity call and an anomaly call through the sidecar (`/lcz/uhi-intensity`, `/lcz/anomaly`, or the generic route) from the UI. Confirm results render, and errors from the sidecar (bad params, LCZ4py exceptions) surface as a legible UI message rather than a silent failure or raw stack trace.

- [ ] **Step 5: Exercise i18n across all 4 languages**
  Switch `language` in the store to each of `en/pt/es/zh` and click through Toolbar, Sidebar, MainWorkspace, FileUpload, HelpCenter, LayerManager, Lcz4pyBrowserPanel. Flag any UI string not present in `translations.ts` for one of the 4 languages (falls back to a key or wrong language).

- [ ] **Step 6: Produce the bug list**
  One entry per confirmed bug per the `Produces` interface. Include exact repro steps (clicks, file used, input value) so Task 5+ can reproduce without re-discovering.

---

### Task 3: UX/docs audit (Phase 1, Agent C)

**Files:** none created/modified — investigation only. Output written by Task 4 to the findings doc (section: UX).

**Interfaces:**
- Consumes: all files under `frontend/src/components/`, `CLAUDE.md`.
- Produces: a removal-first recommendation list — one entry per finding: `{type: duplication|noise|inconsistency|stale-doc, location, recommendation}`. Consumed by Task 4 (triage).

- [ ] **Step 1: Map current component tree**
  List every component under `frontend/src/components/` (per spec's inventory: BasemapPicker, FileUpload, HelpCenter, LayerManager, Lcz4pyBrowserPanel, MainWorkspace, MapCanvas, RStatusBar, SettingsPanel, Sidebar, StudioIcon, Toolbar, toolRegistry). For each, note its one-line responsibility from reading the file.

- [ ] **Step 2: Find duplication and redundant info**
  Compare responsibilities from Step 1 — flag any two components showing overlapping information (e.g. layer info duplicated between Sidebar and LayerManager, or status shown in both RStatusBar and Toolbar). Recommend which one to keep.

- [ ] **Step 3: Find visual inconsistency**
  Grep all component `.css` files for color/spacing values that deviate from CLAUDE.md's stated conventions (`#2d5016` headings, `#4caf50` interactive green). Flag hardcoded colors that should use `getLCZColor`/`getLCZName` from `utils/lczPalette.ts` instead of raw hex.

- [ ] **Step 4: Verify CLAUDE.md matches reality**
  Confirm/deny each claim in CLAUDE.md's Architecture section against the real tree. Already known: `frontend/src/analysis/` (`uhiCalculator.ts`, `thermalAnomalyAnalyzer.ts`) does not exist — analysis is sidecar-only. Flag this and any other stale claim (e.g. component names, file paths) found.

- [ ] **Step 5: Produce the recommendation list**
  Per the `Produces` interface. Bias toward "delete/merge" recommendations, not "add a new component."

---

### Task 4: Triage and synthesis (Phase 2, solo)

**Files:**
- Create: `docs/superpowers/plans/2026-09-13-beta-review-findings.md`

**Interfaces:**
- Consumes: outputs of Task 1 (gap table), Task 2 (bug list), Task 3 (recommendation list).
- Produces: the same findings doc, now with each bug tagged `fix-for-beta` or `documented-gap`, ordered by severity, plus a concrete task list for Phase 3 (which bugs go to which fix agent/area).

- [ ] **Step 1: Consolidate the three reports into the findings doc**
  Sections: `## Coverage`, `## Bugs`, `## UX`. Paste each agent's output verbatim, then add a `## Triage` section.

- [ ] **Step 2: Classify every bug**
  For each bug in `## Bugs`, add a `Decision: fix-for-beta | documented-gap` line with one sentence of reasoning, using the spec's stability-over-coverage criterion.

- [ ] **Step 3: Partition fix work by non-overlapping code area**
  Group `fix-for-beta` bugs into buckets matching Task 5's areas (sidecar / map / DuckDB / i18n). If a bug touches two areas, put it in the bucket of the file where the root cause lives (grep callers first, per Global Constraints).

- [ ] **Step 4: Commit the findings doc**
  ```bash
  git add docs/superpowers/plans/2026-09-13-beta-review-findings.md
  git commit -m "Add Beta review findings and triage"
  ```

---

### Task 5: Fix bugs — sidecar area (Phase 3, parallel agent 1)

**Files:**
- Modify: `desktop/sidecar/api.py` and any LCZ4py-adjacent file the triage assigns here.
- Test: manual re-run of the exact repro steps from Task 2/4 for each assigned bug (no existing test runner is configured per CLAUDE.md — verification is repro-based, not a new test suite).

**Interfaces:**
- Consumes: the sidecar-bucket bug list from Task 4's `## Triage`.
- Produces: fixed `api.py` (and related files); a `Verified` note per bug appended to the findings doc.

- [ ] **Step 1: For each assigned bug, grep all callers of the function being changed**
  e.g. `grep -rn "<function_name>" desktop/sidecar frontend/src` before editing, to catch every caller (per Global Constraints — root cause, not symptom).

- [ ] **Step 2: Apply the minimal fix at the root cause**
  Fix in the shared function/route, not in one caller.

- [ ] **Step 3: Re-run the exact repro steps from the bug entry**
  Confirm the originally-broken flow now behaves as expected.

- [ ] **Step 4: Append a `Verified` line to the bug's entry in the findings doc**
  `Verified: <date>, repro no longer reproduces, <one-line what changed>`.

- [ ] **Step 5: Commit**
  ```bash
  git add desktop/sidecar/
  git commit -m "Fix <bug title> (sidecar)"
  ```

---

### Task 6: Fix bugs — map/DuckDB area (Phase 3, parallel agent 2)

**Files:**
- Modify: `frontend/src/map/MapLibreManager.ts`, `frontend/src/map/DeckGLManager.ts`, `frontend/src/data/duckdb.ts`, `frontend/src/data/dataImporter.ts` as assigned by triage.
- Test: manual re-run of the exact repro steps from Task 2/4.

**Interfaces:**
- Consumes: the map/DuckDB-bucket bug list from Task 4's `## Triage`.
- Produces: fixed files; a `Verified` note per bug in the findings doc.

- [ ] **Step 1: For each assigned bug, grep all callers before editing**
  Same discipline as Task 5, Step 1 — critical here since `mapLibreManager`/`deckGLManager` are module-level singletons other components call directly.

- [ ] **Step 2: Apply the minimal fix at the root cause**
  If the bug is the two managers falling out of sync (flagged risk in Task 2), fix the shared call site that updates the store's `layers[]`, not each individual UI trigger.

- [ ] **Step 3: Re-run the exact repro steps**

- [ ] **Step 4: Append a `Verified` line to the findings doc**

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/map/ frontend/src/data/
  git commit -m "Fix <bug title> (map/duckdb)"
  ```

---

### Task 7: Fix bugs — i18n area (Phase 3, parallel agent 3)

**Files:**
- Modify: `frontend/src/i18n/translations.ts` and any component missing a translated string.
- Test: manual click-through in all 4 languages for the affected screens.

**Interfaces:**
- Consumes: the i18n-bucket bug list from Task 4's `## Triage`.
- Produces: complete `translations.ts` entries for all 4 languages; a `Verified` note per bug in the findings doc.

- [ ] **Step 1: For each missing string, add all 4 language keys together**
  Never add just the `en` key — CLAUDE.md requires all four (`en | pt | es | zh`) whenever a string is added.

- [ ] **Step 2: Re-run the exact repro (switch language, view the screen)**

- [ ] **Step 3: Append a `Verified` line to the findings doc**

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/i18n/
  git commit -m "Fix <bug title> (i18n)"
  ```

---

### Task 8: UX cleanup (Phase 3, parallel agent 4)

**Files:**
- Modify/Delete: components flagged in Task 3's recommendation list (e.g. merge/delete duplicated panels), plus any `.css` file with hardcoded colors that should use `utils/lczPalette.ts`.

**Interfaces:**
- Consumes: the UX recommendation list from Task 3/4.
- Produces: a leaner component tree; a `Verified` note per recommendation (what was removed/merged and confirmation no orphaned imports remain).

- [ ] **Step 1: For each removal/merge recommendation, grep for all references first**
  `grep -rn "<ComponentName>" frontend/src` before deleting — mirrors the clean-deletion pattern already used for LCZLegend/DataTable/LayerStyler/ClimateAnalysisPanel/LCZStatistics.

- [ ] **Step 2: Apply the removal-first change**
  Delete or merge per the recommendation. Do not add new components as a substitute unless the recommendation explicitly calls for a merge target.

- [ ] **Step 3: Fix hardcoded colors flagged in Task 3, Step 3**
  Replace raw hex with `getLCZColor`/`getLCZName` calls where the value represents an LCZ class; otherwise align with CLAUDE.md's brand constants (`#2d5016`, `#4caf50`).

- [ ] **Step 4: Confirm zero orphaned references**
  `grep -rn "<ComponentName>" frontend/src` again — expect no matches.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/components/
  git commit -m "Remove/merge <component>, fix palette usage"
  ```

---

### Task 9: Close-out (Phase 4, solo)

**Files:**
- Modify: `CLAUDE.md` (remove stale `frontend/src/analysis/` reference; correct any other stale claim found in Task 3, Step 4).
- Modify: `docs/superpowers/plans/2026-09-13-beta-review-findings.md` (final checklist).

**Interfaces:**
- Consumes: all `Verified` notes from Tasks 5–8.
- Produces: a completed Beta-ready checklist, committed.

- [ ] **Step 1: Fix CLAUDE.md's stale Architecture claims**
  Remove the `analysis/` section (or replace with a note that analysis runs via the sidecar), and any other mismatch found in Task 3.

- [ ] **Step 2: Run lint and type-check**
  ```bash
  npm run lint
  cd frontend && npx tsc --noEmit
  ```
  Fix anything either reports.

- [ ] **Step 3: Fill in the Beta-ready checklist in the findings doc**
  Check off each item from the spec:
  - [ ] Generic catalog introspects 100% of public functions without type/param errors
  - [ ] Zero open critical/high-severity bugs in tested end-to-end flows
  - [ ] Complete i18n (no missing strings) across all 4 languages for active UI
  - [ ] No references to removed components/files (CLAUDE.md included)
  - [ ] `npm run lint` and `tsc --noEmit` clean
  - [ ] Dead/duplicate sidecar routes removed or justified

- [ ] **Step 4: Commit**
  ```bash
  git add CLAUDE.md docs/superpowers/plans/2026-09-13-beta-review-findings.md
  git commit -m "Beta review close-out: fix stale docs, complete checklist"
  ```
