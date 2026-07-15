import React from 'react'
import { getLCZPaletteArray } from '../utils/lczPalette'
import './LCZLegend.css'

export interface LCZLegendProps {
  compact?: boolean
  onClassClick?: (lczClass: number) => void
}

export const LCZLegend: React.FC<LCZLegendProps> = ({ compact = false, onClassClick }) => {
  const palette = getLCZPaletteArray()

  if (compact) {
    return (
      <div className="lcz-legend-compact">
        <div className="legend-title">LCZ Classes</div>
        <div className="legend-grid-compact">
          {palette.map((item) => (
            <div
              key={item.value}
              className="legend-item-compact"
              onClick={() => onClassClick?.(item.value)}
              title={item.name}
              style={{ backgroundColor: item.color }}
            >
              {item.value}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="lcz-legend">
      <div className="legend-title">Local Climate Zones</div>
      <div className="legend-categories">
        <div className="legend-category">
          <h4>Built Types (1-10)</h4>
          <div className="legend-items">
            {palette.slice(0, 10).map((item) => (
              <div
                key={item.value}
                className="legend-item"
                onClick={() => onClassClick?.(item.value)}
              >
                <div
                  className="legend-color"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="legend-label">
                  <span className="legend-number">{item.value}</span>
                  <span className="legend-name">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="legend-category">
          <h4>Land Cover Types (11-17)</h4>
          <div className="legend-items">
            {palette.slice(10).map((item) => (
              <div
                key={item.value}
                className="legend-item"
                onClick={() => onClassClick?.(item.value)}
              >
                <div
                  className="legend-color"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="legend-label">
                  <span className="legend-number">{item.value}</span>
                  <span className="legend-name">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
