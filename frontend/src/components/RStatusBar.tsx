import React from 'react'
import { useStore } from '../store/useStore'
import './RStatusBar.css'

export const RStatusBar: React.FC = () => {
  const { rAvailable, rRunning, activeJobs } = useStore()
  const running = activeJobs.filter((j) => j.status === 'running').length

  if (!rAvailable && !rRunning) return null

  return (
    <div className={`r-status-bar ${rRunning ? 'connected' : 'connecting'}`}>
      <span className="r-status-dot" />
      <span className="r-status-label">
        {rRunning ? `Sidecar connected${running > 0 ? ` · ${running} job${running > 1 ? 's' : ''} running` : ''}` : 'Sidecar starting…'}
      </span>
      {activeJobs.some((j) => j.status === 'error') && (
        <span className="r-status-error"> · errors</span>
      )}
    </div>
  )
}
