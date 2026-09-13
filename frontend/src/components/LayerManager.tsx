import React, { useState, useEffect, useRef, useCallback } from 'react'
import Sortable from 'sortablejs'
import { useStore, Layer } from '../store/useStore'
import { getTranslation } from '../i18n/translations'
import { mapLibreManager } from '../map/MapLibreManager'
import { addGeoTIFFToMap } from '../map/cogHandler'
import { importFile } from '../data/dataImporter'
import { uploadFile, ensureCogTiff, filePathToUrl } from '../services/rService'
import './LayerManager.css'

export const LayerManager: React.FC = () => {
  const { layers, removeLayer, addLayer, updateLayer, reorderLayers, setLczMapPath, language } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [removedLayer, setRemovedLayer] = useState<Layer | null>(null)
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout)
    }
  }, [undoTimeout])

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (!importError) return
    const t = setTimeout(() => setImportError(null), 5000)
    return () => clearTimeout(t)
  }, [importError])

  const filteredLayers = searchQuery
    ? layers.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : layers

  const handleImportFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const map = mapLibreManager.getMap()
    if (!map) return

    setImporting(true)
    setImportError(null)
    try {
      // GeoTIFF - raster
      if (ext === 'tif' || ext === 'tiff') {
        const layerId = `raster-${Date.now()}`
        const { rRunning } = useStore.getState()

        let rasterLayer: Layer

        if (rRunning) {
          // Route through the sidecar: large rasters without overview pyramids
          // crash the in-browser decoder outright (it allocates a buffer sized
          // to the full image before downsampling), so ensure a COG copy exists
          // before loading it, and load it by URL (range-request reads) instead
          // of an in-memory buffer.
          const uploadedPath = await uploadFile(file)
          const { path: cogPath } = await ensureCogTiff(uploadedPath)
          const url = filePathToUrl(cogPath)
          const { bounds } = await addGeoTIFFToMap(url, layerId, map)

          rasterLayer = {
            id: layerId,
            name: file.name,
            type: 'raster',
            visible: true,
            opacity: 0.85,
            // COG for display; original upload path for LCZ4py analysis.
            sourceFile: cogPath,
            analysisSourceFile: uploadedPath,
            bounds,
          }
          map.fitBounds(bounds, { padding: 40 })
        } else {
          // No sidecar available (e.g. web mode without it running) — fall
          // back to decoding straight from the in-memory buffer. Works fine
          // for smaller rasters or ones that already have overviews.
          const arrayBuffer = await file.arrayBuffer()
          const { bounds } = await addGeoTIFFToMap(file, layerId, map)

          rasterLayer = {
            id: layerId,
            name: file.name,
            type: 'raster',
            visible: true,
            opacity: 0.85,
            sourceFile: file.name,
            bounds,
            _tiffBuffer: arrayBuffer,
          } as Layer & { _tiffBuffer: ArrayBuffer }
          map.fitBounds(bounds, { padding: 40 })
        }

        addLayer(rasterLayer)
        setLczMapPath(rasterLayer.analysisSourceFile ?? rasterLayer.sourceFile ?? file.name)
        return
      }

      // Vector formats (GeoJSON, GeoPackage, Shapefile, CSV station data)
      const result = await importFile(file)
      if (result.success && result.data) {
        const layerId = `vec-${Date.now()}`

        // CSV imports (dataImporter.importCSV) return flat rows like
        // {date, station, var, lat, lon} — not GeoJSON Features. Build real
        // Point features from lat/lon instead of passing the raw rows through
        // as "features" (which have no .geometry and crash extractCoords below).
        const isFlatRow = (row: any) => row && typeof row === 'object' && !('geometry' in row) && !('type' in row)
        const rows = result.data
        const geojson: GeoJSON.FeatureCollection = result.geojson || {
          type: 'FeatureCollection',
          features:
            rows.length > 0 && isFlatRow(rows[0])
              ? rows
                  .filter((row: any) => typeof row.lat === 'number' && typeof row.lon === 'number')
                  .map((row: any) => ({
                    type: 'Feature' as const,
                    geometry: { type: 'Point' as const, coordinates: [row.lon, row.lat] },
                    properties: row,
                  }))
              : rows,
        }

        addLayer({
          id: layerId,
          name: file.name,
          type: 'geojson',
          visible: true,
          opacity: 0.8,
          data: geojson,
          sourceFile: file.name,
        })

        // Add to map
        map.addSource(layerId, { type: 'geojson', data: geojson })

        const firstGeom = geojson.features?.[0]?.geometry?.type
        const isPoint = firstGeom === 'Point' || firstGeom === 'MultiPoint'

        if (isPoint) {
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: layerId,
            paint: { 'circle-radius': 5, 'circle-color': '#4caf50', 'circle-opacity': 0.8 },
          })
        } else {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: layerId,
            paint: { 'fill-color': '#4caf50', 'fill-opacity': 0.8 },
          })
        }

        // Fit bounds
        if (geojson.features.length > 0) {
          const coords: [number, number][] = []
          const extractCoords = (geom: any) => {
            if (geom.type === 'Point') coords.push(geom.coordinates)
            else if (geom.type === 'MultiPoint' || geom.type === 'LineString') coords.push(...geom.coordinates)
            else if (geom.type === 'MultiLineString' || geom.type === 'Polygon') {
              for (const ring of geom.coordinates) coords.push(...ring)
            } else if (geom.type === 'MultiPolygon') {
              for (const poly of geom.coordinates) for (const ring of poly) coords.push(...ring)
            }
          }
          for (const f of geojson.features) extractCoords(f.geometry)
          if (coords.length > 0) {
            const lons = coords.map((c) => c[0])
            const lats = coords.map((c) => c[1])
            map.fitBounds(
              [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
              { padding: 40 }
            )
          }
        }
      } else {
        setImportError(result.errors.join(', ') || result.message)
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [addLayer, setLczMapPath])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handleImportFile(files[i])
      }
    }
    e.currentTarget.value = ''
  }

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

  const handleRemoveLayer = useCallback((layer: Layer) => {
    const map = mapLibreManager.getMap()
    if (map) {
      if (map.getLayer(layer.id)) map.removeLayer(layer.id)
      if (map.getSource(layer.id)) map.removeSource(layer.id)
    }
    removeLayer(layer.id)
    setRemovedLayer(layer)

    if (undoTimeout) clearTimeout(undoTimeout)
    const timeout = setTimeout(() => {
      setRemovedLayer(null)
      setUndoTimeout(null)
    }, 5000)
    setUndoTimeout(timeout)
  }, [removeLayer, undoTimeout])

  const handleUndoRemove = useCallback(() => {
    if (removedLayer) {
      // Re-add to map
      const map = mapLibreManager.getMap()
      if (map && removedLayer.type === 'raster') {
        const source = (removedLayer as any)._tiffBuffer ?? removedLayer.sourceFile
        if (source) {
          addGeoTIFFToMap(source, removedLayer.id, map).catch((e) =>
            console.warn(`[LayerManager] Failed to restore raster layer ${removedLayer.id}:`, e)
          )
        }
      }
      addLayer(removedLayer)
      setRemovedLayer(null)
      if (undoTimeout) clearTimeout(undoTimeout)
      setUndoTimeout(null)
    }
  }, [removedLayer, addLayer, undoTimeout])

  const zoomToLayer = useCallback((layer: Layer) => {
    const map = mapLibreManager.getMap()
    if (!map) return

    if (layer.type === 'raster' && layer.bounds) {
      map.fitBounds(layer.bounds, { padding: 40 })
      return
    }

    if (layer.type === 'geojson' && layer.data) {
      const data = layer.data as any
      if (data.features && data.features.length > 0) {
        const coords: [number, number][] = []
        const extractCoords = (geom: any) => {
          if (geom.type === 'Point') coords.push(geom.coordinates)
          else if (geom.type === 'MultiPoint' || geom.type === 'LineString') coords.push(...geom.coordinates)
          else if (geom.type === 'MultiLineString' || geom.type === 'Polygon') {
            for (const ring of geom.coordinates) coords.push(...ring)
          } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) for (const ring of poly) coords.push(...ring)
          }
        }
        for (const f of data.features) extractCoords(f.geometry)

        if (coords.length > 0) {
          const lons = coords.map((c) => c[0])
          const lats = coords.map((c) => c[1])
          const bounds: [[number, number], [number, number]] = [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ]
          map.fitBounds(bounds, { padding: 40 })
        }
      }
    }
  }, [])

  return (
    <div className="layer-manager">
      <div className="layer-manager-header">
        <h3>{t('layerManagerTitle')}</h3>
        <div className="layer-manager-actions">
          <span className="layer-count">{layers.length}</span>
          <button
            className="layer-add-btn"
            onClick={() => fileInputRef.current?.click()}
            title={t('layerManagerAdd')}
            disabled={importing}
          >
            {importing ? '⏳' : '+'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,.gpkg,.shp,.zip,.tif,.tiff"
        multiple
        onChange={handleFileInputChange}
        className="layer-file-input"
      />

      {importError && (
        <div className="layer-import-error">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)}>✕</button>
        </div>
      )}

      {layers.length === 0 && !importing && (
        <div className="empty-layers">
          <p>{t('layerManagerEmpty')}</p>
          <button className="layer-add-first-btn" onClick={() => fileInputRef.current?.click()}>
            {t('layerManagerAdd')}
          </button>
        </div>
      )}

      {layers.length > 3 && (
        <div className="layer-search">
          <input
            type="text"
            placeholder={t('layerManagerSearch')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="layer-search-input"
          />
        </div>
      )}

      <div className="layers-container" ref={listRef}>
        {filteredLayers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-card ${expandedLayer === layer.id ? 'expanded' : ''}`}
            data-id={layer.id}
          >
            <div className="layer-card-header">
              <span className="drag-handle" title={t('layerManagerDragHint')}>⠿</span>

              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => {
                  const newVisible = e.target.checked
                  updateLayer(layer.id, { visible: newVisible })
                  // Directly update map layer visibility
                  const map = mapLibreManager.getMap()
                  if (map && map.getLayer(layer.id)) {
                    try {
                      const vis = newVisible ? 'visible' : 'none'
                      map.setLayoutProperty(layer.id, 'visibility', vis)
                    } catch {
                      // fallback for image sources
                      if (layer.type === 'raster') {
                        map.setPaintProperty(layer.id, 'raster-opacity', newVisible ? layer.opacity : 0)
                      }
                    }
                  }
                }}
                className="layer-visibility"
                title={t('layerManagerToggleVisibility')}
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

              <button
                className="layer-action-btn"
                onClick={() => zoomToLayer(layer)}
                title={t('layerManagerZoomTo')}
              >
                🔍
              </button>

              {!!layer.data && (
                <button
                  className="layer-action-btn"
                  onClick={() => exportLayer(layer)}
                  title={t('layerManagerExportGeoJSON')}
                >
                  ⬇
                </button>
              )}

              <button
                className="layer-remove-btn"
                onClick={() => handleRemoveLayer(layer)}
                title={t('layerManagerRemove')}
              >
                ✕
              </button>
            </div>

            {expandedLayer === layer.id && (
              <div className="layer-card-details">
                <div className="opacity-row">
                  <label>{t('layerManagerOpacity')}</label>
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
                  <span className="detail-label">{t('layerManagerType')}</span>
                  <span className="detail-value">{layer.type}</span>
                </div>
                {layer.sourceFile && (
                  <div className="detail-row">
                    <span className="detail-label">{t('layerManagerFile')}</span>
                    <span className="detail-value file-path">{layer.sourceFile.split('/').pop()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {removedLayer && (
        <div className="layer-undo-bar">
          <span>{t('layerManagerRemoved')}</span>
          <button className="layer-undo-btn" onClick={handleUndoRemove}>{t('layerManagerUndo')}</button>
        </div>
      )}
    </div>
  )
}
