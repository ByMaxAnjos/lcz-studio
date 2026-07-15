import React, { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { mapLibreManager } from '../map/MapLibreManager'
import './MapCanvas.css'

export const MapCanvas: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const { layers } = useStore()
  const mapInitialized = useRef(false)
  const prevLayerIds = useRef<string[]>([])

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current) return

    try {
      mapLibreManager.initialize({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [0, 20],
        zoom: 2,
      })

      mapInitialized.current = true
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      mapLibreManager.destroy()
      mapInitialized.current = false
    }
  }, [])

  // Store-driven layer sync (GeoLibre pattern: never mutate map directly from other components)
  useEffect(() => {
    const map = mapLibreManager.getMap()
    if (!map || !map.isStyleLoaded()) return

    const currentIds = layers.map((l) => l.id)
    const prev = prevLayerIds.current

    // Remove layers no longer in store
    for (const id of prev) {
      if (!currentIds.includes(id) && map.getLayer(id)) {
        map.removeLayer(id)
        if (map.getSource(id)) map.removeSource(id)
      }
    }

    // Update visibility, opacity, and z-order for existing layers
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const mapLayer = map.getLayer(layer.id)
      if (!mapLayer) continue

      // Visibility
      const vis = layer.visible ? 'visible' : 'none'
      if (map.getLayoutProperty(layer.id, 'visibility') !== vis) {
        map.setLayoutProperty(layer.id, 'visibility', vis)
      }

      // Opacity
      const paintProp = mapLayer.type === 'raster' ? 'raster-opacity' : 'fill-opacity'
      if (map.getPaintProperty(layer.id, paintProp) !== layer.opacity) {
        map.setPaintProperty(layer.id, paintProp, layer.opacity)
      }

      // Z-order: ensure layer is above the previous one
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
  }, [layers])

  return (
    <div className="map-canvas-wrapper">
      <div ref={mapContainer} className="map-canvas" />
    </div>
  )
}
