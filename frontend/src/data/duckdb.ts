import * as duckdb from '@duckdb/duckdb-wasm'

let db: duckdb.AsyncDuckDB | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null
let spatialLoaded = false

export async function initializeDuckDB(): Promise<void> {
  if (db && conn) return

  try {
    const bundles = duckdb.getJsDelivrBundles()
    const bundle = await duckdb.selectBundle(bundles)
    const logger = new duckdb.ConsoleLogger()
    const worker = await duckdb.createWorker(bundle.mainWorker!)
    db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)

    conn = await db.connect()

    // Try to load spatial extension (requires network on first use)
    if (!spatialLoaded) {
      try {
        await conn.query("INSTALL spatial")
        await conn.query("LOAD spatial")
        spatialLoaded = true
      } catch {
        console.warn('DuckDB Spatial extension not loaded — GeoPackage/Shapefile import unavailable')
      }
    }
  } catch (error) {
    console.error('Error initializing DuckDB:', error)
    throw error
  }
}

export async function ensureSpatial(): Promise<boolean> {
  if (spatialLoaded) return true
  if (!conn) await initializeDuckDB()
  try {
    await conn!.query("LOAD spatial")
    spatialLoaded = true
    return true
  } catch {
    return false
  }
}

export async function registerFileBuffer(name: string, buffer: Uint8Array): Promise<void> {
  if (!db) await initializeDuckDB()
  await db!.registerFileBuffer(name, buffer)
}

export async function dropFileBuffer(name: string): Promise<void> {
  if (!db) return
  try {
    await db.dropFile(name)
  } catch {
    // Ignore — file may not exist
  }
}

export async function executeSQLQuery(sql: string): Promise<any[]> {
  if (!conn) await initializeDuckDB()
  try {
    const result = await conn!.query(sql)
    return result.toArray().map((row: any) => row.toJSON())
  } catch (error) {
    console.error('Error executing SQL query:', error)
    throw error
  }
}

export async function loadCSV(name: string, csvText: string): Promise<void> {
  if (!conn) await initializeDuckDB()
  // Use registerFileText for in-memory CSV
  await db!.registerFileText(`${name}.csv`, csvText)
  try {
    await conn!.query(`DROP TABLE IF EXISTS "${name}"`)
    await conn!.query(`CREATE TABLE "${name}" AS SELECT * FROM read_csv_auto('${name}.csv')`)
  } catch (error) {
    console.error('Error loading CSV:', error)
    throw error
  }
}

export async function loadGeoJSON(name: string, geojson: GeoJSON.FeatureCollection): Promise<void> {
  if (!conn) await initializeDuckDB()

  try {
    const features = geojson.features
    if (features.length === 0) return

    const rows = features.map((f: any) => ({
      id: f.id ?? null,
      geometry: JSON.stringify(f.geometry),
      ...f.properties,
    }))

    await conn!.query(`DROP TABLE IF EXISTS "${name}"`)
    const jsonText = JSON.stringify(rows)
    await db!.registerFileText(`${name}_tmp.json`, jsonText)
    await conn!.query(`CREATE TABLE "${name}" AS SELECT * FROM read_json_auto('${name}_tmp.json')`)
    await db!.dropFile(`${name}_tmp.json`)
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
    throw error
  }
}

export async function validateStationData(data: any[]): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  const required = ['date', 'station', 'var', 'lat', 'lon']

  if (data.length === 0) {
    errors.push('Data is empty')
    return { valid: false, errors }
  }

  const firstRow = data[0]
  for (const col of required) {
    if (!(col in firstRow)) errors.push(`Missing required column: ${col}`)
  }

  for (const row of data.slice(0, 10)) {
    if (!row.date) errors.push('Invalid date value')
    if (typeof row.lat !== 'number' || typeof row.lon !== 'number') {
      errors.push('Invalid latitude or longitude')
    }
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] }
}

export async function querySpatialData(
  table: string,
  bounds: [[number, number], [number, number]]
): Promise<any[]> {
  if (!conn) await initializeDuckDB()
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const result = await conn!.query(`
    SELECT * FROM "${table}"
    WHERE lon >= ${minLon} AND lon <= ${maxLon}
    AND lat >= ${minLat} AND lat <= ${maxLat}
  `)
  return result.toArray().map((row: any) => row.toJSON())
}

export async function aggregateByLCZ(
  table: string,
  lczColumn: string,
  valueColumn: string,
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'avg'
): Promise<any[]> {
  if (!conn) await initializeDuckDB()
  const result = await conn!.query(`
    SELECT ${lczColumn}, ${aggregation}(${valueColumn}) as value
    FROM "${table}"
    GROUP BY ${lczColumn}
    ORDER BY ${lczColumn}
  `)
  return result.toArray().map((row: any) => row.toJSON())
}

export async function closeDuckDB(): Promise<void> {
  if (conn) { await conn.close(); conn = null }
  if (db) { await db.terminate(); db = null }
  spatialLoaded = false
}
