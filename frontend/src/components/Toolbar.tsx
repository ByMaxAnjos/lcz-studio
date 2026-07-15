import React, { useRef } from 'react'
import { useStore, getProjectSnapshot } from '../store/useStore'
import { getTranslation } from '../i18n/translations'
import { downloadTextFile, parseProjectFile, projectFilename, readTextFile, serializeProject } from '../utils/project'
import './Toolbar.css'

const webAppUrl = import.meta.env.VITE_PUBLIC_WEB_APP_URL as string | undefined

export const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    rAvailable,
    rRunning,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const engineLabel = rRunning ? t('engineOnline') : rAvailable ? t('engineReady') : t('engineOffline')

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
          className="toolbar-btn"
          onClick={toggleSidebar}
          title="Toggle sidebar"
        >
          ☰
        </button>
        <div className="title-stack">
          <h1 className="app-title">{t('appName')}</h1>
          <input
            className="project-name-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            aria-label={t('projectName')}
          />
        </div>
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
        <span className={`status-pill ${rRunning ? 'running' : rAvailable ? 'ready' : 'offline'}`}>
          {engineLabel}
        </span>
        {webAppUrl && (
          <a className="toolbar-btn toolbar-link-btn" href={webAppUrl} target="_blank" rel="noreferrer" title={t('openWebApp')}>
            {t('openWebApp')}
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
        <button className="toolbar-btn" onClick={handleSaveProject} title={t('saveProject')}>
          {t('saveProject')}
        </button>
        <button className="toolbar-btn" onClick={handleLoadClick} title={t('loadProject')}>
          {t('loadProject')}
        </button>
        <button className="toolbar-btn" onClick={handleProjectReset} title={t('newProject')}>
          {t('newProject')}
        </button>
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as any)}
          className="language-select"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
          <option value="zh">中文</option>
        </select>
        
        <button className="toolbar-btn" title={t('settings')}>
          ⚙️
        </button>
        
          <button
          className={`toolbar-btn help-trigger ${activeTool === 'help' ? 'active' : ''}`}
          title={t('help')}
          aria-label={t('help')}
          onClick={() => setActiveTool('help')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4" />
              <path d="M12 18h.01" />
            </svg>
          </button>
      </div>
    </div>
    </>
  )
}
