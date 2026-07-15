import { fromBlob, fromUrl } from 'geotiff'
import type { GeoTIFF } from 'geotiff'
import { getLCZColor } from '../utils/lczPalette'

export interface COGMetadata {
  width: number
  height: number
  bounds: [[number, number], [number, number]]
  crs: string
  bandCount: number
  noDataValue?: number
}

async function openTiff(source: string | File): Promise<GeoTIFF> {
  if (typeof source === 'string') {
    return fromUrl(source)
  }
  return fromBlob(source)
}

export async function readCOGMetadata(source: string | File): Promise<COGMetadata> {
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
  source: string | File,
  maxWidth = 1024,
  maxHeight = 1024
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

  const rasters = await image.readRasters({ width: outW, height: outH })
  const band = rasters[0] as ArrayLike<number>

  const imageData = new ImageData(outW, outH)
  const px = imageData.data

  for (let i = 0; i < band.length; i++) {
    const v = Math.round(band[i])
    const pi = i * 4

    if (noData !== undefined && v === noData) {
      px[pi + 3] = 0
      continue
    }

    if (v >= 1 && v <= 17) {
      // LCZ classified raster
      const hex = getLCZColor(v)
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
  source: string | File,
  maxWidth = 1024,
  maxHeight = 1024
): Promise<{ canvas: HTMLCanvasElement; bounds: [[number, number], [number, number]] }> {
  const { imageData, bounds, width, height } = await cogToImageData(source, maxWidth, maxHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return { canvas, bounds }
}

export async function addGeoTIFFToMap(
  source: string | File,
  layerId: string,
  map: maplibregl.Map
): Promise<{ bounds: [[number, number], [number, number]] }> {
  const { canvas, bounds } = await createCOGCanvas(source)
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
