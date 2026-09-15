import React from 'react'
import { useStore } from '../store/useStore'
import { getTranslation } from '../i18n/translations'
import './RStatusBar.css'

const PHASE_MESSAGES: Record<string, string> = {
  idle: '',
  detecting: 'rStatusDetecting',
  starting: 'rStatusStarting',
  waiting: 'rStatusWaiting',
  connected: 'rStatusConnected',
  failed: 'rStatusFailed',
}

export const RStatusBar: React.FC = () => {
  const { rRunning, sidecarPhase, activeJobs, language } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const running = activeJobs.filter((j) => j.status === 'running').length
  const errorJobs = activeJobs.filter((j) => j.status === 'error')
  const hasErrors = errorJobs.length > 0
  const errorTitle = errorJobs.map((j) => j.error || j.label).filter(Boolean).join('\n')

  // Show status bar when sidecar is starting, connected, or has errors
  if (sidecarPhase === 'idle' && !rRunning && !hasErrors) return null

  const phaseKey = PHASE_MESSAGES[sidecarPhase] ?? 'rStatusStarting'
  const statusText = rRunning
    ? `${t('rStatusConnected')}${running > 0 ? ` · ${running} ${running > 1 ? t('rStatusJobsRunningPlural') : t('rStatusJobsRunning')}` : ''}`
    : t(phaseKey as any)

  const showProgress = sidecarPhase === 'detecting' || sidecarPhase === 'starting' || sidecarPhase === 'waiting'

  return (
    <div className={`r-status-bar ${rRunning ? 'connected' : sidecarPhase === 'failed' ? 'failed' : 'connecting'}`}>
      <span className="r-status-dot" />
      {showProgress && <span className="r-status-spinner" />}
      <span className="r-status-label">{statusText}</span>
      {hasErrors && (
        <span className="r-status-error" title={errorTitle}> · {t('rStatusErrors')}</span>
      )}
    </div>
  )
}
