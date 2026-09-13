import { fromBlob, fromUrl } from 'geotiff'
import type { GeoTIFF } from 'geotiff'
import { readFile } from '@tauri-apps/plugin-fs'
import { getLCZColor } from '../utils/lczPalette'

export interface COGMetadata {
  width: number
  height: number
  bounds: [[number, number], [number, number]]
  crs: string
  bandCount: number
  noDataValue?: number
}

export interface GeoTIFFRenderOptions {
  /** LCZ classification rasters only: every value outside classes 1–17 is
   * treated as NoData. This makes NA borders transparent without changing the
   * source GeoTIFF used later by LCZ4py. */
  renderMode?: 'lcz'
}

async function openTiff(source: string | File | Uint8Array<ArrayBuffer> | ArrayBuffer): Promise<GeoTIFF> {
  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('blob:')) {
      return fromUrl(source)
    }

    const data = await readFile(source)
    return fromBlob(new Blob([data]))
  }

  if (source instanceof Uint8Array) {
    return fromBlob(new Blob([source]))
  }

  if (source instanceof ArrayBuffer) {
    return fromBlob(new Blob([source]))
  }

  return fromBlob(source)
}

export async function readCOGMetadata(source: string | File | Uint8Array<ArrayBuffer> | ArrayBuffer): Promise<COGMetadata> {
  const tiff = await openTiff(source)
  const image = await tiff.getImage()
  const bbox = image.getBoundingBox()
  const fd = image.getFileDirectory()

  return {
    width: image.getWidth(),
    height: image.getHeight(),
    bounds: [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]],
    ],
    crs: 'EPSG:4326',
    bandCount: image.getSamplesPerPixel(),
    noDataValue: fd?.GDAL_NODATA ? Number(fd.GDAL_NODATA) : undefined,
  }
}

export async function cogToImageData(
  source: string | File | Uint8Array<ArrayBuffer> | ArrayBuffer,
  maxWidth = 1024,
  maxHeight = 1024,
  options: GeoTIFFRenderOptions = {}
): Promise<{ imageData: ImageData; bounds: [[number, number], [number, number]]; width: number; height: number }> {
  const tiff = await openTiff(source)
  const image = await tiff.getImage()
  const bbox = image.getBoundingBox()
  const bounds: [[number, number], [number, number]] = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[3]],
  ]

  const origW = image.getWidth()
  const origH = image.getHeight()
  const scale = Math.min(1, maxWidth / origW, maxHeight / origH)
  const outW = Math.max(1, Math.round(origW * scale))
  const outH = Math.max(1, Math.round(origH * scale))

  const fd = image.getFileDirectory()
  const noData = fd?.GDAL_NODATA ? Number(fd.GDAL_NODATA) : undefined

  // Read via the top-level GeoTIFF (not the base image) so overview IFDs are used
  // when present — reading the full-resolution image directly can try to allocate
  // a buffer sized to the entire raster before downsampling, which fails outright
  // for large rasters (e.g. continental-scale LCZ maps).
  const rasters = await tiff.readRasters({ width: outW, height: outH })
  const band = rasters[0] as ArrayLike<number>

  const imageData = new ImageData(outW, outH)
  const px = imageData.data

  for (let i = 0; i < band.length; i++) {
    const rawValue = Number(band[i])
    const v = Math.round(rawValue)
    const pi = i * 4

    // LCZ source rasters encode NA inconsistently (0, 255, -9999 or NaN,
    // depending on the provider). For the map-get workflows, anything that
    // is not a valid LCZ class is background, never a grey data value.
    if (!Number.isFinite(rawValue) || (Number.isFinite(noData) && rawValue === noData) || (options.renderMode === 'lcz' && (v < 1 || v > 17))) {
      px[pi + 3] = 0
      continue
    }

    if (options.renderMode === 'lcz' || (v >= 1 && v <= 17)) {
      // LCZ classified raster — renderMode:'lcz' forces this branch (e.g. for
      // callers that already know the source is an LCZ map) instead of
      // relying solely on the value-range heuristic.
      const hex = getLCZColor(Math.min(17, Math.max(1, v)))
      px[pi] = parseInt(hex.slice(1, 3), 16)
      px[pi + 1] = parseInt(hex.slice(3, 5), 16)
      px[pi + 2] = parseInt(hex.slice(5, 7), 16)
      px[pi + 3] = 220
    } else if (v === 0) {
      px[pi + 3] = 0
    } else {
      // Generic single-band: grayscale
      const n = Math.min(255, Math.max(0, v))
      px[pi] = n
      px[pi + 1] = n
      px[pi + 2] = n
      px[pi + 3] = 200
    }
  }

  return { imageData, bounds, width: outW, height: outH }
}

export async function createCOGCanvas(
  source: string | File | Uint8Array<ArrayBuffer> | ArrayBuffer,
  maxWidth = 1024,
  maxHeight = 1024,
  options: GeoTIFFRenderOptions = {}
): Promise<{ canvas: HTMLCanvasElement; bounds: [[number, number], [number, number]] }> {
  const { imageData, bounds, width, height } = await cogToImageData(source, maxWidth, maxHeight, options)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return { canvas, bounds }
}

export async function addGeoTIFFToMap(
  source: string | File | Uint8Array<ArrayBuffer> | ArrayBuffer,
  layerId: string,
  map: maplibregl.Map,
  options: GeoTIFFRenderOptions = {}
): Promise<{ bounds: [[number, number], [number, number]] }> {
  const { canvas, bounds } = await createCOGCanvas(source, 1024, 1024, options)
  const dataUrl = canvas.toDataURL('image/png')

  const [[west, south], [east, north]] = bounds

  if (map.getLayer(layerId)) map.removeLayer(layerId)
  if (map.getSource(layerId)) map.removeSource(layerId)

  map.addSource(layerId, {
    type: 'image',
    url: dataUrl,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  } as any)

  map.addLayer({
    id: layerId,
    type: 'raster',
    source: layerId,
    paint: { 'raster-opacity': 0.85 },
  })

  return { bounds }
}
