export type OutputKind = 'map' | 'plot' | 'table' | 'file'

const MAP_KEYS = new Set(['tiff_path', 'geojson_path'])
const PLOT_KEYS = new Set(['html_path', 'image_path', 'plot_path'])
const TABLE_KEYS = new Set(['csv_path'])
const FILE_KEYS = new Set(['file_path'])

export function detectOutputKinds(value: unknown): OutputKind[] {
  const kinds = new Set<OutputKind>()

  const visit = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') return
    if (Array.isArray(candidate)) {
      candidate.forEach(visit)
      return
    }

    const record = candidate as Record<string, unknown>
    for (const key of Object.keys(record)) {
      if (MAP_KEYS.has(key)) kinds.add('map')
      else if (PLOT_KEYS.has(key)) kinds.add('plot')
      else if (TABLE_KEYS.has(key)) kinds.add('table')
      else if (FILE_KEYS.has(key)) kinds.add('file')
    }

    for (const child of Object.values(record)) visit(child)
  }

  visit(value)
  return [...kinds]
}

export function preferredOutputView(value: unknown): 'map' | 'visualization' {
  const kinds = detectOutputKinds(value)
  return kinds.includes('map') ? 'map' : 'visualization'
}
