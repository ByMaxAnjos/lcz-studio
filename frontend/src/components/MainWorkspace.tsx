import React, { useEffect, useState } from 'react'
import { useStore, RJob } from '../store/useStore'
import { addGeoTIFFToMap } from '../map/cogHandler'
import { mapLibreManager } from '../map/MapLibreManager'
import { FileUpload } from './FileUpload'
import { Lcz4pyBrowserPanel, ResultView } from './Lcz4pyBrowserPanel'
import { HelpCenter } from './HelpCenter'
import { MapCanvas } from './MapCanvas'
import { findTool } from './toolRegistry'
import { getTranslation } from '../i18n/translations'
import { preferredOutputView } from '../utils/resultOutputs'
import type { Lcz4pyResult } from '../services/rService'
import './MainWorkspace.css'

type WorkspaceTab = 'workbench' | 'map' | 'history'
type OutputView = 'map' | 'visualization'

const STATUS_ICON: Record<RJob['status'], string> = {
  pending: '⏳',
  running: '🔄',
  done: '✅',
  error: '❌',
}

function unwrapJobResult(job: RJob) {
  if (!job.result || typeof job.result !== 'object') return job.result
  const maybeExecution = job.result as { result?: unknown }
  return maybeExecution.result ?? job.result
}

function getJobOutputValue(job: RJob) {
  const result = unwrapJobResult(job)
  if (result && typeof result === 'object') return result
  return {
    plot_path: job.plotPath,
    csv_path: job.csvPath,
    tiff_path: job.tiffPath,
    value: result,
  }
}

export const MainWorkspace: React.FC = () => {
  const {
    workspace,
    activeTool,
    addLayer,
    setStationData,
    setLczMapPath,
    setWorkspace,
    setActiveTool,
    activeJobs,
    layers,
    stationData,
    language,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('map')
  const [outputView, setOutputView] = useState<OutputView>('map')

  const tool = findTool(workspace, activeTool)
  const hasActiveTool = Boolean(tool)
  const isHelpView = activeTool === 'help'
  const usesVisualization = outputView === 'visualization'
  const runningJobs = activeJobs.filter((job) => job.status === 'running' || job.status === 'pending')
  const visualJobs = activeJobs
    .filter((job) => job.status === 'done')
    .filter((job) => !tool?.functionIds || tool.functionIds.includes(job.fn))
    .slice()
    .reverse()

  useEffect(() => {
    setOutputView(tool?.outputView ?? 'map')
    setActiveTab(activeTool ? 'workbench' : 'map')
  }, [activeTool, tool?.outputView, isHelpView])

  const handleRunComplete = (result: Lcz4pyResult) => {
    const nextView = preferredOutputView(result)
    setOutputView(nextView)
    setActiveTab('map')
  }

  const handleFileSuccess = async (data: any[], fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      setStationData(data, fileName)
      setActiveTab('workbench')
      return
    }

    if (ext === 'tif' || ext === 'tiff') {
      const layerId = `tif-${Date.now()}`
      const map = mapLibreManager.getMap()
      if (!map) return
      try {
        const file = (window as any).__lastFile as File | undefined
        if (!file) return
        const { bounds } = await addGeoTIFFToMap(file, layerId, map)
        addLayer({ id: layerId, name: fileName, type: 'raster', visible: true, opacity: 0.85 })
        map.fitBounds(bounds, { padding: 40 })
        setLczMapPath(fileName)
        setActiveTab('map')
      } catch (error) {
        console.error('GeoTIFF load error:', error)
      }
      return
    }

    const layerId = `vec-${Date.now()}`
    addLayer({ id: layerId, name: fileName, type: 'geojson', visible: true, opacity: 0.8, data })
    setActiveTab('map')
  }

  const renderWorkbench = () => {
    if (activeTool === 'help') {
      return (
        <section className="workspace-panel workspace-help-panel">
          <HelpCenter
            language={language}
            workspace={workspace}
            onExploreFunctions={(targetWorkspace) => {
              setWorkspace(targetWorkspace)
              setActiveTool('lcz4py-functions')
            }}
          />
        </section>
      )
    }

    if (activeTool === 'add-data') {
      return (
        <section className="workspace-panel workspace-import-panel">
          <div className="workspace-section-heading">
            <span className="workspace-kicker">{t('input')}</span>
            <h2>{t('addData')}</h2>
          </div>
          <FileUpload
            onSuccess={handleFileSuccess}
            onError={(error) => console.error(error)}
            accept=".csv,.geojson,.json,.gpkg,.shp,.zip,.tif,.tiff"
          />
        </section>
      )
    }

    if (tool) {
      return (
        <section className="workspace-panel workspace-tool-panel">
          <Lcz4pyBrowserPanel
            key={`${workspace}-${tool.id}`}
            category={workspace}
            groupFilter={tool.group}
            functionIds={tool.functionIds}
            title={tool.label}
            description={tool.description}
            onRunComplete={handleRunComplete}
          />
        </section>
      )
    }

    return (
      <section className="workspace-panel workspace-empty-workbench">
        <div className="workspace-section-heading">
          <span className="workspace-kicker">{t('ready')}</span>
          <h2>{t('selectTool')}</h2>
        </div>
        <p className="workspace-empty">{t('selectToolDescription')}</p>
      </section>
    )
  }

  const renderVisualization = () => (
    <section className="workspace-panel workspace-viz-panel">
      <div className="workspace-section-heading">
        <span className="workspace-kicker">{t('visualOutputs')}</span>
        <h2>{t('visualization')}</h2>
      </div>
      {visualJobs.length === 0 ? (
        <p className="workspace-empty">{t('noVisualizationsYet')}</p>
      ) : (
        <div className="workspace-viz-list">
          {visualJobs.map((job) => (
            <article key={job.id} className="workspace-viz-card">
              <header>
                <div>
                  <strong>{job.label}</strong>
                  <span>{job.fn}</span>
                </div>
                <small>{(((job.finishedAt ?? job.startedAt) - job.startedAt) / 1000).toFixed(1)}s</small>
              </header>
              <ResultView value={getJobOutputValue(job)} onAddLayer={() => undefined} allowAddLayer={false} />
            </article>
          ))}
        </div>
      )}
    </section>
  )

  return (
    <main className={`main-workspace ${hasActiveTool ? 'tool-active' : 'map-active'}`}>
      {!isHelpView && (
        <header className="workspace-header">
          <div>
            <span className="workspace-kicker">{t(workspace === 'general' ? 'generalWorkspace' : 'localWorkspace')}</span>
            <h2>{tool?.label ?? t('mapExplorer')}</h2>
            <p>{tool?.description ?? t('mapExplorerDescription')}</p>
          </div>
          <div className="workspace-stats">
            <span><strong>{layers.length}</strong> {t('layers').toLowerCase()}</span>
            <span><strong>{stationData?.length ?? 0}</strong> {t('records')}</span>
            <span><strong>{runningJobs.length}</strong> {t('running').replace('...', '').toLowerCase()}</span>
          </div>
        </header>
      )}

      {!isHelpView && (
        <div className="workspace-tabs" role="tablist" aria-label="Workspace views">
          <button className={activeTab === 'workbench' ? 'active' : ''} onClick={() => setActiveTab('workbench')}>
            {t('workbench')}
          </button>
          <button className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}>
            {usesVisualization ? t('visualization') : t('map')}
          </button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            {t('history')}
          </button>
        </div>
      )}

      <div className="workspace-content">
        <div className={`workspace-tab-panel ${activeTab === 'workbench' ? 'active' : ''}`}>
          {renderWorkbench()}
        </div>
        <div className={`workspace-tab-panel map-tab ${activeTab === 'map' ? 'active' : ''}`}>
          {usesVisualization ? renderVisualization() : <MapCanvas />}
        </div>
        <div className={`workspace-tab-panel ${activeTab === 'history' ? 'active' : ''}`}>
          <section className="workspace-panel job-history-panel">
            <div className="workspace-section-heading">
              <span className="workspace-kicker">{t('executionHistory')}</span>
              <h2>{t('history')}</h2>
            </div>
            {activeJobs.length === 0 ? (
              <p className="workspace-empty">{t('noJobsYet')}</p>
            ) : (
              <div className="workspace-job-list">
                {[...activeJobs].reverse().map((job) => (
                  <div key={job.id} className={`workspace-job job-${job.status}`}>
                    <span className="job-status-icon">{STATUS_ICON[job.status]}</span>
                    <div>
                      <strong>{job.label}</strong>
                      <span>{job.error ?? `${job.fn} · ${job.status}`}</span>
                    </div>
                    {job.status === 'done' && (
                      <small>{(((job.finishedAt ?? job.startedAt) - job.startedAt) / 1000).toFixed(1)}s</small>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
