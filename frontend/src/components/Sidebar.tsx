import React from 'react'
import { useStore } from '../store/useStore'
import { LayerManager } from './LayerManager'
import { RStatusBar } from './RStatusBar'
import { getTranslation } from '../i18n/translations'
import { getToolsForWorkspace } from './toolRegistry'
import './Sidebar.css'

export const Sidebar: React.FC = () => {
  const {
    language,
    workspace,
    sidebarOpen,
    activeTool,
    setActiveTool,
    setWorkspace,
    layers,
    stationData,
    onboardingDismissed,
    dismissOnboarding,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  const tools = getToolsForWorkspace(workspace)
  const isEmptyProject = !activeTool && !onboardingDismissed && layers.length === 0 && !stationData

  if (!sidebarOpen) return null

  return (
    <aside className="sidebar">
      <div className="sidebar-tools">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>

      {isEmptyProject && (
        <div className="getting-started-card">
          <div className="getting-started-header">
            <div>
              <h3>{t('quickStart')}</h3>
              <p>{t('quickStartDescription')}</p>
            </div>
            <button className="dismiss-btn" onClick={dismissOnboarding} aria-label={t('dismiss')}>
              ×
            </button>
          </div>
          <div className="getting-started-actions">
            <button className="quick-action" onClick={() => setActiveTool('add-data')}>
              {t('importData')}
            </button>
            <button className="quick-action" onClick={() => setWorkspace('general')}>
              {t('generalWorkspace')}
            </button>
            <button className="quick-action" onClick={() => setWorkspace('local')}>
              {t('localWorkspace')}
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-layers">
        <LayerManager />
      </div>

      <RStatusBar />
    </aside>
  )
}
