import type { ProjectSnapshot } from '../store/useStore'

export interface ProjectFile extends ProjectSnapshot {
  app: 'LCZ Studio'
}

export function createProjectFile(snapshot: ProjectSnapshot): ProjectFile {
  return {
    ...snapshot,
    app: 'LCZ Studio',
  }
}

export function serializeProject(snapshot: ProjectSnapshot): string {
  return JSON.stringify(createProjectFile(snapshot), null, 2)
}

export function parseProjectFile(raw: string): ProjectSnapshot {
  const parsed = JSON.parse(raw) as Partial<ProjectFile>
  if (parsed.app !== 'LCZ Studio') {
    throw new Error('Invalid project file')
  }

  const version = parsed.version ?? 1
  if (version !== 1) {
    throw new Error(`Unsupported project version: ${version}`)
  }

  return {
    version: 1,
    projectName: typeof parsed.projectName === 'string' ? parsed.projectName : 'Untitled project',
    projectDescription: typeof parsed.projectDescription === 'string' ? parsed.projectDescription : '',
    language: normalizeLanguage(parsed.language),
    workspace: parsed.workspace === 'local' ? 'local' : 'general',
    sidebarOpen: parsed.sidebarOpen ?? true,
    activeTool: typeof parsed.activeTool === 'string' || parsed.activeTool === null ? parsed.activeTool ?? null : null,
    layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    stationData: Array.isArray(parsed.stationData) ? parsed.stationData : null,
    stationFile: typeof parsed.stationFile === 'string' ? parsed.stationFile : null,
    lczMapPath: typeof parsed.lczMapPath === 'string' ? parsed.lczMapPath : null,
    activeJobs: Array.isArray(parsed.activeJobs) ? parsed.activeJobs : [],
    onboardingDismissed: Boolean(parsed.onboardingDismissed),
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
  }
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readTextFile(file: File): Promise<string> {
  return file.text()
}

export function projectFilename(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'lcz-studio-project'
  return `${slug}.lczstudio.json`
}

function normalizeLanguage(language: unknown): 'en' | 'pt' | 'es' | 'zh' {
  return language === 'pt' || language === 'es' || language === 'zh' ? language : 'en'
}
