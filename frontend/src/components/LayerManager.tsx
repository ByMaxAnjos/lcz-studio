import React, { useState, useEffect, useRef } from 'react'
import Sortable from 'sortablejs'
import { useStore, Layer } from '../store/useStore'
import './LayerManager.css'

export const LayerManager: React.FC = () => {
  const { layers, removeLayer, updateLayer, reorderLayers } = useStore()
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)

  // Initialize SortableJS for drag-to-reorder
  useEffect(() => {
    if (!listRef.current) return

    sortableRef.current = Sortable.create(listRef.current, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: (evt) => {
        const from = evt.oldIndex
        const to = evt.newIndex
        if (from !== undefined && to !== undefined && from !== to) {
          reorderLayers(from, to)
        }
      },
    })

    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [reorderLayers])

  const exportLayer = async (layer: Layer) => {
    if (!layer.data) return
    try {
      const json = JSON.stringify(layer.data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${layer.name.replace(/[^a-z0-9]/gi, '_')}.geojson`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  if (layers.length === 0) {
    return (
      <div className="layer-manager">
        <div className="layer-manager-header">
          <h3>Layers</h3>
        </div>
        <div className="empty-layers">
          <p>No layers yet. Import data to add layers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>Layers</h3>
        <span className="layer-count">{layers.length}</span>
      </div>

      <div className="layers-container" ref={listRef}>
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-card ${expandedLayer === layer.id ? 'expanded' : ''}`}
            data-id={layer.id}
          >
            <div className="layer-card-header">
              <span className="drag-handle" title="Drag to reorder">⠿</span>

              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                className="layer-visibility"
                title="Toggle visibility"
              />

              <span
                className={`layer-type-badge layer-type-${layer.type}`}
                title={layer.type}
              />

              <button
                className="layer-name-btn"
                onClick={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
                title={layer.name}
              >
                {layer.name}
              </button>

              {!!layer.data && (
                <button
                  className="layer-action-btn"
                  onClick={() => exportLayer(layer)}
                  title="Export as GeoJSON"
                >
                  ⬇
                </button>
              )}

              <button
                className="layer-remove-btn"
                onClick={() => removeLayer(layer.id)}
                title="Remove layer"
              >
                ✕
              </button>
            </div>

            {expandedLayer === layer.id && (
              <div className="layer-card-details">
                <div className="opacity-row">
                  <label>Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) => updateLayer(layer.id, { opacity: e.target.valueAsNumber / 100 })}
                    className="opacity-slider"
                  />
                  <span className="opacity-value">{Math.round(layer.opacity * 100)}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{layer.type}</span>
                </div>
                {layer.sourceFile && (
                  <div className="detail-row">
                    <span className="detail-label">File</span>
                    <span className="detail-value file-path">{layer.sourceFile.split('/').pop()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
