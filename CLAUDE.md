# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LCZ Studio is a cloud-native GIS platform for visualizing and analyzing Local Climate Zones (LCZ), backed by the [LCZ4py](https://github.com/ipeaGIT/lcz4r) Python package (a port of the LCZ4r R package) via a bundled Python sidecar. It runs as a web app (React + Vite) and optionally as a cross-platform desktop app (Tauri v2 + Rust).

## Commands

All commands run from the repo root unless noted.

```bash
# Install all dependencies (root + workspaces)
npm install

# Frontend dev server (http://localhost:1420)
npm run dev:web
# or from frontend/: npm run dev

# Desktop app (requires frontend dev server running)
npm run dev:desktop

# Build web output → frontend/dist/
npm run build:web

# Build desktop binaries → desktop/src-tauri/target/release/
npm run build:desktop

# Lint frontend (ESLint)
npm run lint
# or from frontend/: npm run lint

# Type-check frontend
cd frontend && npx tsc --noEmit
```

> **Note**: The Vite dev server is locked to port **1420** (`strictPort: true` in `frontend/vite.config.ts`) to match the Tauri integration; `tauri.conf.json`'s `devUrl` already matches (`http://localhost:1420`).

There is no test runner currently configured.

## Architecture

### Monorepo Layout

npm workspaces with two packages:
- `frontend/` — React 18 + TypeScript, built with Vite
- `desktop/` — Tauri v2 wrapper; Rust source in `desktop/src-tauri/src/`

The Tauri desktop app embeds the frontend: in dev it points to the Vite dev server; in production it loads `frontend/dist/`.

### Frontend Architecture (`frontend/src/`)

**Entry point**: `main.tsx` → `App.tsx` renders a fixed four-panel layout: `Toolbar` (top) → `Sidebar` + `MapCanvas` (middle row) → `BottomPanel`.

**State** (`store/useStore.ts`): Single Zustand store holding UI state (`language`, `workspace`, `sidebarOpen`, `bottomPanelOpen`), map state (`currentMapPath`, `layers[]`), and data state (`stationData`, `jobQueue`). All components read/write through `useStore()`.

**Map layer** (`map/`):
- `mapLibreManager` (`MapLibreManager.ts`) — module-level singleton wrapping MapLibre GL JS for base map, raster/fill/line layers, and camera control. This is the only map rendering path; there is no deck.gl integration in this codebase.
- `cogHandler.ts` — loads GeoTIFF/Cloud-Optimized GeoTIFF rasters and adds them to the MapLibre map as a plain `image`/`raster` source+layer.

**Data layer** (`data/`):
- `duckdb.ts` — module-level singleton DuckDB-WASM connection (`db`, `conn`). Lazy-initialized on first call. Key exports: `initializeDuckDB`, `executeSQLQuery`, `loadCSV`, `loadGeoJSON`, `validateStationData`, `querySpatialData`, `aggregateByLCZ`. Station data requires columns: `date, station, var, lat, lon`.
- `dataImporter.ts` — file import orchestration (CSV/GeoJSON).

**Analysis**: There is no client-side analysis module. UHI intensity, thermal anomaly detection, and every other LCZ4py computation run entirely in the Python sidecar (`desktop/sidecar/api.py`), invoked from `frontend/src/components/Lcz4pyBrowserPanel.tsx` via a generic, introspection-driven catalog (`GET /lcz4py/catalog`) and invoke route (`POST /lcz4py/{category}/{fn_name}`) — see `frontend/src/services/rService.ts`.

**LCZ palette** (`utils/lczPalette.ts`): Authoritative WUDAPT color constants for classes 1–17 (`LCZ_PALETTE`, `LCZ_NAMES`). Classes 1–10 = built types; 11–17 = land cover types. Use `getLCZColor(n)` / `getLCZName(n)` rather than hardcoding hex values.

**i18n** (`i18n/translations.ts`): Single flat object keyed by language (`en | pt | es | zh | fr | de | ja | ko | ar`), consumed via `useStore().language`. `en`/`pt`/`es`/`zh`/`fr` are hand-translated; `de`/`ja`/`ko`/`ar` currently fall back to the English strings via `Object.fromEntries`. Add all new UI strings to at least the hand-translated keys (`en/pt/es/zh/fr`) so `typeof en` stays satisfied for every block.

**Styling**: Each component has a co-located CSS file (e.g., `Sidebar.css`). No CSS-in-JS or Tailwind; plain CSS with BEM-ish class names. Brand green: `#2d5016` (headings), interactive green: `#4caf50`.

### Desktop (`desktop/src-tauri/`)

Minimal Tauri v2 setup. `lib.rs` contains the Tauri builder; `main.rs` is the entry point. Asset protocol is enabled for `$APPDATA`, `$DOWNLOAD`, and `$DOCUMENT`. Bundle targets: `dmg` and `app` (macOS). Extend native capabilities in `tauri.conf.json`.

## Key Conventions

- Map base style: `https://tiles.openfreemap.org/styles/liberty` (OpenFreeMap, open license).
- Path alias `@/` resolves to `frontend/src/` — use it for all intra-frontend imports.
- DuckDB SQL operates on table names passed as strings — always validate or sanitize table/column names before interpolating into SQL to avoid injection.
- Layers in the store (`Layer` interface) are typed `'raster' | 'vector' | 'geojson'`; map managers operate independently and must be kept in sync manually.
