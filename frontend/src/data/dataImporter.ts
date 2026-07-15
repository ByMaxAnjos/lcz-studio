import {
  initializeDuckDB,
  validateStationData,
  registerFileBuffer,
  dropFileBuffer,
  executeSQLQuery,
  ensureSpatial,
} from './duckdb'

export interface ImportResult {
  success: boolean
  data?: any[]
  geojson?: GeoJSON.FeatureCollection
  errors: string[]
  message: string
}

export async function importCSV(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV file must have at least a header and one data row'],
        message: 'Invalid CSV format',
      }
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const data: any[] = []

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: any = {}
      for (let j = 0; j < headers.length; j++) {
        const v = values[j]
        row[headers[j]] = v !== undefined && !isNaN(Number(v)) && v !== '' ? Number(v) : v
      }
      data.push(row)
    }

    const validation = await validateStationData(data)
    if (!validation.valid) {
      return { success: false, errors: validation.errors, message: 'Station data validation failed' }
    }

    return {
      success: true,
      data,
      errors: [],
      message: `Successfully imported ${data.length} records`,
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Failed to import CSV',
    }
  }
}

export async function importGeoJSON(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    const geojson = JSON.parse(text) as GeoJSON.FeatureCollection

    if (!geojson.features || !Array.isArray(geojson.features)) {
      return { success: false, errors: ['Invalid GeoJSON format'], message: 'GeoJSON must contain a features array' }
    }

    return {
      success: true,
      data: geojson.features,
      geojson,
      errors: [],
      message: `Successfully imported ${geojson.features.length} features`,
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Failed to import GeoJSON',
    }
  }
}

export async function importGeoPackage(file: File): Promise<ImportResult> {
  try {
    await initializeDuckDB()
    const hasSpatial = await ensureSpatial()
    if (!hasSpatial) {
      return {
        success: false,
        errors: ['DuckDB Spatial extension not available. Check network connection and try again.'],
        message: 'Spatial extension required for GeoPackage import',
      }
    }

    const buffer = new Uint8Array(await file.arrayBuffer())
    await registerFileBuffer(file.name, buffer)

    try {
      const rows = await executeSQLQuery(
        `SELECT ST_AsGeoJSON(geom) as __geom, * EXCLUDE geom FROM ST_Read('${file.name}')`
      )

      const features: GeoJSON.Feature[] = rows.map((row: any) => {
        const { __geom, ...props } = row
        return {
          type: 'Feature' as const,
          geometry: JSON.parse(__geom),
          properties: props,
        }
      })

      const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }

      return {
        success: true,
        data: features,
        geojson,
        errors: [],
        message: `Imported ${features.length} features from GeoPackage`,
      }
    } finally {
      await dropFileBuffer(file.name)
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Failed to import GeoPackage',
    }
  }
}

export async function importShapefile(file: File): Promise<ImportResult> {
  try {
    await initializeDuckDB()
    const hasSpatial = await ensureSpatial()
    if (!hasSpatial) {
      return {
        success: false,
        errors: ['DuckDB Spatial extension not available.'],
        message: 'Spatial extension required for Shapefile import',
      }
    }

    if (file.name.endsWith('.zip')) {
      // ZIP containing shapefile components
      const buffer = new Uint8Array(await file.arrayBuffer())
      const zipName = file.name
      await registerFileBuffer(zipName, buffer)

      try {
        const rows = await executeSQLQuery(
          `SELECT ST_AsGeoJSON(geom) as __geom, * EXCLUDE geom FROM ST_Read('/vsiz/${zipName}')`
        )
        const features: GeoJSON.Feature[] = rows.map((row: any) => {
          const { __geom, ...props } = row
          return { type: 'Feature' as const, geometry: JSON.parse(__geom), properties: props }
        })
        const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }
        return { success: true, data: features, geojson, errors: [], message: `Imported ${features.length} features` }
      } finally {
        await dropFileBuffer(zipName)
      }
    }

    return {
      success: false,
      errors: ['Please provide a ZIP file containing the .shp, .dbf, .shx, and .prj files.'],
      message: 'Upload a zipped shapefile (.zip)',
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Failed to import Shapefile',
    }
  }
}

export async function importGeoTIFF(file: File): Promise<ImportResult> {
  // GeoTIFF files are handled by cogHandler.ts for map rendering
  // Return metadata here
  return {
    success: true,
    data: [{ fileName: file.name, size: file.size, type: 'GeoTIFF/COG' }],
    errors: [],
    message: `GeoTIFF ready for map display: ${file.name}`,
  }
}

export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'csv':
      return importCSV(file)
    case 'geojson':
    case 'json':
      return importGeoJSON(file)
    case 'gpkg':
      return importGeoPackage(file)
    case 'shp':
      return importShapefile(file)
    case 'zip':
      return importShapefile(file)
    case 'tif':
    case 'tiff':
      return importGeoTIFF(file)
    default:
      return {
        success: false,
        errors: [`Unsupported file format: .${ext}`],
        message: 'Supported formats: CSV, GeoJSON, GeoPackage (.gpkg), Shapefile (.zip), GeoTIFF',
      }
  }
}
