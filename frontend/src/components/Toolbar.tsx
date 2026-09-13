import React, { useRef, useState } from 'react'
import { useStore, getProjectSnapshot } from '../store/useStore'
import { getTranslation, LANGUAGES, type Language } from '../i18n/translations'
import { downloadTextFile, parseProjectFile, projectFilename, readTextFile, serializeProject } from '../utils/project'
import { SettingsPanel } from './SettingsPanel'
import './Toolbar.css'

const webAppUrl = import.meta.env.VITE_PUBLIC_WEB_APP_URL as string | undefined

type ToolbarIconName = 'menu' | 'external' | 'save' | 'folder' | 'plus' | 'settings' | 'help'

const ToolbarIcon: React.FC<{ name: ToolbarIconName }> = ({ name }) => {
  const paths: Record<ToolbarIconName, React.ReactNode> = {
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6" />
        <path d="M10 14 20 4" />
        <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="M3 10h18" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    settings: (
      <>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4" />
        <path d="M12 18h.01" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    language,
    setLanguage,
    workspace,
    setWorkspace,
    setActiveTool,
    activeTool,
    toggleSidebar,
    projectName,
    setProjectName,
    resetProject,
    applyProjectSnapshot,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  const handleSaveProject = () => {
    const snapshot = getProjectSnapshot()
    downloadTextFile(projectFilename(snapshot.projectName), serializeProject(snapshot))
  }

  const handleLoadProject = async (file: File) => {
    const raw = await readTextFile(file)
    const snapshot = parseProjectFile(raw)
    applyProjectSnapshot(snapshot)
  }

  const handleLoadClick = () => fileInputRef.current?.click()

  const handleProjectReset = () => {
    if (window.confirm(t('resetProjectConfirm'))) {
      resetProject()
    }
  }

  return (
    <>
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className="toolbar-icon-btn"
          onClick={toggleSidebar}
          title={t('toggleSidebar')}
          aria-label={t('toggleSidebar')}
        >
          <ToolbarIcon name="menu" />
        </button>
        <div className="toolbar-brand" aria-label={t('appName')}>
          <span className="toolbar-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <rect x="7.5" y="7.5" width="9" height="9" rx="3" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </span>
          {/* appName is always "LCZ Studio" (kept untranslated as a brand name in every
              language) — the mark above already carries "LCZ", so only "Studio" is shown
              here to avoid repeating it. */}
          <h1 className="app-title">{t('appName').replace(/^LCZ\s*/, '')}</h1>
        </div>
        <input
          className="project-name-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label={t('projectName')}
        />
      </div>

      <div className="toolbar-center">
        <div className="workspace-toggle">
          <button
            className={`workspace-btn ${workspace === 'general' ? 'active' : ''}`}
            onClick={() => setWorkspace('general')}
          >
            {getTranslation(language, 'generalWorkspace')}
          </button>
          <button
            className={`workspace-btn ${workspace === 'local' ? 'active' : ''}`}
            onClick={() => setWorkspace('local')}
          >
            {getTranslation(language, 'localWorkspace')}
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        {webAppUrl && (
          <a className="toolbar-icon-btn toolbar-link-btn" href={webAppUrl} target="_blank" rel="noreferrer" title={t('openWebApp')} aria-label={t('openWebApp')}>
            <ToolbarIcon name="external" />
          </a>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.lczstudio.json"
          hidden
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0]
            if (file) {
              await handleLoadProject(file)
              e.currentTarget.value = ''
            }
          }}
        />
        <button className="toolbar-icon-btn" onClick={handleSaveProject} title={t('saveProject')} aria-label={t('saveProject')}>
          <ToolbarIcon name="save" />
        </button>
        <button className="toolbar-icon-btn" onClick={handleLoadClick} title={t('loadProject')} aria-label={t('loadProject')}>
          <ToolbarIcon name="folder" />
        </button>
        <button className="toolbar-icon-btn" onClick={handleProjectReset} title={t('newProject')} aria-label={t('newProject')}>
          <ToolbarIcon name="plus" />
        </button>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="language-select"
        >
          {LANGUAGES.map(({ id, nativeLabel }) => (
            <option key={id} value={id}>{nativeLabel}</option>
          ))}
        </select>

        <button
          className="toolbar-icon-btn settings-trigger"
          title={t('settings')}
          aria-label={t('settings')}
          onClick={() => setSettingsOpen(true)}
        >
          <ToolbarIcon name="settings" />
        </button>

        <button
          className={`toolbar-icon-btn help-trigger ${activeTool === 'help' ? 'active' : ''}`}
          title={t('help')}
          aria-label={t('help')}
          onClick={() => setActiveTool('help')}
        >
          <ToolbarIcon name="help" />
        </button>
      </div>
    </div>

    {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
