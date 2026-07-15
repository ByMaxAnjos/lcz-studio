import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export interface MapConfig {
  container: HTMLElement
  style: string
  center: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
}

export class MapLibreManager {
  private map: maplibregl.Map | null = null

  initialize(config: MapConfig): maplibregl.Map {
    if (this.map) {
      return this.map
    }

    // Default OpenFreeMap style
    const style = config.style || 'https://tiles.openfreemap.org/styles/liberty'

    this.map = new maplibregl.Map({
      container: config.container,
      style: style,
      center: config.center || [0, 0],
      zoom: config.zoom || 2,
      pitch: config.pitch || 0,
      bearing: config.bearing || 0,
      attributionControl: { compact: false },
    })

    // Add default controls
    this.map.addControl(new maplibregl.NavigationControl())
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left')
    this.map.addControl(new maplibregl.FullscreenControl())
    this.map.addControl(new maplibregl.GeolocateControl({}))

    return this.map
  }

  getMap(): maplibregl.Map | null {
    return this.map
  }

  destroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }
}

export const mapLibreManager = new MapLibreManager()
