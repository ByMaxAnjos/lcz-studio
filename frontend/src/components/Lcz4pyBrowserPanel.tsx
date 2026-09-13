import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { mapLibreManager } from '../map/MapLibreManager'
import { addGeoTIFFToMap } from '../map/cogHandler'
import { getTranslation, Language } from '../i18n/translations'
import { getFunctionGuide, humanize } from '../utils/functionGuide'
import { getParamHelp } from '../utils/paramHelp'
import { preferredOutputView } from '../utils/resultOutputs'
import * as R from '../services/rService'
import type {
  Lcz4pyExecution,
  Lcz4pyFunctionMeta,
  Lcz4pyParam,
  Lcz4pyResult,
  PublicationStyle,
} from '../services/rService'
import './Lcz4pyBrowserPanel.css'

type CatalogCategory = 'general' | 'local'
type InputMode = 'map' | 'dataset' | 'file' | 'result'

interface Lcz4pyBrowserPanelProps {
  category: CatalogCategory
  /** Restrict the catalog to a single backend-computed group (e.g. "Map",
   *  "Parameters", "Satellite data") — used by scoped Sidebar tools. Omit
   *  to show every function in the category. */
  groupFilter?: string
  /** Restrict to an explicit allowlist of function ids — for a tool that
   *  needs only part of a group (e.g. one function out of "Thermal & UHI"). */
  functionIds?: string[]
  /** Heading override for a scoped tool. Falls back to the generic
   *  General/Local Functions heading when omitted. */
  title?: string
  description?: string
  onRunComplete?: (result: Lcz4pyResult) => void
}

interface ResultOption {
  id: string
  label: string
  functionName: string
}

const ESSENTIAL_PARAMS = new Set([
  'city', 'source', 'collection', 'start_date', 'end_date', 'years', 'months',
  'var', 'station_id', 'method', 'plot_type', 'iselect', 'variable_name',
  'pollutants', 'degree_type', 'base_temp', 'output', 'style',
  'add_scalebar', 'add_north_arrow',
])

const HIDDEN_ADVANCED_PARAMS = new Set([
  'max_pixels',
  'data_type',
  'band',
  'colorscale',
  'isave',
  'use_webgl',
  'use_geoarrow',
  'use_duckdb',
])

const GENERAL_MAP_INPUT_FUNCTIONS = new Set([
  'lcz_cal_area',
  'lcz_cal_indices',
  'lcz_cal_indexes',
  'lcz_get_indices',
  'lcz_get_lst',
  'lcz_get_parameters',
  'lcz_get_planetary_computer',
  'lcz_get_ucp',
  'lcz_grid_chirps',
  'lcz_grid_era5',
  'lcz_grid_era5_global',
  'lcz_grid_pdsi',
  'lcz_grid_pollution_ghap',
  'lcz_grid_pollution_merra2',
  'lcz_list_pc_assets',
  'lcz_plot_map',
  'plot_lcz_relationship',
])

const PUBLICATION_PARAM_NAMES = new Set(['style', 'add_scalebar', 'add_north_arrow'])

const SAVE_EXTENSION_OPTIONS: Record<string, string[]> = {
  lcz_plot_map: ['html', 'png', 'pdf'],
  lcz_cal_area: ['html', 'png', 'pdf', 'svg', 'tiff'],
  lcz_plot_parameters: ['html', 'png', 'pdf', 'svg', 'tiff'],
  lcz_cal_indices: ['html', 'png', 'pdf'],
  lcz_cal_indexes: ['html', 'png', 'pdf'],
  lcz_plot_interp: ['html', 'png', 'pdf'],
  lcz_anomaly: ['html', 'png', 'pdf'],
  lcz_ts: ['html', 'png', 'pdf'],
  lcz_uhi_intensity: ['html', 'png', 'pdf'],
  lcz_uhi_surface: ['html', 'png', 'pdf'],
  lcz_variogram: ['html', 'png', 'pdf'],
  lcz_degree_hours: ['html', 'png', 'pdf'],
}

function exportFormatDescription(extension: string, t: (key: Parameters<typeof getTranslation>[1]) => string): string {
  const normalized = extension.toLowerCase().replace(/^\./, '')
  if (['html', 'htm'].includes(normalized)) return t('exportFormatHtml')
  if (['png', 'jpg', 'jpeg'].includes(normalized)) return t('exportFormatPng')
  if (normalized === 'pdf') return t('exportFormatPdf')
  if (normalized === 'svg') return t('exportFormatSvg')
  if (['tif', 'tiff', 'geotiff'].includes(normalized)) return t('exportFormatTiff')
  if (normalized === 'csv') return t('exportFormatCsv')
  return t('resultGeneratedFile')
}

const MORPHOLOGY_PARAMETERS = [
  ['svf_mean', 'Sky view factor'], ['aspect_mean', 'Aspect ratio'],
  ['BSF_mean', 'Building surface fraction'], ['ISF_mean', 'Impervious surface fraction'],
  ['PSF_mean', 'Pervious surface fraction'], ['TSF_mean', 'Tree surface fraction'],
  ['HRE_mean', 'Height of roughness elements'], ['TRC_mean', 'Terrain roughness class'],
  ['SAD_mean', 'Surface admittance'], ['SAL_mean', 'Surface albedo'],
  ['AH_mean', 'Anthropogenic heat'], ['z0', 'Roughness length'],
] as const

const UCP_PARAMETERS = [
  ['elevation', 'Elevation'], ['frc_esa', 'Building fraction'], ['hgt', 'Building height'],
  ['lb', 'Building length'], ['lc', 'Building coverage'], ['lf', 'Land fraction'],
  ['lp', 'Building perimeter'], ['urban_frc', 'Urban fraction'], ['cglc', 'LCZ classification'],
  ['tree', 'Tree cover'], ['urban', 'Impervious surface'],
  ['lf_0', 'Land fraction · 0°'], ['lf_45', 'Land fraction · 45°'], ['lf_90', 'Land fraction · 90°'], ['lf_135', 'Land fraction · 135°'],
  ['hi_45', 'Height index · 45°'], ['hi_90', 'Height index · 90°'],
  ['zdm_0', 'Zero-plane displacement · 0°'], ['zdr_0', 'Roughness length · 0°'], ['zom_0', 'Momentum roughness · 0°'], ['zor_0', 'Thermal roughness · 0°'],
] as const

function isExecution(value: unknown): value is Lcz4pyExecution {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Lcz4pyExecution>
  return typeof candidate.resultId === 'string' && Boolean(candidate.result)
}

function prefersCurrentMap(fn: Lcz4pyFunctionMeta, param: Lcz4pyParam): boolean {
  if (param.name === 'lcz_map' || param.name === 'lcz_path') return true
  if (param.name !== 'x') return false
  if (fn.category === 'local') return fn.id !== 'lcz_plot_interp'
  return GENERAL_MAP_INPUT_FUNCTIONS.has(fn.id)
}

function preferredValueForParam(fn: Lcz4pyFunctionMeta, param: Lcz4pyParam): unknown {
  if (fn.id === 'lcz_get_map' || fn.id === 'lcz_plot_map') {
    if (param.name === 'save_extension') return 'html'
  }
  if (fn.id === 'lcz_plot_map') {
    if (param.name === 'renderer') return 'maplibre'
    if (param.name === 'isave') return true
  }
  if (param.name === 'save_extension') return 'html'
  return undefined
}

function needsIntermediateResult(param: Lcz4pyParam): boolean {
  const annotation = param.annotation ?? ''
  return /LCZ(?:Grid|Indices|PC|LST)Result/.test(annotation) || param.name === 'grid_result'
}

function formatFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

// Dataclass field names LCZ4py functions return alongside a chart+table, e.g.
// LCZAreaResult(df, fig, geoarrow_table). humanize() alone turns these into
// blunt labels like "Df"/"Fig" — this gives the common ones a real name and
// puts the chart before the table, since that's what people scan for first.
const RESULT_FIELD_LABEL_KEYS: Record<string, string> = {
  df: 'resultTable',
  fig: 'resultChart',
  table: 'resultTable',
  stats: 'resultTable',
  data: 'resultTable',
}

function resultFieldOrder(key: string): number {
  if (/fig|plot|chart|map$/i.test(key)) return 0
  if (/df|table|stats|data|csv/i.test(key)) return 1
  return 2
}

function isUnsupportedResultField(child: unknown): boolean {
  if (!child || typeof child !== 'object') return false
  const record = child as Record<string, unknown>
  return typeof record.note === 'string' && record.note.startsWith('Unsupported') && 'value' in record
}

function resultString(result: Lcz4pyResult | null, key: string): string | null {
  const value = result?.[key]
  return typeof value === 'string' && value ? value : null
}

function Icon({ name }: { name: 'back' | 'help' | 'run' | 'upload' | 'map' | 'data' | 'result' | 'download' | 'arrow' | 'fullscreen' | 'close' }) {
  const paths: Record<typeof name, React.ReactNode> = {
    back: <path d="M15 18l-6-6 6-6" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4" /><path d="M12 18h.01" /></>,
    run: <path d="m8 5 11 7-11 7V5Z" />,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    data: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
    result: <><path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M14 3v6h6M8 14h8M8 18h5" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    fullscreen: <><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  }
  return <svg className="lcz-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

type ExportArtifact = {
  key: string
  path: string
  format: string
  label: string
  mapKind?: 'raster' | 'geojson'
}

const EXPORT_FIELDS: Record<string, Omit<ExportArtifact, 'key' | 'path'>> = {
  tiff_path: { format: 'GeoTIFF', label: 'GeoTIFF raster', mapKind: 'raster' },
  geojson_path: { format: 'GeoJSON', label: 'GeoJSON vector', mapKind: 'geojson' },
  csv_path: { format: 'CSV', label: 'CSV table' },
  html_path: { format: 'HTML', label: 'Interactive plot' },
  plot_path: { format: 'Plot', label: 'Plot file' },
  image_path: { format: 'PNG', label: 'Image' },
  png_path: { format: 'PNG', label: 'Image' },
  pdf_path: { format: 'PDF', label: 'Document' },
  svg_path: { format: 'SVG', label: 'Vector graphic' },
  xlsx_path: { format: 'XLSX', label: 'Spreadsheet' },
  parquet_path: { format: 'Parquet', label: 'Columnar table' },
  file_path: { format: 'File', label: 'Generated file' },
}

function getExportArtifacts(result: Lcz4pyResult): ExportArtifact[] {
  const paths = new Set<string>()
  return Object.entries(result).flatMap(([key, value]) => {
    const definition = EXPORT_FIELDS[key]
    if (!definition || typeof value !== 'string' || !value || paths.has(value)) return []
    paths.add(value)
    const extension = value.split('.').pop()?.toUpperCase()
    return [{ key, path: value, ...definition, format: definition.format === 'File' && extension ? extension : definition.format }]
  })
}

function ResultPreview({ path, type, title, t }: { path: string; type: 'html' | 'image'; title: string; t: (key: Parameters<typeof getTranslation>[1]) => string }) {
  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => {
    if (!fullscreen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [fullscreen])
  const preview = type === 'html'
    ? <iframe title={title} src={R.filePathToUrl(path)} sandbox="allow-scripts allow-same-origin" />
    : <img src={R.filePathToUrl(path)} alt={title} />

  return (
    <>
      <div className={`result-preview result-preview-${type}`}>
        {preview}
        <button type="button" className="result-fullscreen-button" onClick={() => setFullscreen(true)} aria-label={t('resultFullscreen')} title={t('resultFullscreen')}>
          <Icon name="fullscreen" />
        </button>
      </div>
      {fullscreen && (
        <div className="result-fullscreen" role="dialog" aria-modal="true" aria-label={title}>
          <div className="result-fullscreen-bar">
            <strong>{title}</strong>
            <button type="button" onClick={() => setFullscreen(false)} aria-label={t('resultClose')} title={t('resultClose')}><Icon name="close" /></button>
          </div>
          <div className={`result-fullscreen-content result-preview-${type}`}>{preview}</div>
        </div>
      )}
    </>
  )
}

function ResultExports({ artifacts, onAddLayer, allowAddLayer, t }: { artifacts: ExportArtifact[]; onAddLayer: (path: string, kind: 'raster' | 'geojson') => void; allowAddLayer: boolean; t: (key: Parameters<typeof getTranslation>[1]) => string }) {
  if (!artifacts.length) return null
  return (
    <section className="result-exports" aria-label={t('resultExports')}>
      <div className="result-exports-heading"><strong>{t('resultExports')}</strong><span>{artifacts.length}</span></div>
      <div className="result-export-list">
        {artifacts.map((artifact) => (
          <div key={`${artifact.key}-${artifact.path}`} className="result-export-item">
            <div><strong>{artifact.format}</strong><span title={artifact.path}>{artifact.label}</span></div>
            <div className="result-export-actions">
              <a className="artifact-action secondary" href={R.filePathToUrl(artifact.path)} download><Icon name="download" /> {t('resultDownload')}</a>
              {allowAddLayer && artifact.mapKind && <button className="artifact-action" onClick={() => onAddLayer(artifact.path, artifact.mapKind!)}><Icon name="map" /> {t('resultAddToMap')}</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export const ResultView: React.FC<{
  value: unknown
  onAddLayer: (path: string, kind: 'raster' | 'geojson') => void
  allowAddLayer?: boolean
  previewVisualOnly?: boolean
  language?: Language
}> = ({ value, onAddLayer, allowAddLayer = true, previewVisualOnly = false, language = 'en' }) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  if (value == null) return null

  if (Array.isArray(value)) {
    return (
      <div className="result-array">
        {value.map((item, index) => (
          <ResultView
            key={index}
            value={item}
            onAddLayer={onAddLayer}
            allowAddLayer={allowAddLayer}
            previewVisualOnly={previewVisualOnly}
            language={language}
          />
        ))}
      </div>
    )
  }

  if (typeof value !== 'object') return <span className="result-value">{String(value)}</span>

  const result = value as Lcz4pyResult
  const artifacts = getExportArtifacts(result)
  const previewArtifact = artifacts.find((artifact) => artifact.key === 'html_path' || artifact.key === 'plot_path')
    ?? artifacts.find((artifact) => artifact.key === 'image_path' || artifact.key === 'png_path')
  const nonArtifactEntries = Object.entries(result).filter(([key]) => !EXPORT_FIELDS[key])

  if (artifacts.length > 0) {
    const previewType = previewArtifact?.key === 'html_path' || previewArtifact?.key === 'plot_path' ? 'html' : 'image'
    return (
      <div className="result-output">
        {previewArtifact && <ResultPreview path={previewArtifact.path} type={previewType} title={`${t('resultPreview')} · ${formatFileName(previewArtifact.path)}`} t={t} />}
        <ResultExports artifacts={artifacts} onAddLayer={onAddLayer} allowAddLayer={allowAddLayer} t={t} />
        {!previewVisualOnly && nonArtifactEntries.length > 0 && (
          <div className="result-group">
            {nonArtifactEntries.map(([key, child]) => (
              <div key={key} className="result-field"><span className="result-field-label">{RESULT_FIELD_LABEL_KEYS[key] ? t(RESULT_FIELD_LABEL_KEYS[key] as any) : humanize(key)}</span><ResultView value={child} onAddLayer={onAddLayer} allowAddLayer={allowAddLayer} language={language} /></div>
            ))}
          </div>
        )}
      </div>
    )
  }
  if ('value' in result) {
    const rendered = result.value
    return typeof rendered === 'object'
      ? <pre className="result-code">{JSON.stringify(rendered, null, 2)}</pre>
      : <p className="result-value">{String(rendered)}</p>
  }
  if ('note' in result && Object.keys(result).length === 1) {
    return <p className="field-hint">{String(result.note)}</p>
  }

  const fields = Object.entries(result)
    .filter(([, child]) => !isUnsupportedResultField(child))
    .sort(([a], [b]) => resultFieldOrder(a) - resultFieldOrder(b))

  return (
    <div className="result-group">
      {fields.map(([key, child]) => (
        <div key={key} className="result-field">
          <span className="result-field-label">
            {RESULT_FIELD_LABEL_KEYS[key] ? t(RESULT_FIELD_LABEL_KEYS[key] as any) : humanize(key)}
          </span>
          <ResultView value={child} onAddLayer={onAddLayer} allowAddLayer={allowAddLayer} language={language} />
        </div>
      ))}
    </div>
  )
}

export const Lcz4pyBrowserPanel: React.FC<Lcz4pyBrowserPanelProps> = ({ category, groupFilter, functionIds, title, description, onRunComplete }) => {
  const {
    language,
    rRunning,
    lczMapPath,
    layers,
    stationData,
    stationFile,
    activeJobs,
    addLayer,
    setLczMapPath,
  } = useStore()
  const resolvedLczMapPath = useMemo(() => {
    if (!lczMapPath) return null
    // Older projects stored only the display filename. Prefer the layer's
    // sidecar-readable source path whenever it is available.
    const matchingLayer = layers.find((layer) =>
      layer.name === lczMapPath ||
      layer.sourceFile === lczMapPath ||
      layer.analysisSourceFile === lczMapPath
    )
    return matchingLayer?.analysisSourceFile ?? matchingLayer?.sourceFile ?? lczMapPath
  }, [layers, lczMapPath])
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const publicationStyleLabels: Record<PublicationStyle, string> = {
    default: t('publicationStyle_default'),
    nature: t('publicationStyle_nature'),
    science: t('publicationStyle_science'),
    generic_bw: t('publicationStyle_generic_bw'),
  }

  const [catalog, setCatalog] = useState<Lcz4pyFunctionMeta[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Lcz4pyFunctionMeta | null>(null)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [inputModes, setInputModes] = useState<Record<string, InputMode>>({})
  const [fileLabels, setFileLabels] = useState<Record<string, string>>({})
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showFunctionHelp, setShowFunctionHelp] = useState(false)
  const [openFieldHelp, setOpenFieldHelp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Lcz4pyResult | null>(null)
  const [lastExecution, setLastExecution] = useState<Lcz4pyExecution | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [parameterSearch, setParameterSearch] = useState('')

  useEffect(() => {
    if (!rRunning) return
    R.fetchLcz4pyCatalog()
      .then((functions) => {
        setCatalog(functions)
        setCatalogError(null)
      })
      .catch((caught) => setCatalogError(caught instanceof Error ? caught.message : String(caught)))
  }, [rRunning])

  const resultOptions = useMemo<ResultOption[]>(() => (
    activeJobs
      .filter((job) => job.status === 'done' && isExecution(job.result))
      .map((job) => {
        const execution = job.result as Lcz4pyExecution
        return { id: execution.resultId, label: job.label, functionName: job.fn }
      })
      .reverse()
  ), [activeJobs])

  const selectedGuide = selected ? getFunctionGuide(selected.id) : null
  const scopedHeading = title ?? (selected ? selected.group : undefined)

  const functions = useMemo(() => {
    return catalog.filter((fn) => {
      if (fn.category !== category) return false
      if (groupFilter && fn.group !== groupFilter) return false
      if (functionIds && !functionIds.includes(fn.id)) return false
      return true
    })
  }, [catalog, category, groupFilter, functionIds])

  const grouped = useMemo(() => {
    const groups = new Map<string, Lcz4pyFunctionMeta[]>()
    for (const fn of functions) {
      if (!groups.has(fn.group)) groups.set(fn.group, [])
      groups.get(fn.group)!.push(fn)
    }
    return groups
  }, [functions])
  const isScopedCatalog = Boolean(title || description || groupFilter || functionIds?.length)

  // Single-function tools open straight into the form (less click friction).
  useEffect(() => {
    if (selected || functions.length !== 1) return
    if (!isScopedCatalog) return
    selectFunction(functions[0])
    // selectFunction is stable enough for this one-shot open; omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functions, isScopedCatalog, selected])

  const selectFunction = (
    fn: Lcz4pyFunctionMeta,
    valueOverrides: Record<string, unknown> = {},
    modeOverrides: Record<string, InputMode> = {}
  ) => {
    const defaults: Record<string, unknown> = {}
    const modes: Record<string, InputMode> = {}
    for (const param of fn.params) {
      if (param.name === 'lang') continue
      if (param.has_default && param.default != null) defaults[param.name] = param.default
      const preferred = preferredValueForParam(fn, param)
      if (preferred !== undefined) defaults[param.name] = preferred
      if (param.name === 'style') defaults[param.name] = 'default'
      if (param.name === 'add_scalebar' || param.name === 'add_north_arrow') defaults[param.name] = true
      // ponytail: use_geoarrow=True crashes on the currently-published LCZ4py
      // wheel (raster_to_geoarrow builds a GeoDataFrame with a serialized
      // dict instead of a shapely geometry — already fixed upstream, not yet
      // republished). Default it off here until the wheel catches up.
      if (param.name === 'use_geoarrow') defaults[param.name] = false
      if (param.kind === 'resource') {
        if (prefersCurrentMap(fn, param) && resolvedLczMapPath) modes[param.name] = 'map'
        else if (needsIntermediateResult(param) && resultOptions.length > 0) {
          modes[param.name] = 'result'
          defaults[param.name] = resultOptions[0].id
        } else modes[param.name] = 'file'
      }
      if (param.kind === 'dataframe') {
        modes[param.name] = stationData ? 'dataset' : 'file'
        if (stationFile) defaults[param.name] = stationFile
      }
    }
    Object.assign(defaults, valueOverrides)
    Object.assign(modes, modeOverrides)
    setSelected(fn)
    setFormValues(defaults)
    setInputModes(modes)
    setFileLabels({})
    setAdvancedOpen(false)
    setShowFunctionHelp(false)
    setOpenFieldHelp(null)
    setResult(null)
    setLastExecution(null)
    setPreviewMode(false)
    setError(null)
    setParameterSearch('')
  }

  const openPlotParameters = () => {
    const plotFn = catalog.find((fn) => fn.id === 'lcz_plot_parameters')
    const resultId = lastExecution?.resultId ?? resultOptions.find((option) => option.functionName === 'lcz_get_parameters')?.id
    if (!plotFn || !resultId) return
    selectFunction(
      plotFn,
      { x: resultId, iselect: [MORPHOLOGY_PARAMETERS[0][0]] },
      { x: 'result' }
    )
  }

  const setField = (name: string, value: unknown) => {
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  const setMode = (param: Lcz4pyParam, mode: InputMode) => {
    setInputModes((current) => ({ ...current, [param.name]: mode }))
    if (mode === 'result' && !formValues[param.name] && resultOptions[0]) {
      setField(param.name, resultOptions[0].id)
    }
  }

  const uploadForParam = async (param: Lcz4pyParam, file?: File) => {
    if (!file) return
    setError(null)
    setUploadingField(param.name)
    try {
      const path = await R.uploadFile(file)
      setField(param.name, path)
      setFileLabels((current) => ({ ...current, [param.name]: file.name }))
      setMode(param, 'file')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setUploadingField(null)
    }
  }

  const resolveParamValue = (param: Lcz4pyParam): unknown => {
    if (param.name === 'lang') return language
    const mode = inputModes[param.name]
    const isPlotParametersX = selected?.id === 'lcz_plot_parameters' && param.name === 'x'
    if (param.kind === 'resource' || isPlotParametersX) {
      if (mode === 'map') return resolvedLczMapPath
      if (mode === 'result') {
        const resultId = formValues[param.name]
        return resultId ? { __lcz_result_id: resultId } : undefined
      }
    }
    if (param.kind === 'dataframe') {
      if (mode === 'dataset') return stationData
      if (mode === 'result') {
        const resultId = formValues[param.name]
        return resultId ? { __lcz_result_id: resultId } : undefined
      }
    }
    const value = formValues[param.name]
    if (param.kind === 'json' && !isPlotParametersX && typeof value === 'string' && value.trim()) {
      try {
        return JSON.parse(value)
      } catch {
        throw new Error(`${humanize(param.name)}: ${t('invalidJson')}`)
      }
    }
    return value
  }

  const run = async () => {
    if (!selected) return
    setError(null)
    setResult(null)
    setLastExecution(null)
    setPreviewMode(false)

    try {
      const params: Record<string, unknown> = {}
      for (const param of selected.params) {
        const value = resolveParamValue(param)
        const missing = value == null || value === '' || (Array.isArray(value) && value.length === 0)
        if (param.required && missing) throw new Error(`${humanize(param.name)} ${t('isRequired')}`)
        if (!missing) params[param.name] = value
      }

      if (['lcz_get_map', 'lcz_get_map_euro', 'lcz_get_map_usa'].includes(selected.id) && !params.city && !params.roi) {
        throw new Error(t('cityOrRoiRequired'))
      }
      if (selected.id === 'lcz_get_ucp' && (!Array.isArray(params.variables) || params.variables.length === 0)) {
        throw new Error(t('selectUcpVariableRequired'))
      }
      if (selected.id === 'lcz_plot_parameters' && (!Array.isArray(params.iselect) || params.iselect.length === 0)) {
        throw new Error(t('selectPlotParameterRequired'))
      }

      setLoading(true)
      const execution = await R.runLcz4pyFunction(selected.category, selected.id, selectedGuide ? t(selectedGuide.labelKey as any) : selected.label, params)
      setResult(execution.result)
      setLastExecution(execution)
      if (selected.id.startsWith('lcz_get_map')) {
        const tiffPath = (execution.result as { tiff_path?: unknown })?.tiff_path
        if (typeof tiffPath === 'string' && tiffPath) {
          await onAddLayer(tiffPath, 'raster')
        }
      }
      onRunComplete?.(execution.result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  const onAddLayer = async (path: string, kind: 'raster' | 'geojson') => {
    const layerId = `lcz4py-${Date.now()}`
    try {
      if (kind === 'raster') {
        const map = mapLibreManager.getMap()
        if (!map) throw new Error(t('mapNotReady'))
        const isLczMap = Boolean(selected?.id.startsWith('lcz_get_map'))
        const { bounds } = await addGeoTIFFToMap(R.filePathToUrl(path), layerId, map, { renderMode: isLczMap ? 'lcz' : undefined })
        addLayer({
          id: layerId,
          name: selectedGuide ? t(selectedGuide.labelKey as any) : selected?.label ?? formatFileName(path),
          type: 'raster',
          visible: true,
          opacity: 0.85,
          sourceFile: path,
          analysisSourceFile: path,
          renderMode: isLczMap ? 'lcz' : undefined,
          bounds,
        })
        if (selected?.id.startsWith('lcz_get_map')) setLczMapPath(path)
        map.fitBounds(bounds, { padding: 40 })
      } else {
        const response = await fetch(R.filePathToUrl(path))
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const geojson = await response.json()
        addLayer({
          id: layerId,
          name: selectedGuide ? t(selectedGuide.labelKey as any) : selected?.label ?? formatFileName(path),
          type: 'geojson',
          visible: true,
          opacity: 0.8,
          data: geojson,
          sourceFile: path,
        })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const renderResourceField = (param: Lcz4pyParam) => {
    const mode = inputModes[param.name] ?? 'file'
    const canUseMap = prefersCurrentMap(selected!, param)
    const canUseDataset = param.kind === 'dataframe'
    const canUseResults = resultOptions.length > 0
    const accept = canUseDataset
      ? '.csv,.parquet,.pq'
      : '.tif,.tiff,.csv,.parquet,.geojson,.json,.gpkg,.nc,.npy,.zip'

    return (
      <div className="resource-picker">
        <div className="resource-tabs" role="group" aria-label={t('inputSource')}>
          {canUseMap && (
            <button type="button" className={mode === 'map' ? 'active' : ''} disabled={!resolvedLczMapPath} onClick={() => setMode(param, 'map')}>
              <Icon name="map" /> {t('currentMap')}
            </button>
          )}
          {canUseDataset && (
            <button type="button" className={mode === 'dataset' ? 'active' : ''} disabled={!stationData} onClick={() => setMode(param, 'dataset')}>
              <Icon name="data" /> {t('currentData')}
            </button>
          )}
          <button type="button" className={mode === 'result' ? 'active' : ''} disabled={!canUseResults} onClick={() => setMode(param, 'result')}>
            <Icon name="result" /> {t('previousResult')}
          </button>
        </div>

        {mode === 'map' && (
          <div className={`resource-status ${resolvedLczMapPath ? 'ready' : ''}`}>
            <Icon name="map" />
            <div><strong>{resolvedLczMapPath ? formatFileName(resolvedLczMapPath) : t('noMapLoaded')}</strong><span>{t('currentMap')}</span></div>
          </div>
        )}
        {mode === 'dataset' && (
          <div className={`resource-status ${stationData ? 'ready' : ''}`}>
            <Icon name="data" />
            <div><strong>{stationFile ? formatFileName(stationFile) : `${stationData?.length ?? 0} ${t('records')}`}</strong><span>{t('currentData')}</span></div>
          </div>
        )}
        {mode === 'result' && (
          <select value={String(formValues[param.name] ?? '')} onChange={(event) => setField(param.name, event.target.value)}>
            <option value="">{t('selectResult')}</option>
            {resultOptions.map((option) => {
              const guide = getFunctionGuide(option.functionName)
              const fnLabel = t(guide.labelKey as Parameters<typeof getTranslation>[1])
              return (
                <option key={option.id} value={option.id}>
                  {option.label || fnLabel}
                </option>
              )
            })}
          </select>
        )}
        <label className="file-dropzone">
          <Icon name="upload" />
          <span>{uploadingField === param.name ? t('uploading') : fileLabels[param.name] ?? t('chooseFile')}</span>
          <input type="file" accept={accept} disabled={uploadingField === param.name} onChange={(event) => uploadForParam(param, event.target.files?.[0])} />
        </label>
      </div>
    )
  }

  const renderField = (param: Lcz4pyParam) => {
    if (param.name === 'lang') return null
    const value = formValues[param.name]
    const isPlotParametersX = selected?.id === 'lcz_plot_parameters' && param.name === 'x'
    // The backend classifies this function's `x` as kind "json" (its Union type
    // includes np.ndarray/dict/xr.Dataset), so it would otherwise render as a raw
    // JSON textarea instead of the file/previous-result picker it actually needs.
    const isResource = param.kind === 'resource' || param.kind === 'dataframe' || isPlotParametersX
    // lcz_plot_parameters takes a parameter/index raster as `x` AND a separate,
    // genuine `lcz_map` as an optional grouping input — labeling both "LCZ map"
    // reads as a duplicate field. Only `x` needs the distinct label here. `x`'s
    // PARAM_LABELS fallback (via humanize) also says "LCZ map", so this check
    // can't be gated on isResource.
    const fieldLabel = param.name === 'x'
      ? (selected?.id === 'lcz_plot_parameters' ? t('plotParametersDataLabel') : t('lczMap'))
      : humanize(param.name)

    // Hidden once auto-filled (e.g. via the "Obter Parâmetros LCZ" → "Próximo"
    // flow) to avoid a redundant field — but still shown, so the function stays
    // usable, when opened directly with no value set yet.
    if (isPlotParametersX && value) return null

    if (selected?.id === 'lcz_get_parameters' && param.name === 'iselect') return null

    if ((selected?.id === 'lcz_plot_parameters' && param.name === 'iselect') || (selected?.id === 'lcz_get_ucp' && param.name === 'variables')) {
      const choices = selected.id === 'lcz_plot_parameters' ? MORPHOLOGY_PARAMETERS : UCP_PARAMETERS
      const chosen = Array.isArray(value) ? value.map(String) : []
      const toggle = (id: string) => setField(param.name, chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id])
      const isUcp = selected.id === 'lcz_get_ucp'
      const recommended = isUcp
        ? ['frc_esa', 'hgt', 'urban_frc', 'tree', 'urban']
        : ['svf_mean', 'aspect_mean', 'BSF_mean', 'ISF_mean', 'PSF_mean', 'HRE_mean', 'z0']
      const filteredChoices = choices.filter(([id, label]) => `${id} ${label}`.toLowerCase().includes(parameterSearch.trim().toLowerCase()))
      return (
        <div key={param.name} className="lcz-field parameter-picker">
          <div className="field-label-row"><label>{isUcp ? 'Parâmetros UCP para gerar' : 'Parâmetros para plotar'}</label></div>
          <p className="field-hint">{isUcp ? 'Selecione apenas as variáveis necessárias antes de iniciar o download.' : 'A pilha completa de morfologia é gerada primeiro; escolha as bandas que deseja visualizar.'}</p>
          <div className="parameter-picker-actions">
            <button type="button" onClick={() => setField(param.name, recommended)}>{t('selectRecommended')}</button>
            <button type="button" onClick={() => setField(param.name, choices.map(([id]) => id))}>Todos</button>
            <button type="button" onClick={() => setField(param.name, [])}>Limpar</button>
            <span>{chosen.length} selecionado{chosen.length === 1 ? '' : 's'}</span>
          </div>
          <input
            className="parameter-search"
            type="search"
            value={parameterSearch}
            placeholder={t('parameterSearch')}
            onChange={(event) => setParameterSearch(event.target.value)}
          />
          <div className="parameter-options">
            {filteredChoices.map(([id, label]) => <label key={id} className={chosen.includes(id) ? 'selected' : ''}><input type="checkbox" checked={chosen.includes(id)} onChange={() => toggle(id)} /><span><strong>{id}</strong>{label}</span></label>)}
          </div>
        </div>
      )
    }

    const helpText = (selected && getParamHelp(selected.id, param.name, language)) || param.description

    return (
      <div key={param.name} className={`lcz-field ${isResource ? 'resource-field' : ''}`}>
        <div className="field-label-row">
          <label htmlFor={`field-${param.name}`}>{fieldLabel}{param.required && <span className="required-mark"> *</span>}</label>
          {helpText && (
            <button
              type="button"
              className={`inline-help ${openFieldHelp === param.name ? 'active' : ''}`}
              aria-label={`${t('help')}: ${fieldLabel}`}
              onClick={() => setOpenFieldHelp(openFieldHelp === param.name ? null : param.name)}
            >
              <Icon name="help" />
            </button>
          )}
        </div>
        {openFieldHelp === param.name && helpText && <p className="field-hint expanded">{helpText}</p>}
        {isResource && renderResourceField(param)}
        {param.kind === 'boolean' && (
          <label className="switch-control">
            <input id={`field-${param.name}`} type="checkbox" checked={Boolean(value)} onChange={(event) => setField(param.name, event.target.checked)} />
            <span className="switch-track"><span /></span>
            <span>{value ? t('enabled') : t('disabled')}</span>
          </label>
        )}
        {param.kind === 'number' && (
          <input id={`field-${param.name}`} type="number" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value === '' ? undefined : Number(event.target.value))} />
        )}
        {param.kind === 'date' && (
          <input id={`field-${param.name}`} type="date" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)} />
        )}
        {param.kind === 'select' && param.name !== 'save_extension' && (
          <select id={`field-${param.name}`} value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)}>
            <option value="">{param.required ? t('selectOption') : t('useDefault')}</option>
            {param.options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
          </select>
        )}
        {param.name === 'save_extension' && (
          <div className="export-format-options" role="radiogroup" aria-label={t('exportFormat')}>
            {(SAVE_EXTENSION_OPTIONS[selected?.id ?? ''] ?? (param.options.length > 0 ? param.options : ['html', 'png', 'pdf'])).map((extension) => {
              const selectedExtension = String(value ?? 'html').toLowerCase()
              const isSelected = selectedExtension === extension.toLowerCase()
              return (
                <label key={extension} className={isSelected ? 'selected' : ''}>
                  <input type="radio" name={`field-${param.name}`} value={extension} checked={isSelected} onChange={() => setField(param.name, extension)} />
                  <span><strong>{extension.toUpperCase()}</strong><small>{exportFormatDescription(extension, t)}</small></span>
                </label>
              )
            })}
          </div>
        )}
        {param.kind === 'json' && !isResource && (
          <textarea
            id={`field-${param.name}`}
            rows={3}
            value={value == null ? '' : String(value)}
            placeholder={t('jsonPlaceholder')}
            onChange={(event) => setField(param.name, event.target.value || undefined)}
          />
        )}
        {param.kind === 'secret' && (
          <input id={`field-${param.name}`} type="password" autoComplete="off" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)} />
        )}
        {param.kind === 'text' && (
          <input id={`field-${param.name}`} type="text" autoComplete="off" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)} />
        )}
        {/* The selected export format already communicates its default state;
            repeating the package-default note creates a redundant card right
            before controls such as "Show legend". */}
        {param.name !== 'save_extension' && !param.required && param.has_default && param.default_repr && <p className="default-note">{t('packageDefault')}: {param.default_repr}</p>}
      </div>
    )
  }

  if (!rRunning) {
    return (
      <div className="lcz4py-browser">
        <div className="catalog-empty-state">
          <Icon name="result" />
          <h4>{t('engineUnavailable')}</h4>
          <p>{t('engineUnavailableDescription')}</p>
          <button className="artifact-action" disabled={retrying} onClick={async () => {
            setRetrying(true)
            await R.retrySidecarConnection()
            setRetrying(false)
          }}>
            {retrying ? '…' : t('retryConnection')}
          </button>
        </div>
      </div>
    )
  }

  if (catalogError) {
    return <div className="panel-error"><strong>{t('catalogError')}</strong><span>{catalogError}</span></div>
  }

  if (!selected) {
    return (
      <div className="lcz4py-browser">
        <div className="catalog-heading">
          <div>
            <span className="catalog-eyebrow">
              {t('lcz4pyPrefix')} · {t(category === 'general' ? 'generalWorkspace' : 'localWorkspace')}
            </span>
            <h3>
              {title
                ?? t(category === 'general' ? 'generalFunctions' : 'localFunctions')}
            </h3>
            <p>
              {description
                ?? t(category === 'general' ? 'generalFunctionsDescription' : 'localFunctionsDescription')}
            </p>
          </div>
        </div>

        <div className="catalog-groups">
          {[...grouped.entries()].map(([group, groupFunctions]) => (
            <section key={group} className="catalog-group">
              {!(isScopedCatalog && grouped.size === 1) && (
                <div className="catalog-group-heading"><span>{group}</span><small>{groupFunctions.length}</small></div>
              )}
              <div className="function-list">
                {groupFunctions.map((fn) => {
                  const guide = getFunctionGuide(fn.id)
                  return (
                    <button key={fn.id} className="function-card" onClick={() => selectFunction(fn)}>
                      <div className="function-card-body">
                        <strong>{t(guide.labelKey as any)}</strong>
                        <p>{t(guide.summaryKey as any)}</p>
                      </div>
                      <Icon name="arrow" />
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {grouped.size === 0 && (
            <div className="catalog-empty-state compact">
              <Icon name="result" />
              <h4>{t('noFunctionsFound')}</h4>
              <p>{t('noFunctionsAvailableDescription')}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const publicationParams = selected.params.filter((param) => PUBLICATION_PARAM_NAMES.has(param.name))
  const visibleParams = selected.params.filter((param) => param.name !== 'lang' && !publicationParams.some((pub) => pub.name === param.name) && !HIDDEN_ADVANCED_PARAMS.has(param.name))
  const primaryParams = visibleParams.filter((param) => param.required || param.kind === 'resource' || param.kind === 'dataframe' || ESSENTIAL_PARAMS.has(param.name))
  if (selected.id === 'lcz_plot_parameters') {
    // The actual LCZ map is the spatial context; put it first and keep the
    // parameter stack immediately after it. This eliminates the impression of
    // two competing "LCZ map" inputs.
    const lczMapIndex = primaryParams.findIndex((param) => param.name === 'lcz_map')
    const xIndex = primaryParams.findIndex((param) => param.name === 'x')
    if (lczMapIndex > -1 && xIndex > -1 && lczMapIndex !== 0) {
      const [lczMapParam] = primaryParams.splice(lczMapIndex, 1)
      primaryParams.unshift(lczMapParam)
    }
  }
  const advancedParams = visibleParams.filter((param) => !primaryParams.includes(param))
  const parameterStackPath = selected.id === 'lcz_get_parameters' ? resultString(result, 'tiff_path') : null
  const canOpenPlotParameters = Boolean(parameterStackPath && catalog.some((fn) => fn.id === 'lcz_plot_parameters'))
  return (
    <div className="lcz4py-browser function-workflow">
      <div className="workflow-topbar">
        <button
          className="back-button"
          onClick={() => setSelected(null)}
          // Hide back when this tool has only one function (nothing to pick).
          style={isScopedCatalog && functions.length === 1 ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
        >
          <Icon name="back" /> {scopedHeading ?? t('allFunctions')}
        </button>
        <button className={`help-button ${showFunctionHelp ? 'active' : ''}`} onClick={() => setShowFunctionHelp(!showFunctionHelp)} aria-label={t('functionHelp')}>
          <Icon name="help" />
        </button>
      </div>

      <div className="workflow-heading">
        <h3>{selectedGuide ? t(selectedGuide.labelKey as any) : selected.label}</h3>
        {selectedGuide && <p className="workflow-summary">{t(selectedGuide.summaryKey as any)}</p>}
      </div>

      {showFunctionHelp && (
        <div className="function-help-card">
          <div><Icon name="help" /><strong>{t('howToUse')}</strong></div>
          <p>{t('functionHelpDescription')}</p>
          <div className="help-facts">
            <span><strong>{primaryParams.filter((param) => param.required).length}</strong>{t('requiredInputs')}</span>
            <span><strong>{advancedParams.length}</strong>{t('advancedOptions')}</span>
            <span><strong>{language.toUpperCase()}</strong>{t('outputLanguage')}</span>
          </div>
        </div>
      )}

      {selected.requires_setup ? (
        <div className="setup-notice"><strong>{t('setupRequired')}</strong><p>{selected.requires_setup}</p></div>
      ) : (
        <>
          {publicationParams.length > 0 && (
            <section className="publication-section">
              <div className="section-heading"><span>0</span><div><h4>{t('publicationStyle')}</h4><p>{t('publicationStyleDescription')}</p></div></div>
              <div className="workflow-fields publication-fields">
                {publicationParams.some((param) => param.name === 'style') && (
                  <div className="lcz-field">
                    <div className="field-label-row">
                      <label htmlFor="field-style">{t('publicationStyle')}</label>
                    </div>
                    <select
                      id="field-style"
                      value={String(formValues.style ?? 'default')}
                      onChange={(event) => setField('style', event.target.value)}
                    >
                      {R.PUBLICATION_STYLE_OPTIONS.map((style) => (
                        <option key={style} value={style}>{publicationStyleLabels[style]}</option>
                      ))}
                    </select>
                  </div>
                )}
                {publicationParams.some((param) => param.name === 'add_scalebar') && (
                  <label className="switch-control">
                    <input type="checkbox" checked={Boolean(formValues.add_scalebar ?? true)} onChange={(event) => setField('add_scalebar', event.target.checked)} />
                    <span className="switch-track"><span /></span>
                    <span>{t('addScalebar')}</span>
                  </label>
                )}
                {publicationParams.some((param) => param.name === 'add_north_arrow') && (
                  <label className="switch-control">
                    <input type="checkbox" checked={Boolean(formValues.add_north_arrow ?? true)} onChange={(event) => setField('add_north_arrow', event.target.checked)} />
                    <span className="switch-track"><span /></span>
                    <span>{t('addNorthArrow')}</span>
                  </label>
                )}
              </div>
            </section>
          )}

          {primaryParams.length > 0 && (
            <section className="workflow-section">
              <div className="section-heading"><span>1</span><div><h4>{t('inputsAndParameters')}</h4><p>{t('inputsAndParametersDescription')}</p></div></div>
              <div className="workflow-fields">{primaryParams.map(renderField)}</div>
            </section>
          )}

          {advancedParams.length > 0 && (
            <section className="advanced-section">
              <button className="advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)} aria-expanded={advancedOpen}>
                <div><span>2</span><div><strong>{t('advancedOptions')}</strong><small>{advancedParams.length} {t('parameters')}</small></div></div>
                <span className={`chevron ${advancedOpen ? 'open' : ''}`}>⌄</span>
              </button>
              {advancedOpen && <div className="workflow-fields advanced-fields">{advancedParams.map(renderField)}</div>}
            </section>
          )}

          {error && <div className="panel-error"><strong>{t('couldNotRun')}</strong><span>{error}</span></div>}

          <section className="execution-summary" aria-label={t('executionSummary')}>
            <div><strong>{t('executionSummary')}</strong><span>{t('executionSummaryDescription')}</span></div>
            <dl>
              <div><dt>{t('currentMap')}</dt><dd>{resolvedLczMapPath ? formatFileName(resolvedLczMapPath) : t('noMapLoaded')}</dd></div>
              <div><dt>{t('parameters')}</dt><dd>{selected.id === 'lcz_get_parameters' ? 'Pilha completa' : `${primaryParams.filter((param) => param.required).length} ${t('requiredInputs')}`}</dd></div>
            </dl>
          </section>

          <div className="workflow-actions">
            <button className="run-function-button" onClick={run} disabled={loading || uploadingField != null}>
              <Icon name="run" />
              <span>{loading ? t('running') : t('run')}</span>
            </button>
          </div>
        </>
      )}

      {result && (
        <section className="workflow-result">
          {!previewMode && (
            <div className="result-ready-status">
              <span>✓</span>
              <strong>{t('resultReady')}</strong>
            </div>
          )}
          {parameterStackPath ? (
            <div className="parameter-stack-result">
              <div>
                <strong>{t('parameterStackReady')}</strong>
                <span>{t('parameterStackReadyDescription')}</span>
              </div>
              <div className="parameter-stack-actions">
                <a className="artifact-action secondary" href={R.filePathToUrl(parameterStackPath)} download><Icon name="download" /> {t('resultDownloadGeoTIFF')}</a>
                <button className="artifact-action secondary" onClick={() => onAddLayer(parameterStackPath, 'raster')}><Icon name="map" /> {t('resultAddToMap')}</button>
                <button className="artifact-action next" disabled={!canOpenPlotParameters} onClick={openPlotParameters}><Icon name="arrow" /> {t('nextPlotParameters')}</button>
              </div>
            </div>
          ) : preferredOutputView(result) === 'visualization' ? (
            // MainWorkspace's output panel already renders this same result
            // (see workspace-result-item in MainWorkspace.tsx) whenever a run
            // produces a plot/table rather than a map — showing it again here
            // duplicated every chart. Map-type results have no other home, so
            // they still render inline below.
            <p className="field-hint">{t('resultShownInPanel')}</p>
          ) : (
            <ResultView value={result} onAddLayer={onAddLayer} previewVisualOnly={previewMode} language={language} />
          )}
        </section>
      )}
    </div>
  )
}
