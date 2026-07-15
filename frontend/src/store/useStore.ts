import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ProjectSnapshot {
  version: 1
  projectName: string
  projectDescription: string
  language: 'en' | 'pt' | 'es' | 'zh'
  workspace: 'general' | 'local'
  sidebarOpen: boolean
  activeTool: string | null
  layers: Layer[]
  stationData: Record<string, unknown>[] | null
  stationFile: string | null
  lczMapPath: string | null
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
  language: 'en' | 'pt' | 'es' | 'zh'
  workspace: 'general' | 'local'
  sidebarOpen: boolean
  activeTool: string | null
  projectName: string
  projectDescription: string
  onboardingDismissed: boolean

  // Map State
  layers: Layer[]

  // Data State
  stationData: Record<string, unknown>[] | null
  stationFile: string | null   // absolute path for passing to R
  lczMapPath: string | null    // current LCZ map GeoTIFF path

  // R Sidecar State
  rAvailable: boolean
  rRunning: boolean
  activeJobs: RJob[]

  // Actions — UI
  setLanguage: (lang: 'en' | 'pt' | 'es' | 'zh') => void
  setWorkspace: (workspace: 'general' | 'local') => void
  toggleSidebar: () => void
  setActiveTool: (tool: string | null) => void
  setProjectName: (name: string) => void
  setProjectDescription: (description: string) => void
  dismissOnboarding: () => void

  // Actions — Map
  setLczMapPath: (path: string | null) => void
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
  lczMapPath: null,
  layers: [] as Layer[],
  stationData: null as Record<string, unknown>[] | null,
  stationFile: null,
  rAvailable: false,
  rRunning: false,
  activeJobs: [] as RJob[],
}

function buildSnapshot(state: AppState): ProjectSnapshot {
  return {
    version: 1,
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

      // Map actions
      setLczMapPath: (path) => set({ lczMapPath: path }),
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        workspace: state.workspace,
        sidebarOpen: state.sidebarOpen,
        activeTool: state.activeTool,
        projectName: state.projectName,
        projectDescription: state.projectDescription,
        onboardingDismissed: state.onboardingDismissed,
        layers: state.layers,
        stationData: state.stationData,
        stationFile: state.stationFile,
        lczMapPath: state.lczMapPath,
        activeJobs: state.activeJobs,
      }),
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
