import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// OpenFreeMap styles - https://openfreemap.org
export const BASEMAP_STYLE_URLS = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  fiord: 'https://tiles.openfreemap.org/styles/fiord',
} as const

export type BasemapStyleId = keyof typeof BASEMAP_STYLE_URLS | '3d'

export const BASEMAP_STYLE_IDS: BasemapStyleId[] = ['positron', 'liberty', 'bright', 'dark', 'fiord', '3d']

export const BASEMAP_STYLE_INFO: Record<BasemapStyleId, { label: string; description: string }> = {
  positron: { label: 'Positron', description: 'Light, minimal style for data visualization' },
  liberty: { label: 'Liberty', description: 'Standard map with full details' },
  bright: { label: 'Bright', description: 'Bright and colorful style' },
  dark: { label: 'Dark', description: 'Dark theme for low-light environments' },
  fiord: { label: 'Fiord', description: 'Blue-toned dark style' },
  '3d': { label: '3D', description: 'Tilted perspective view (Liberty base)' },
}

export function resolveBasemapStyleUrl(id: BasemapStyleId): string {
  return BASEMAP_STYLE_URLS[id === '3d' ? 'liberty' : id]
}

export interface MapConfig {
  container: HTMLElement
  style: string | maplibregl.StyleSpecification
  center: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
  globeEnabled?: boolean
}

export class MapLibreManager {
  private map: maplibregl.Map | null = null
  private styleChangeCallback: (() => void) | null = null

  initialize(config: MapConfig): maplibregl.Map {
    if (this.map) {
      return this.map
    }

    const style = config.style || BASEMAP_STYLE_URLS.positron

    this.map = new maplibregl.Map({
      container: config.container,
      style: style,
      center: config.center || [0, 0],
      zoom: config.zoom || 2,
      pitch: config.pitch || 0,
      bearing: config.bearing || 0,
      attributionControl: false,
    })

    // Navigation controls (zoom, compass, pitch)
    this.map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
    }), 'top-right')

    // Fullscreen
    this.map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    // Geolocation
    this.map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }), 'top-right')

    // Attribution - bottom right, full text
    this.map.addControl(new maplibregl.AttributionControl({
      compact: false,
    }), 'bottom-right')

    if (config.globeEnabled) {
      this.map.on('load', () => {
        ;(this.map as maplibregl.Map & { setProjection?: (projection: { name: string }) => void }).setProjection?.({ name: 'globe' })
      })
    }
    return this.map
  }

  getMap(): maplibregl.Map | null {
    return this.map
  }

  /** Register a callback that fires after a basemap style change. */
  onStyleChange(callback: () => void): void {
    this.styleChangeCallback = callback
  }

  setBasemapStyle(id: BasemapStyleId): void {
    if (!this.map) return

    const is3d = id === '3d'
    const styleUrl = resolveBasemapStyleUrl(id)

    console.log('[MapLibreManager] Changing style to:', id, styleUrl)

    // Apply 3D settings
    this.map.dragRotate[is3d ? 'enable' : 'disable']()

    // Register the listener BEFORE calling setStyle to avoid a race condition.
    // NOTE: 'style.load' never fires here on setStyle() with maplibre-gl 4.7.1
    // (confirmed empirically — only the initial map construction's style load
    // triggers it); 'idle' reliably fires once after the new style, its
    // sources, and a first frame are ready, both on init and after setStyle().
    this.map.once('idle', () => {
      setTimeout(() => {
        this.styleChangeCallback?.()
      }, 300)
    })

    // Now change the style
    this.map.setStyle(styleUrl)

    // Apply 3D camera settings
    if (is3d) {
      setTimeout(() => {
        this.map?.easeTo({ pitch: 60, bearing: 55, duration: 500 })
      }, 200)
    } else {
      this.map.easeTo({ pitch: 0, bearing: 0, duration: 500 })
    }
  }

  destroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    this.styleChangeCallback = null
  }
}

export const mapLibreManager = new MapLibreManager()
