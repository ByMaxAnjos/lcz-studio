import React, { useState } from 'react'
import './ClimateAnalysisPanel.css'

export interface ClimateMetric {
  name: string
  value: number
  unit: string
  trend?: 'up' | 'down' | 'stable'
  change?: number
}

export interface ClimateAnalysisPanelProps {
  metrics: ClimateMetric[]
  title?: string
  onMetricClick?: (metric: ClimateMetric) => void
}

export const ClimateAnalysisPanel: React.FC<ClimateAnalysisPanelProps> = ({
  metrics,
  title = 'Climate Analysis',
  onMetricClick,
}) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      case 'stable':
        return '➡️'
      default:
        return '📊'
    }
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '#ff6b6b'
      case 'down':
        return '#51cf66'
      case 'stable':
        return '#4ecdc4'
      default:
        return '#999'
    }
  }

  if (!metrics || metrics.length === 0) {
    return <div className="climate-panel-empty">No climate data available</div>
  }

  return (
    <div className="climate-analysis-panel">
      <h3 className="panel-title">{title}</h3>

      <div className="metrics-list">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`metric-item ${expandedMetric === metric.name ? 'expanded' : ''}`}
            onClick={() => {
              setExpandedMetric(expandedMetric === metric.name ? null : metric.name)
              onMetricClick?.(metric)
            }}
          >
            <div className="metric-header">
              <div className="metric-icon">{getTrendIcon(metric.trend)}</div>

              <div className="metric-info">
                <div className="metric-name">{metric.name}</div>
                <div className="metric-value">
                  {metric.value.toFixed(2)} {metric.unit}
                </div>
              </div>

              {metric.change !== undefined && (
                <div
                  className="metric-change"
                  style={{ color: getTrendColor(metric.trend) }}
                >
                  {metric.change > 0 ? '+' : ''}
                  {metric.change.toFixed(2)}%
                </div>
              )}
            </div>

            {expandedMetric === metric.name && (
              <div className="metric-details">
                <div className="detail-row">
                  <span className="detail-label">Current Value:</span>
                  <span className="detail-value">
                    {metric.value.toFixed(4)} {metric.unit}
                  </span>
                </div>
                {metric.change !== undefined && (
                  <div className="detail-row">
                    <span className="detail-label">Change:</span>
                    <span
                      className="detail-value"
                      style={{ color: getTrendColor(metric.trend) }}
                    >
                      {metric.change > 0 ? '+' : ''}
                      {metric.change.toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Trend:</span>
                  <span className="detail-value">
                    {metric.trend || 'Unknown'} {getTrendIcon(metric.trend)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
