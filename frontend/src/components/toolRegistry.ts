export interface ToolDef {
  id: string
  label: string
  icon: string
  group?: string
  functionIds?: string[]
  outputView?: 'map' | 'visualization'
  outputTypes?: Array<'map' | 'plot' | 'table' | 'file'>
  description?: string
}

export const GENERAL_TOOLS: ToolDef[] = [
  {
    id: 'get-map',
    label: 'LCZ Map Acquisition',
    icon: '🗺',
    group: 'Map',
    outputTypes: ['map'],
    description: 'Download a standardized LCZ map from the global, regional, or generator-based sources described in the notebook.',
  },
  {
    id: 'area-calc',
    label: 'Area Calculation',
    icon: '📐',
    functionIds: ['lcz_cal_area'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'Turn an LCZ map into class-area statistics with browser-ready charts and tables.',
  },
  {
    id: 'morphological-params',
    label: 'Morphological Parameters',
    icon: '🏙',
    group: 'Parameters',
    functionIds: ['lcz_get_parameters', 'lcz_plot_parameters'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'file'],
    description: 'Extract the 34 morphological and thermal LCZ parameters and visualize them class by class.',
  },
  {
    id: 'ucp',
    label: 'Urban Canopy Parameters',
    icon: '🏙',
    group: 'Parameters',
    functionIds: ['lcz_get_ucp'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'file'],
    description: 'Download the urban canopy parameters that summarize built-form structure for each LCZ class.',
  },
  {
    id: 'remote-sensing',
    label: 'Remote Sensing',
    icon: '🛰',
    functionIds: [
      'lcz_get_lst',
      'lcz_get_planetary_computer',
      'lcz_list_pc_assets',
    ],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table', 'file'],
    description: 'Explore land surface temperature and Planetary Computer imagery cropped to the LCZ footprint.',
  },
  {
    id: 'spectral-indices',
    label: 'Spectral Indices',
    icon: '✨',
    functionIds: ['lcz_cal_indices', 'lcz_cal_indexes', 'lcz_get_indices'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'Compare NDVI, NDBI, and related indices across LCZ classes using the satellite notebook flow.',
  },
  {
    id: 'gridded',
    label: 'Gridded Climate & Env.',
    icon: '🌦',
    group: 'Gridded climate data',
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table', 'file'],
    description: 'Grid precipitation, reanalysis, drought, and air-pollution data onto the LCZ map grid.',
  },
  {
    id: 'utility',
    label: 'Utility',
    icon: '🧹',
    functionIds: ['lcz_clear_cache'],
    outputView: 'visualization',
    outputTypes: ['file'],
    description: 'Maintenance helpers for cache cleanup and other lightweight workspace housekeeping.',
  },
  { id: 'add-data', label: 'Add Data', icon: '📂' },
]

export const LOCAL_TOOLS: ToolDef[] = [
  {
    id: 'time-series',
    label: 'LCZ Time Series',
    icon: '📈',
    functionIds: ['lcz_degree_hours', 'lcz_dtr', 'lcz_ts'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'View LCZ-stratified station temperature series, degree hours, and diurnal range summaries.',
  },
  {
    id: 'thermal-anomaly',
    label: 'Temperature Anomalies',
    icon: '🌡',
    group: 'Anomaly',
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
    description: 'Inspect station anomalies as summaries, charts, or an interpolated anomaly surface.',
  },
  {
    id: 'uhi-intensity',
    label: 'Canopy UHI',
    icon: '🔥',
    functionIds: ['lcz_uhi_intensity'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'Measure the classic canopy-layer urban heat island from LCZ-stratified station data.',
  },
  {
    id: 'uhi-surface',
    label: 'Surface UHI',
    icon: '🛰',
    functionIds: ['lcz_uhi_surface'],
    outputView: 'map',
    outputTypes: ['map', 'plot'],
    description: 'Analyze surface urban heat island patterns from satellite LST and the LCZ map.',
  },
  {
    id: 'interpolation',
    label: 'Spatial Interpolation',
    icon: '🔲',
    group: 'Interpolation',
    functionIds: ['lcz_interp_map', 'lcz_interp_eval', 'lcz_plot_interp', 'lcz_variogram'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
    description: 'Use geostatistics to interpolate station data and evaluate the fitted surfaces.',
  },
  {
    id: 'ml-interpolation',
    label: 'ML Interpolation + UCP',
    icon: '🧠',
    group: 'Interpolation',
    functionIds: ['lcz_interp_map_plus', 'lcz_interp_eval_plus'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
    description: 'Use machine-learning interpolation with urban canopy parameters as predictors.',
  },
  {
    id: 'climate-indices',
    label: 'Drought Indices',
    icon: '🌧',
    functionIds: ['lcz_climate_compute_spei', 'lcz_climate_compute_spi'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'Compute SPI and SPEI drought metrics from monthly precipitation time series.',
  },
  {
    id: 'thermal-comfort',
    label: 'Thermal Comfort & Anthropogenic Heat',
    icon: '🌤',
    group: 'Thermal & UHI',
    functionIds: ['lcz_utci', 'lcz_anthropogenic_heat'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
    description: 'Estimate UTCI heat stress and anthropogenic heat flux from LCZ-driven inputs.',
  },
]

export function getToolsForWorkspace(workspace: 'general' | 'local') {
  return workspace === 'general' ? GENERAL_TOOLS : LOCAL_TOOLS
}

export function findTool(workspace: 'general' | 'local', id: string | null) {
  if (!id) return null
  return getToolsForWorkspace(workspace).find((tool) => tool.id === id) ?? null
}
