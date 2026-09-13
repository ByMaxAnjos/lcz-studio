import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useStore, Layer } from '../store/useStore'
import { mapLibreManager, resolveBasemapStyleUrl } from '../map/MapLibreManager'
import { addGeoTIFFToMap } from '../map/cogHandler'
import { BasemapPicker } from './BasemapPicker'
import { getLCZColor } from '../utils/lczPalette'
import './MapCanvas.css'

/** Re-add a single layer to the map after a style change. */
async function reAddLayer(layer: Layer, map: maplibregl.Map): Promise<void> {
  if (map.getLayer(layer.id)) return

  if (layer.type === 'raster' && layer.sourceFile) {
    try {
      await addGeoTIFFToMap(layer.sourceFile, layer.id, map, { renderMode: layer.renderMode })
      map.setPaintProperty(layer.id, 'raster-opacity', layer.opacity)
      if (!layer.visible) map.setLayoutProperty(layer.id, 'visibility', 'none')
    } catch (e) {
      console.warn(`[MapCanvas] Failed to re-add raster layer ${layer.id}:`, e)
    }
  } else if (layer.type === 'geojson' && layer.data) {
    try {
      map.addSource(layer.id, {
        type: 'geojson',
        data: layer.data as GeoJSON.FeatureCollection,
      })

      const features = (layer.data as any)?.features
      const geomType = features?.[0]?.geometry?.type
      const isPoint = geomType === 'Point' || geomType === 'MultiPoint'

      if (isPoint) {
        map.addLayer({
          id: layer.id,
          type: 'circle',
          source: layer.id,
          paint: { 'circle-radius': 5, 'circle-color': getLCZColor(1), 'circle-opacity': layer.opacity },
        })
      } else {
        map.addLayer({
          id: layer.id,
          type: 'fill',
          source: layer.id,
          paint: { 'fill-color': getLCZColor(1), 'fill-opacity': layer.opacity },
        })
      }
      if (!layer.visible) map.setLayoutProperty(layer.id, 'visibility', 'none')
    } catch (e) {
      console.warn(`[MapCanvas] Failed to re-add GeoJSON layer ${layer.id}:`, e)
    }
  }
}

export const MapCanvas: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const { layers, globeEnabled, basemapStyle } = useStore()
  const mapInitialized = useRef(false)
  const prevBasemapStyle = useRef(basemapStyle)
  const prevLayerIds = useRef<string[]>([])
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number } | null>(null)

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current) return

    try {
      mapLibreManager.initialize({
        container: mapContainer.current,
        style: resolveBasemapStyleUrl(basemapStyle),
        center: [0, 20],
        zoom: 2,
        pitch: basemapStyle === '3d' ? 60 : 0,
        bearing: basemapStyle === '3d' ? 55 : 0,
        globeEnabled,
      })

      const map = mapLibreManager.getMap()
      if (map) {
        map.on('mousemove', (e) => {
          setCursorPos({ lat: parseFloat(e.lngLat.lat.toFixed(5)), lng: parseFloat(e.lngLat.lng.toFixed(5)) })
        })
        map.on('mouseout', () => setCursorPos(null))
      }

      mapInitialized.current = true
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      mapLibreManager.destroy()
      mapInitialized.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeEnabled])

  // Handle basemap style changes — re-add all layers after the new style loads
  useEffect(() => {
    if (prevBasemapStyle.current === basemapStyle) return
    prevBasemapStyle.current = basemapStyle

    const map = mapLibreManager.getMap()
    if (!map) return

    // Register callback to re-add layers after style loads
    mapLibreManager.onStyleChange(() => {
      const map = mapLibreManager.getMap()
      if (!map) return

      for (const layer of layers) {
        reAddLayer(layer, map)
      }
      prevLayerIds.current = layers.map((l) => l.id)
    })

    mapLibreManager.setBasemapStyle(basemapStyle)
  }, [basemapStyle]) // eslint-disable-line react-hooks/exhaustive-deps

  function syncLayers(map: maplibregl.Map) {
    const currentIds = layers.map((l) => l.id)
    const prev = prevLayerIds.current

    // Remove layers no longer in store
    for (const id of prev) {
      if (!currentIds.includes(id)) {
        if (map.getLayer(id)) map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      }
    }

    // Add new layers or update existing ones
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const mapLayer = map.getLayer(layer.id)

      if (!mapLayer) {
        reAddLayer(layer, map)
        continue
      }

      // Visibility — try layout property first, fall back to paint property for image sources
      const vis = layer.visible ? 'visible' : 'none'
      try {
        const currentVis = map.getLayoutProperty(layer.id, 'visibility')
        if (currentVis !== undefined && currentVis !== vis) {
          map.setLayoutProperty(layer.id, 'visibility', vis)
        } else if (currentVis === undefined) {
          // image sources may not have layout visibility; use paint opacity trick
          if (layer.type === 'raster') {
            map.setPaintProperty(layer.id, 'raster-opacity', layer.visible ? layer.opacity : 0)
          }
        }
      } catch {
        // fallback: toggle via opacity for image/raster sources
        if (layer.type === 'raster') {
          map.setPaintProperty(layer.id, 'raster-opacity', layer.visible ? layer.opacity : 0)
        }
      }

      // Opacity
      if (layer.visible) {
        try {
          const paintProp = mapLayer.type === 'raster' ? 'raster-opacity' : 'fill-opacity'
          const currentOpacity = map.getPaintProperty(layer.id, paintProp)
          if (currentOpacity !== undefined && currentOpacity !== layer.opacity) {
            map.setPaintProperty(layer.id, paintProp, layer.opacity)
          }
        } catch {
          // ignore
        }
      }

      // Z-order
      if (i > 0) {
        const belowId = layers[i - 1].id
        if (map.getLayer(belowId)) {
          try {
            map.moveLayer(layer.id, belowId)
          } catch {
            // layer may not be present yet
          }
        }
      }
    }

    prevLayerIds.current = currentIds
  }

  // Store-driven layer sync
  useEffect(() => {
    const map = mapLibreManager.getMap()
    if (!map) return

    if (!map.isStyleLoaded()) {
      // Style is mid-load (e.g. during a basemap switch) — retry once it finishes
      // instead of silently dropping this sync until the next `layers` change.
      // MapLibre can still report isStyleLoaded() === false for a moment right
      // after 'style.load' fires (sprite/glyph loading) — mirror the same
      // 300ms buffer mapLibreManager.setBasemapStyle() already uses for its
      // own post-style-load callback, rather than racing it.
      const onLoaded = () => setTimeout(() => syncLayers(map), 300)
      map.once('style.load', onLoaded)
      return () => {
        map.off('style.load', onLoaded)
      }
    }

    syncLayers(map)
  }, [layers]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map-canvas-wrapper">
      <div ref={mapContainer} className="map-canvas">
        <div className="map-overlay map-overlay-top-left">
          <BasemapPicker />
        </div>
        {cursorPos && (
          <div className="map-overlay map-overlay-bottom-left">
            <span className="map-coordinates">
              {cursorPos.lat.toFixed(5)}, {cursorPos.lng.toFixed(5)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
