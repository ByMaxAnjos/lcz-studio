import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { LayerManager } from './LayerManager'
import { RStatusBar } from './RStatusBar'
import { getTranslation } from '../i18n/translations'
import { getToolsForWorkspace, getCategories, getToolsByCategory, ToolDef } from './toolRegistry'
import { StudioIcon, CategoryIconName } from './StudioIcon'
import './Sidebar.css'

const CATEGORY_ICONS: Record<string, CategoryIconName> = {
  Data: 'data',
  Extraction: 'analysis',
  Analysis: 'analysis',
  Climate: 'climate',
  Interpolation: 'category-interpolation',
  System: 'system',
}

const CATEGORY_KEYS: Record<string, string> = {
  Data: 'categoryData',
  Extraction: 'categoryExtraction',
  Analysis: 'categoryAnalysis',
  Climate: 'categoryClimate',
  Interpolation: 'categoryInterpolation',
  System: 'categorySystem',
}

export const Sidebar: React.FC = () => {
  const {
    language,
    workspace,
    sidebarOpen,
    activeTool,
    setActiveTool,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const tools = getToolsForWorkspace(workspace)
  const categories = getCategories(tools)
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleToolClick = (tool: ToolDef) => {
    setActiveTool(activeTool === tool.id ? null : tool.id)
  }

  if (!sidebarOpen) return null

  return (
    <aside className="sidebar">
      <div className="sidebar-tools">
        {categories.map((cat) => {
          const catTools = getToolsByCategory(tools, cat)
          const isCollapsed = collapsedCategories.has(cat)
          return (
            <div key={cat} className="tool-category">
              <button
                className={`tool-category-header ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => toggleCategory(cat)}
                aria-expanded={!isCollapsed}
              >
                <StudioIcon className="tool-category-icon" name={CATEGORY_ICONS[cat] || 'data'} />
                <span className="tool-category-name">{t(CATEGORY_KEYS[cat] as any || cat)}</span>
                <span className={`tool-category-chevron ${isCollapsed ? '' : 'open'}`}>⌄</span>
              </button>
              {!isCollapsed && (
                <div className="tool-category-items">
                  {catTools.map((tool) => (
                    <button
                      key={tool.id}
                      className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                      onClick={() => handleToolClick(tool)}
                      title={t(tool.descKey as any)}
                    >
                      <StudioIcon className="tool-icon" name={tool.icon} />
                      <span className="tool-label">{t(tool.labelKey as any)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sidebar-layers">
        <LayerManager />
      </div>

      <RStatusBar />
    </aside>
  )
}
