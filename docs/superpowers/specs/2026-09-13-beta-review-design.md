# LCZ Studio — Beta Readiness Review (Design Spec)

## Goal

Get LCZ Studio to a Beta-ready state. Criterion: **stability and a lean UX beat full LCZ4py coverage.** Gaps in functional coverage are documented, not blockers; bugs and UX debt are.

## Key finding that reframes scope

LCZ4py↔Studio integration is not per-function wiring. The sidecar (`desktop/sidecar/api.py`) exposes a generic introspection route (`GET /lcz4py/catalog`) plus a generic invoker (`POST /lcz4py/{category}/{fn_name}`) that reflects on `LCZ4py.general` / `LCZ4py.local` at runtime. The frontend's `Lcz4pyBrowserPanel` renders forms from that catalog. So "functional coverage" audits the *introspection mechanism* against all ~40 public LCZ4py functions, not 40 hand-built UI screens.

Also found: `CLAUDE.md` describes a `frontend/src/analysis/` directory (`uhiCalculator.ts`, `thermalAnomalyAnalyzer.ts`) that does not exist. UHI/anomaly analysis is done entirely via the sidecar today. This is stale documentation to fix.

Also found: the 5 components deleted in the working tree (LCZLegend, DataTable, LayerStyler, ClimateAnalysisPanel, LCZStatistics) have zero orphaned references — clean, intentional removal.

## Phases

### Phase 1 — Mapping (parallel, 3 read-only agents)
- **Agent A (functional coverage):** for each of the ~40 public LCZ4py functions, verify the sidecar's introspection produces correct params/types/defaults and that `Lcz4pyBrowserPanel` renders adequate inputs (flag cases where the generic form breaks down: dates, station lists, raster paths, enums). Output: gap table.
- **Agent B (functional testing):** exercise end-to-end flows — CSV/GeoJSON import → DuckDB → map layers → sidecar calls (UHI, anomaly) → render; i18n across en/pt/es/zh. Output: bug list with repro steps. No fixes yet.
- **Agent C (UX/design audit):** duplication across panels, unnecessary info, visual inconsistency; confirm CLAUDE.md matches the real component tree (captures the stale `analysis/` reference). Output: removal-first recommendations.

### Phase 2 — Triage (solo)
Consolidate the 3 reports, classify bugs by severity, decide fix-for-beta vs. documented-gap-for-later.

### Phase 3 — Fix with verification (parallel by area, no file overlap)
One agent per area (sidecar / map / DuckDB / i18n) fixes high/critical bugs. Each greps all callers before editing (root cause, not symptom) and re-runs the flow that reproduced the bug to confirm.

### Phase 4 — Close-out (solo)
Update CLAUDE.md (remove stale `analysis/` reference), run lint + `tsc --noEmit`, fill in the Beta-ready checklist, produce final cut-vs-fixed list.

## Recommended scope cuts (pre-decided)
- No 1:1 dedicated UI per LCZ4py function — validating the generic mechanism covers all of them correctly is sufficient for Beta.
- Legacy fixed routes in `api.py` (`/lcz/get-map`, `/lcz/uhi-intensity`, etc.) coexisting with the generic route: remove if confirmed redundant/unused by the frontend, rather than maintaining two paths.
- `/lcz/get-map2` (already disabled, returns 501): delete rather than leave dead code.

## Beta-ready checklist
- [ ] Generic catalog introspects 100% of public functions without type/param errors
- [ ] Zero open critical/high-severity bugs in tested end-to-end flows
- [ ] Complete i18n (no missing strings) across all 4 languages for active UI
- [ ] No references to removed components/files (CLAUDE.md included)
- [ ] `npm run lint` and `tsc --noEmit` clean
- [ ] Dead/duplicate sidecar routes removed or justified

## Out of scope for this review
- New features not already implied by existing LCZ4py functions.
- Desktop packaging/build pipeline changes (icons, Tauri bundling) — unrelated to this review's git-status churn.
