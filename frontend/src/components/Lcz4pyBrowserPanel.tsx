import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { mapLibreManager } from '../map/MapLibreManager'
import { addGeoTIFFToMap } from '../map/cogHandler'
import { getTranslation } from '../i18n/translations'
import { getFunctionGuide, humanize } from '../utils/functionGuide'
import * as R from '../services/rService'
import type {
  Lcz4pyExecution,
  Lcz4pyFunctionMeta,
  Lcz4pyParam,
  Lcz4pyResult,
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
  'pollutants', 'degree_type', 'base_temp', 'output',
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

function needsIntermediateResult(param: Lcz4pyParam): boolean {
  const annotation = param.annotation ?? ''
  return /LCZ(?:Grid|Indices|PC|LST)Result/.test(annotation) || param.name === 'grid_result'
}

function formatFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function Icon({ name }: { name: 'back' | 'help' | 'run' | 'upload' | 'map' | 'data' | 'result' | 'download' | 'arrow' }) {
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
  }
  return <svg className="lcz-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export const ResultView: React.FC<{
  value: unknown
  onAddLayer: (path: string, kind: 'raster' | 'geojson') => void
  allowAddLayer?: boolean
}> = ({ value, onAddLayer, allowAddLayer = true }) => {
  if (value == null) return null

  if (Array.isArray(value)) {
    return (
      <div className="result-array">
        {value.map((item, index) => <ResultView key={index} value={item} onAddLayer={onAddLayer} allowAddLayer={allowAddLayer} />)}
      </div>
    )
  }

  if (typeof value !== 'object') return <span className="result-value">{String(value)}</span>

  const result = value as Lcz4pyResult
  if ('tiff_path' in result) {
    const path = String(result.tiff_path)
    return (
      <div className="result-artifact">
        <div><strong>{formatFileName(path)}</strong><span>GeoTIFF raster</span></div>
        {allowAddLayer && <button className="artifact-action" onClick={() => onAddLayer(path, 'raster')}><Icon name="map" /> Add to map</button>}
      </div>
    )
  }
  if ('geojson_path' in result) {
    const path = String(result.geojson_path)
    return (
      <div className="result-artifact">
        <div><strong>{formatFileName(path)}</strong><span>GeoJSON vector</span></div>
        {allowAddLayer && <button className="artifact-action" onClick={() => onAddLayer(path, 'geojson')}><Icon name="map" /> Add to map</button>}
      </div>
    )
  }
  if ('html_path' in result) {
    const path = String(result.html_path)
    return (
      <div className="result-plot-frame">
        <iframe title={`LCZ4py result ${formatFileName(path)}`} src={R.filePathToUrl(path)} sandbox="allow-scripts allow-same-origin" />
        <a className="artifact-action" href={R.filePathToUrl(path)} download><Icon name="download" /> Download HTML</a>
      </div>
    )
  }
  if ('plot_path' in result) {
    const path = String(result.plot_path)
    return (
      <div className="result-plot-frame">
        <iframe title={`LCZ4py plot ${formatFileName(path)}`} src={R.filePathToUrl(path)} sandbox="allow-scripts allow-same-origin" />
        <a className="artifact-action" href={R.filePathToUrl(path)} download><Icon name="download" /> Download plot</a>
      </div>
    )
  }
  if ('image_path' in result) {
    const path = String(result.image_path)
    return (
      <div className="result-image">
        <img src={R.filePathToUrl(path)} alt="LCZ4py result" />
        <a className="artifact-action" href={R.filePathToUrl(path)} download><Icon name="download" /> Download image</a>
      </div>
    )
  }
  if ('csv_path' in result || 'file_path' in result) {
    const path = String(result.csv_path ?? result.file_path)
    const rows = typeof result.n_rows === 'number' ? `${result.n_rows} rows` : 'Generated file'
    return (
      <div className="result-artifact">
        <div><strong>{formatFileName(path)}</strong><span>{rows}</span></div>
        <a className="artifact-action" href={R.filePathToUrl(path)} download><Icon name="download" /> Download</a>
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

  return (
    <div className="result-group">
      {Object.entries(result).map(([key, child]) => (
        <div key={key} className="result-field">
          <span className="result-field-label">{humanize(key)}</span>
          <ResultView value={child} onAddLayer={onAddLayer} allowAddLayer={allowAddLayer} />
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
    stationData,
    stationFile,
    activeJobs,
    addLayer,
    setLczMapPath,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

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
  const scopedDescription = description ?? selectedGuide?.summary ?? selected?.summary

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

  const selectFunction = (fn: Lcz4pyFunctionMeta) => {
    const defaults: Record<string, unknown> = {}
    const modes: Record<string, InputMode> = {}
    for (const param of fn.params) {
      if (param.name === 'lang') continue
      if (param.has_default && param.default != null) defaults[param.name] = param.default
      if (param.kind === 'resource') {
        if (prefersCurrentMap(fn, param) && lczMapPath) modes[param.name] = 'map'
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
    setSelected(fn)
    setFormValues(defaults)
    setInputModes(modes)
    setFileLabels({})
    setAdvancedOpen(false)
    setShowFunctionHelp(false)
    setOpenFieldHelp(null)
    setResult(null)
    setError(null)
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
    if (param.kind === 'resource') {
      if (mode === 'map') return lczMapPath
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
    if (param.kind === 'json' && typeof value === 'string' && value.trim()) {
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

      setLoading(true)
      const execution = await R.runLcz4pyFunction(selected.category, selected.id, selectedGuide?.label ?? selected.label, params)
      setResult(execution.result)
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
        const { bounds } = await addGeoTIFFToMap(R.filePathToUrl(path), layerId, map)
        addLayer({
          id: layerId,
          name: selectedGuide?.label ?? selected?.label ?? formatFileName(path),
          type: 'raster',
          visible: true,
          opacity: 0.85,
          sourceFile: path,
        })
        if (selected?.id.startsWith('lcz_get_map')) setLczMapPath(path)
        map.fitBounds(bounds, { padding: 40 })
      } else {
        const response = await fetch(R.filePathToUrl(path))
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const geojson = await response.json()
        addLayer({
          id: layerId,
          name: selectedGuide?.label ?? selected?.label ?? formatFileName(path),
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
            <button type="button" className={mode === 'map' ? 'active' : ''} disabled={!lczMapPath} onClick={() => setMode(param, 'map')}>
              <Icon name="map" /> {t('currentMap')}
            </button>
          )}
          {canUseDataset && (
            <button type="button" className={mode === 'dataset' ? 'active' : ''} disabled={!stationData} onClick={() => setMode(param, 'dataset')}>
              <Icon name="data" /> {t('currentData')}
            </button>
          )}
          <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => setMode(param, 'file')}>
            <Icon name="upload" /> {t('file')}
          </button>
          <button type="button" className={mode === 'result' ? 'active' : ''} disabled={!canUseResults} onClick={() => setMode(param, 'result')}>
            <Icon name="result" /> {t('previousResult')}
          </button>
        </div>

        {mode === 'map' && (
          <div className={`resource-status ${lczMapPath ? 'ready' : ''}`}>
            <Icon name="map" />
            <div><strong>{lczMapPath ? formatFileName(lczMapPath) : t('noMapLoaded')}</strong><span>{t('currentMap')}</span></div>
          </div>
        )}
        {mode === 'dataset' && (
          <div className={`resource-status ${stationData ? 'ready' : ''}`}>
            <Icon name="data" />
            <div><strong>{stationFile ? formatFileName(stationFile) : `${stationData?.length ?? 0} ${t('records')}`}</strong><span>{t('currentData')}</span></div>
          </div>
        )}
        {mode === 'file' && (
          <label className="file-dropzone">
            <Icon name="upload" />
            <span>{uploadingField === param.name ? t('uploading') : fileLabels[param.name] ?? t('chooseFile')}</span>
            <input type="file" accept={accept} disabled={uploadingField === param.name} onChange={(event) => uploadForParam(param, event.target.files?.[0])} />
          </label>
        )}
        {mode === 'result' && (
          <select value={String(formValues[param.name] ?? '')} onChange={(event) => setField(param.name, event.target.value)}>
            <option value="">{t('selectResult')}</option>
            {resultOptions.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.functionName}</option>)}
          </select>
        )}
      </div>
    )
  }

  const renderField = (param: Lcz4pyParam) => {
    if (param.name === 'lang') return null
    const value = formValues[param.name]
    const isResource = param.kind === 'resource' || param.kind === 'dataframe'

    return (
      <div key={param.name} className={`lcz-field ${isResource ? 'resource-field' : ''}`}>
        <div className="field-label-row">
          <label htmlFor={`field-${param.name}`}>{humanize(param.name)}{param.required && <span className="required-mark"> *</span>}</label>
          {param.description && (
            <button
              type="button"
              className={`inline-help ${openFieldHelp === param.name ? 'active' : ''}`}
              aria-label={`${t('help')}: ${humanize(param.name)}`}
              onClick={() => setOpenFieldHelp(openFieldHelp === param.name ? null : param.name)}
            >
              <Icon name="help" />
            </button>
          )}
        </div>
        {openFieldHelp === param.name && param.description && <p className="field-hint expanded">{param.description}</p>}
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
        {param.kind === 'select' && (
          <select id={`field-${param.name}`} value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)}>
            <option value="">{param.required ? t('selectOption') : t('useDefault')}</option>
            {param.options.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
          </select>
        )}
        {param.kind === 'json' && (
          <textarea
            id={`field-${param.name}`}
            rows={3}
            value={value == null ? '' : String(value)}
            placeholder='["value"] or {"key": "value"}'
            onChange={(event) => setField(param.name, event.target.value || undefined)}
          />
        )}
        {param.kind === 'secret' && (
          <input id={`field-${param.name}`} type="password" autoComplete="off" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)} />
        )}
        {param.kind === 'text' && (
          <input id={`field-${param.name}`} type="text" value={value == null ? '' : String(value)} onChange={(event) => setField(param.name, event.target.value || undefined)} />
        )}
        {!param.required && param.has_default && param.default_repr && <p className="default-note">{t('packageDefault')}: {param.default_repr}</p>}
      </div>
    )
  }

  if (!rRunning) {
    return (
      <div className="catalog-empty-state">
        <Icon name="result" />
        <h4>{t('engineUnavailable')}</h4>
        <p>{t('engineUnavailableDescription')}</p>
      </div>
    )
  }

  if (catalogError) {
    return <div className="panel-error"><strong>{t('catalogError')}</strong><span>{catalogError}</span></div>
  }

  if (!selected) {
    return (
      <div className="lcz4py-browser">
        {!isScopedCatalog && (
          <div className="catalog-heading">
            <div>
              <span className="catalog-eyebrow">LCZ4py · {t(category === 'general' ? 'generalWorkspace' : 'localWorkspace')}</span>
              <h3>{t(category === 'general' ? 'generalFunctions' : 'localFunctions')}</h3>
              <p>{t(category === 'general' ? 'generalFunctionsDescription' : 'localFunctionsDescription')}</p>
            </div>
            <span className="function-count">{functions.length}</span>
          </div>
        )}

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
                        <strong>{guide.label}</strong>
                        <p>{guide.summary}</p>
                      </div>
                      <div className="function-card-end">
                        <code>{fn.id}</code>
                        {fn.requires_setup && <span className="setup-badge">{t('setupRequired')}</span>}
                        <Icon name="arrow" />
                      </div>
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

  const visibleParams = selected.params.filter((param) => param.name !== 'lang')
  const primaryParams = visibleParams.filter((param) => param.required || param.kind === 'resource' || param.kind === 'dataframe' || ESSENTIAL_PARAMS.has(param.name))
  const advancedParams = visibleParams.filter((param) => !primaryParams.includes(param))

  return (
    <div className="lcz4py-browser function-workflow">
      <div className="workflow-topbar">
        <button className="back-button" onClick={() => setSelected(null)}><Icon name="back" /> {scopedHeading ?? t('allFunctions')}</button>
        <button className={`help-button ${showFunctionHelp ? 'active' : ''}`} onClick={() => setShowFunctionHelp(!showFunctionHelp)} aria-label={t('functionHelp')}>
          <Icon name="help" />
        </button>
      </div>

      <div className="workflow-heading">
        {scopedHeading && <span className="catalog-eyebrow">{scopedHeading}</span>}
        <h3>{selectedGuide?.label ?? selected.label}</h3>
        <p>{selectedGuide?.summary ?? scopedDescription}</p>
        <code className="workflow-id">{selected.id}</code>
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

          <button className="run-function-button" onClick={run} disabled={loading || uploadingField != null}>
            <Icon name="run" />
            <span><strong>{loading ? t('running') : `${t('run')} ${selectedGuide?.label ?? selected.label}`}</strong><small>{loading ? t('keepWindowOpen') : t('resultsAppearBelow')}</small></span>
          </button>
        </>
      )}

      {result && (
        <section className="workflow-result">
          <div className="section-heading success"><span>✓</span><div><h4>{t('resultReady')}</h4><p>{t('resultReadyDescription')}</p></div></div>
          <ResultView value={result} onAddLayer={onAddLayer} />
        </section>
      )}
    </div>
  )
}
