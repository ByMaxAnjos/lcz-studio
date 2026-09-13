import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { BasemapStyleId } from '../map/MapLibreManager'
import type { Language } from '../i18n/translations'

export interface ProjectSnapshot {
  version: 2
  projectName: string
  projectDescription: string
  language: Language
  workspace: 'general' | 'local'
  sidebarOpen: boolean
  activeTool: string | null
  layers: Layer[]
  stationData: Record<string, unknown>[] | null
  stationFile: string | null
  lczMapPath: string | null
  globeEnabled: boolean
  basemapStyle: BasemapStyleId
  activeJobs: RJob[]
  onboardingDismissed: boolean
  savedAt: string
}

export interface Layer {
  id: string
  name: string
  type: 'raster' | 'vector' | 'geojson'
  visible: boolean
  opacity: number
  data?: unknown
  sourceFile?: string
  analysisSourceFile?: string
  /** Display-only raster styling; source file is left unchanged for analysis. */
  renderMode?: 'lcz'
  bounds?: [[number, number], [number, number]]
}

export interface RJob {
  id: string
  fn: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  result?: unknown
  plotPath?: string
  csvPath?: string
  tiffPath?: string
  error?: string
  startedAt: number
  finishedAt?: number
}

export interface AppState {
  // UI State
  language: Language
  workspace: 'general' | 'local'
  sidebarOpen: boolean
  activeTool: string | null
  projectName: string
  projectDescription: string
  onboardingDismissed: boolean
  theme: 'light' | 'dark' | 'dark-neutral' | 'system'

  // Map State
  layers: Layer[]

  // Data State
  stationData: Record<string, unknown>[] | null
  stationFile: string | null   // absolute path for passing to R
  lczMapPath: string | null    // current LCZ map GeoTIFF path
  globeEnabled: boolean
  basemapStyle: BasemapStyleId

  // R Sidecar State
  rAvailable: boolean
  rRunning: boolean
  sidecarPhase: 'idle' | 'detecting' | 'starting' | 'waiting' | 'connected' | 'failed'
  activeJobs: RJob[]

  // Actions — UI
  setLanguage: (lang: Language) => void
  setWorkspace: (workspace: 'general' | 'local') => void
  toggleSidebar: () => void
  setActiveTool: (tool: string | null) => void
  setProjectName: (name: string) => void
  setProjectDescription: (description: string) => void
  dismissOnboarding: () => void
  setTheme: (theme: 'light' | 'dark' | 'dark-neutral' | 'system') => void

  // Actions — Map
  setLczMapPath: (path: string | null) => void
  setGlobeEnabled: (enabled: boolean) => void
  setBasemapStyle: (style: BasemapStyleId) => void
  addLayer: (layer: Layer) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  setLayers: (layers: Layer[]) => void

  // Actions — Data
  setStationData: (data: Record<string, unknown>[] | null, filePath?: string | null) => void

  // Actions — R
  setRAvailable: (v: boolean) => void
  setRRunning: (v: boolean) => void
  setSidecarPhase: (phase: AppState['sidecarPhase']) => void
  addRJob: (job: RJob) => void
  updateRJob: (id: string, updates: Partial<RJob>) => void
  removeRJob: (id: string) => void

  // Project
  applyProjectSnapshot: (snapshot: ProjectSnapshot) => void
  resetProject: () => void
}

const initialState = {
  language: 'en' as const,
  workspace: 'general' as const,
  sidebarOpen: true,
  activeTool: null,
  projectName: 'Untitled project',
  projectDescription: '',
  onboardingDismissed: false,
  theme: 'light' as 'light' | 'dark' | 'dark-neutral' | 'system',
  lczMapPath: null,
  globeEnabled: false,
  basemapStyle: 'positron' as BasemapStyleId,
  layers: [] as Layer[],
  stationData: null as Record<string, unknown>[] | null,
  stationFile: null,
  rAvailable: false,
  rRunning: false,
  sidecarPhase: 'idle' as AppState['sidecarPhase'],
  activeJobs: [] as RJob[],
}

function applyTheme(theme: 'light' | 'dark' | 'dark-neutral' | 'system'): void {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
    root.classList.remove('dark-neutral')
  } else {
    root.classList.toggle('dark', theme === 'dark' || theme === 'dark-neutral')
    root.classList.toggle('dark-neutral', theme === 'dark-neutral')
  }
}

function buildSnapshot(state: AppState): ProjectSnapshot {
  return {
    version: 2,
    projectName: state.projectName.trim() || 'Untitled project',
    projectDescription: state.projectDescription,
    language: state.language,
    workspace: state.workspace,
    sidebarOpen: state.sidebarOpen,
    activeTool: state.activeTool,
    layers: state.layers,
    stationData: state.stationData,
    stationFile: state.stationFile,
    lczMapPath: state.lczMapPath,
    globeEnabled: state.globeEnabled,
    basemapStyle: state.basemapStyle,
    activeJobs: state.activeJobs,
    onboardingDismissed: state.onboardingDismissed,
    savedAt: new Date().toISOString(),
  }
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      // UI actions
      setLanguage: (lang) => set({ language: lang }),
      setWorkspace: (workspace) => set({ workspace }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setActiveTool: (tool) => set({ activeTool: tool }),
      setProjectName: (name) => set({ projectName: name }),
      setProjectDescription: (description) => set({ projectDescription: description }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      // Map actions
      setLczMapPath: (path) => set({ lczMapPath: path }),
      setGlobeEnabled: (enabled) => set({ globeEnabled: enabled }),
      setBasemapStyle: (style) => set({ basemapStyle: style }),
      setLayers: (layers) => set({ layers }),

      addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),

      removeLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),

      updateLayer: (id, updates) =>
        set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),

      reorderLayers: (fromIndex, toIndex) =>
        set((s) => {
          const layers = [...s.layers]
          const [moved] = layers.splice(fromIndex, 1)
          if (!moved) return {}
          layers.splice(toIndex, 0, moved)
          return { layers }
        }),

      // Data actions
      setStationData: (data, filePath) =>
        set({ stationData: data, stationFile: filePath ?? null }),

      // R actions
      setRAvailable: (v) => set({ rAvailable: v }),
      setRRunning: (v) => set({ rRunning: v }),
      setSidecarPhase: (phase) => set({ sidecarPhase: phase }),

      addRJob: (job) => set((s) => ({ activeJobs: [...s.activeJobs, job] })),

      updateRJob: (id, updates) =>
        set((s) => ({
          activeJobs: s.activeJobs.map((job) => {
            if (job.id !== id) return job
            const completed = updates.status === 'done' || updates.status === 'error'
            return {
              ...job,
              ...updates,
              finishedAt: completed ? (job.finishedAt ?? Date.now()) : job.finishedAt,
            }
          }),
        })),

      removeRJob: (id) => set((s) => ({ activeJobs: s.activeJobs.filter((j) => j.id !== id) })),

      // Project
      applyProjectSnapshot: (snapshot) =>
        set((current) => ({
          language: snapshot.language,
          workspace: snapshot.workspace,
          sidebarOpen: snapshot.sidebarOpen,
          activeTool: snapshot.activeTool,
          projectName: snapshot.projectName,
          projectDescription: snapshot.projectDescription,
          onboardingDismissed: snapshot.onboardingDismissed,
          layers: snapshot.layers,
          stationData: snapshot.stationData,
          stationFile: snapshot.stationFile,
          lczMapPath: snapshot.lczMapPath,
          globeEnabled: snapshot.globeEnabled ?? false,
          basemapStyle: snapshot.basemapStyle ?? 'positron',
          rAvailable: current.rAvailable,
          rRunning: current.rRunning,
          activeJobs: snapshot.activeJobs,
        })),
      resetProject: () =>
        set((current) => ({
          ...initialState,
          language: current.language,
          sidebarOpen: current.sidebarOpen,
          rAvailable: current.rAvailable,
          rRunning: current.rRunning,
        })),
    }),
    {
      name: 'lcz-studio-store',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        workspace: state.workspace,
        sidebarOpen: state.sidebarOpen,
        activeTool: state.activeTool,
        projectName: state.projectName,
        projectDescription: state.projectDescription,
        onboardingDismissed: state.onboardingDismissed,
        theme: state.theme,
        layers: state.layers,
        stationData: state.stationData,
        stationFile: state.stationFile,
        lczMapPath: state.lczMapPath,
        globeEnabled: state.globeEnabled,
        basemapStyle: state.basemapStyle,
        activeJobs: state.activeJobs,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppState>),
      }),
    }
  )
)

export function getProjectSnapshot(): ProjectSnapshot {
  return buildSnapshot(useStore.getState())
}
