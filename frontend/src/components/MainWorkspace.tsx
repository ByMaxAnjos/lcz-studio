import React, { useEffect, useState } from 'react'
import { useStore, RJob } from '../store/useStore'
import { Lcz4pyBrowserPanel, ResultView } from './Lcz4pyBrowserPanel'
import { HelpCenter } from './HelpCenter'
import { MapCanvas } from './MapCanvas'
import { findTool } from './toolRegistry'
import { getTranslation } from '../i18n/translations'
import { getFunctionLabelKey } from '../utils/functionGuide'
import { preferredOutputView } from '../utils/resultOutputs'
import type { Lcz4pyResult } from '../services/rService'
import './MainWorkspace.css'

type OutputView = 'map' | 'visualization'

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
    setWorkspace,
    setActiveTool,
    activeJobs,
    language,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const [outputView, setOutputView] = useState<OutputView>('map')

  const tool = findTool(workspace, activeTool)
  const hasActiveTool = Boolean(tool)
  const isHelpView = activeTool === 'help'
  const latestVisualJob = activeJobs
    .filter((job) => job.status === 'done')
    .filter((job) => !tool?.functionIds || tool.functionIds.includes(job.fn))
    .at(-1)

  useEffect(() => {
    setOutputView(tool?.outputView ?? 'map')
  }, [activeTool, tool?.outputView, isHelpView])

  const handleRunComplete = (result: Lcz4pyResult) => {
    const nextView = preferredOutputView(result)
    setOutputView(nextView)
  }

  const renderWorkbench = () => {
    if (activeTool === 'help') {
      return (
        <section className="workspace-help-panel">
          <HelpCenter
            language={language}
            onExploreFunctions={(targetWorkspace) => {
              setWorkspace(targetWorkspace)
              setActiveTool('lcz4py-functions')
            }}
          />
        </section>
      )
    }

    if (tool) {
      return (
        <Lcz4pyBrowserPanel
          key={`${workspace}-${tool.id}`}
          category={workspace}
          groupFilter={tool.group}
          functionIds={tool.functionIds}
          title={t(tool.labelKey as Parameters<typeof getTranslation>[1])}
          description={t(tool.descKey as Parameters<typeof getTranslation>[1])}
          onRunComplete={handleRunComplete}
        />
      )
    }

    return (
      <section className="workspace-empty-workbench">
        <div className="workspace-section-heading">
          <span className="workspace-kicker">{t('ready')}</span>
          <h2>{t('selectTool')}</h2>
        </div>
        <p className="workspace-empty">{t('selectToolDescription')}</p>
      </section>
    )
  }

  return (
    <main className={`main-workspace ${hasActiveTool ? 'tool-active' : 'map-active'}`}>
      {isHelpView ? (
        <div className="workspace-content">
          <section className="workspace-help-panel">
            <HelpCenter
              language={language}
              onExploreFunctions={(targetWorkspace) => {
                setWorkspace(targetWorkspace)
                setActiveTool('lcz4py-functions')
              }}
            />
          </section>
        </div>
      ) : (
        <div className="workspace-content">
          {hasActiveTool ? (
            <section className="workspace-flow">
              <section className="workspace-tool-slot">
                {renderWorkbench()}
              </section>

              <section className="workspace-output-slot">
                <div className="workspace-map-stage">
                  <MapCanvas />
                </div>
                {outputView === 'visualization' && latestVisualJob != null && (
                  <section className="workspace-visual-drawer" aria-label={t('resultReady')}>
                    <header>
                      <div>
                        <span className="workspace-kicker">{t('resultReady')}</span>
                        <strong>{latestVisualJob.label || t(getFunctionLabelKey(latestVisualJob.fn) as Parameters<typeof getTranslation>[1])}</strong>
                      </div>
                      <small>{(((latestVisualJob.finishedAt ?? latestVisualJob.startedAt) - latestVisualJob.startedAt) / 1000).toFixed(1)}s</small>
                    </header>
                    <ResultView
                      value={getJobOutputValue(latestVisualJob)}
                      onAddLayer={() => undefined}
                      allowAddLayer={false}
                      previewVisualOnly={latestVisualJob.fn === 'lcz_plot_map'}
                      language={language}
                    />
                  </section>
                )}
              </section>

            </section>
          ) : (
            <div className="workspace-map-slot">
              <MapCanvas />
              <section className="workspace-welcome" aria-label={t('quickStart')}>
                <span className="workspace-kicker">{t('ready')}</span>
                <h2>{t('welcomeTitle')}</h2>
                <p>{t('welcomeDescription')}</p>
                <div className="welcome-actions">
                  <button onClick={() => { setWorkspace('general'); setActiveTool('get-map') }}>
                    <strong>{t('welcomeGetMap')}</strong><span>{t('welcomeGetMapDescription')}</span>
                  </button>
                  <button onClick={() => { setWorkspace('general'); setActiveTool('morphological-params') }}>
                    <strong>{t('welcomeUseMap')}</strong><span>{t('welcomeUseMapDescription')}</span>
                  </button>
                  <button onClick={() => { setWorkspace('local'); setActiveTool('time-series') }}>
                    <strong>{t('welcomeStationData')}</strong><span>{t('welcomeStationDataDescription')}</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
