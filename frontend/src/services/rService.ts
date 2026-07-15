// Python FastAPI sidecar service — communicates with the LCZ analysis API
// on localhost:8765. In desktop mode Tauri spawns the sidecar automatically;
// in web mode the user can start it manually (cd desktop/sidecar && python api.py).

import { invoke } from '@tauri-apps/api/core'
import { useStore } from '../store/useStore'

const SIDECAR_URL        = 'http://127.0.0.1:8765'
const STARTUP_TIMEOUT_MS = 30_000
const WEB_DETECT_TIMEOUT = 5_000
const POLL_INTERVAL_MS   = 800

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// ── Sidecar lifecycle ─────────────────────────────────────────────────────────

export async function checkRAvailable(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    return await invoke<boolean>('check_r_available')
  } catch {
    return false
  }
}

export async function startRSidecar(): Promise<boolean> {
  if (!isTauri()) return false
  try {
    const paths = await invoke<{ dataDir: string; outputDir: string; plumberPath: string }>('get_app_paths')
    await invoke('ensure_output_dir')
    await invoke('start_r_sidecar', {
      plumberPath: paths.plumberPath,
      outputDir: paths.outputDir,
    })
    return true
  } catch (e) {
    console.error('[rService] Failed to start sidecar:', e)
    return false
  }
}

export async function stopRSidecar(): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('stop_r_sidecar')
  } catch (e) {
    console.error('[rService] Failed to stop sidecar:', e)
  }
}

export async function waitForSidecar(timeoutMs = STARTUP_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SIDECAR_URL}/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return true
    } catch {
      // still starting up
    }
    await sleep(POLL_INTERVAL_MS)
  }
  return false
}

export async function initializeRSidecar(): Promise<void> {
  const store = useStore.getState()

  if (!isTauri()) {
    // Web mode: check if sidecar is already running locally (started manually)
    const ready = await waitForSidecar(WEB_DETECT_TIMEOUT)
    store.setRAvailable(ready)
    store.setRRunning(ready)
    return
  }

  const rAvailable = await checkRAvailable()
  store.setRAvailable(rAvailable)
  if (!rAvailable) return

  const started = await startRSidecar()
  if (!started) return

  const ready = await waitForSidecar()
  store.setRRunning(ready)
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Job tracking wrapper ───────────────────────────────────────────────────────

async function runJob<T>(
  fnName: string,
  label: string,
  work: () => Promise<T>
): Promise<T> {
  const store = useStore.getState()
  const id = `${fnName}-${Date.now()}`
  store.addRJob({ id, fn: fnName, label, status: 'running', startedAt: Date.now() })
  try {
    const result = await work()
    store.updateRJob(id, { status: 'done', result })
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.updateRJob(id, { status: 'error', error: msg })
    throw e
  }
}

// ── File utility ──────────────────────────────────────────────────────────────

/** Upload a File to the sidecar and return its absolute server-side path */
export async function uploadFile(file: File): Promise<string> {
  if (isTauri()) {
    const buffer = await file.arrayBuffer()
    return invoke<string>('write_temp_file', { name: file.name, data: Array.from(new Uint8Array(buffer)) })
  }
  // Web mode: POST to sidecar /upload endpoint
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${SIDECAR_URL}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.detail ?? 'Upload failed')
  return data.path as string
}

/** Convert a sidecar file path to a URL the browser can load.
 *  Desktop: Tauri asset protocol (serves local files to WebView).
 *  Web: sidecar HTTP endpoint (GET /output/file/{name}). */
export function filePathToUrl(absPath: string): string {
  if (isTauri()) {
    const encoded = encodeURIComponent(absPath)
    return `https://asset.localhost/${encoded}`
  }
  // Web mode: serve via sidecar HTTP
  const filename = absPath.split('/').pop() ?? absPath
  return `${SIDECAR_URL}/output/file/${encodeURIComponent(filename)}`
}

// ── LCZ4py generic catalog + invoke ─────────────────────────────────────────────
// Every public LCZ4py function (general + local), introspected server-side so
// this file never hardcodes a per-function schema — see desktop/sidecar/api.py.

export type Lcz4pyInputKind =
  | 'resource'
  | 'dataframe'
  | 'select'
  | 'boolean'
  | 'number'
  | 'date'
  | 'json'
  | 'secret'
  | 'text'

export interface Lcz4pyParam {
  name: string
  annotation: string | null
  default: string | number | boolean | null
  default_repr: string | null
  has_default: boolean
  required: boolean
  kind: Lcz4pyInputKind
  description: string
  options: string[]
}

export interface Lcz4pyFunctionMeta {
  id: string
  category: 'general' | 'local'
  group: string
  label: string
  summary: string
  params: Lcz4pyParam[]
  requires_setup: string | null
}

let catalogCache: Lcz4pyFunctionMeta[] | null = null

export async function fetchLcz4pyCatalog(force = false): Promise<Lcz4pyFunctionMeta[]> {
  if (catalogCache && !force) return catalogCache
  const res = await fetch(`${SIDECAR_URL}/lcz4py/catalog`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const data = await res.json()
  catalogCache = data.functions as Lcz4pyFunctionMeta[]
  return catalogCache
}

/** Generic result shape from the /lcz4py/{category}/{fn} invoke route —
 *  a JSON tree whose leaves are one of these keys depending on what the
 *  underlying LCZ4py function returned (see api.py's serialize_result). */
export type Lcz4pyResult = Record<string, unknown>

export interface Lcz4pyExecution {
  resultId: string
  result: Lcz4pyResult
}

export function runLcz4pyFunction(
  category: 'general' | 'local',
  fnName: string,
  label: string,
  params: Record<string, unknown>
) {
  return runJob<Lcz4pyExecution>(fnName, label, async () => {
    const res = await fetch(`${SIDECAR_URL}/lcz4py/${category}/${fnName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}: ${res.statusText}`)
    return {
      resultId: data.result_id as string,
      result: data.result as Lcz4pyResult,
    }
  })
}
