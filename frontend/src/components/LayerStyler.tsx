import React, { useState } from 'react'
import './LayerStyler.css'

export interface LayerStyle {
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
  strokeOpacity?: number
  pointRadius?: number
  pointColor?: string
}

export interface LayerStylerProps {
  layerId: string
  layerName: string
  layerType: 'raster' | 'vector' | 'geojson'
  style?: LayerStyle
  onStyleChange?: (style: LayerStyle) => void
}

export const LayerStyler: React.FC<LayerStylerProps> = ({
  layerName,
  layerType,
  style = {},
  onStyleChange,
}) => {
  const [currentStyle, setCurrentStyle] = useState<LayerStyle>(style)

  const handleStyleChange = (key: keyof LayerStyle, value: any) => {
    const newStyle = { ...currentStyle, [key]: value }
    setCurrentStyle(newStyle)
    onStyleChange?.(newStyle)
  }

  return (
    <div className="layer-styler">
      <div className="styler-header">
        <h4>Style: {layerName}</h4>
        <span className="layer-type-badge">{layerType}</span>
      </div>

      <div className="styler-content">
        {(layerType === 'geojson' || layerType === 'vector') && (
          <>
            <div className="style-group">
              <label>Fill Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={currentStyle.fillColor || '#4caf50'}
                  onChange={(e) => handleStyleChange('fillColor', e.target.value)}
                  className="color-input"
                />
                <span className="color-value">{currentStyle.fillColor || '#4caf50'}</span>
              </div>
            </div>

            <div className="style-group">
              <label>Fill Opacity</label>
              <div className="range-input-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentStyle.fillOpacity || 0.7) * 100}
                  onChange={(e) =>
                    handleStyleChange('fillOpacity', e.target.valueAsNumber / 100)
                  }
                  className="range-input"
                />
                <span className="range-value">
                  {Math.round((currentStyle.fillOpacity || 0.7) * 100)}%
                </span>
              </div>
            </div>

            <div className="style-group">
              <label>Stroke Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={currentStyle.strokeColor || '#333333'}
                  onChange={(e) => handleStyleChange('strokeColor', e.target.value)}
                  className="color-input"
                />
                <span className="color-value">{currentStyle.strokeColor || '#333333'}</span>
              </div>
            </div>

            <div className="style-group">
              <label>Stroke Width</label>
              <div className="number-input-group">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={currentStyle.strokeWidth || 1}
                  onChange={(e) =>
                    handleStyleChange('strokeWidth', e.target.valueAsNumber)
                  }
                  className="number-input"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="style-group">
              <label>Stroke Opacity</label>
              <div className="range-input-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentStyle.strokeOpacity || 1) * 100}
                  onChange={(e) =>
                    handleStyleChange('strokeOpacity', e.target.valueAsNumber / 100)
                  }
                  className="range-input"
                />
                <span className="range-value">
                  {Math.round((currentStyle.strokeOpacity || 1) * 100)}%
                </span>
              </div>
            </div>
          </>
        )}

        {(layerType === 'geojson' || layerType === 'vector') && (
          <>
            <div className="style-group">
              <label>Point Radius</label>
              <div className="number-input-group">
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={currentStyle.pointRadius || 5}
                  onChange={(e) =>
                    handleStyleChange('pointRadius', e.target.valueAsNumber)
                  }
                  className="number-input"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="style-group">
              <label>Point Color</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={currentStyle.pointColor || '#ff0000'}
                  onChange={(e) => handleStyleChange('pointColor', e.target.value)}
                  className="color-input"
                />
                <span className="color-value">{currentStyle.pointColor || '#ff0000'}</span>
              </div>
            </div>
          </>
        )}

        {layerType === 'raster' && (
          <div className="raster-notice">
            <p>Raster layers use predefined color schemes.</p>
            <p>Adjust opacity in the layer manager.</p>
          </div>
        )}
      </div>

      <div className="styler-preview">
        <div className="preview-label">Preview</div>
        <div
          className="preview-box"
          style={{
            backgroundColor: currentStyle.fillColor || '#4caf50',
            opacity: currentStyle.fillOpacity || 0.7,
            border: `${currentStyle.strokeWidth || 1}px solid ${
              currentStyle.strokeColor || '#333333'
            }`,
          }}
        ></div>
      </div>
    </div>
  )
}
