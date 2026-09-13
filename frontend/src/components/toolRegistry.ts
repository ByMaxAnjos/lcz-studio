import type { ToolIconName } from './StudioIcon'

export interface ToolDef {
  id: string
  label: string
  labelKey: string
  descKey: string
  icon: ToolIconName
  group?: string
  category?: string
  functionIds?: string[]
  outputView?: 'map' | 'visualization'
  outputTypes?: Array<'map' | 'plot' | 'table' | 'file'>
  description?: string
}

export const GENERAL_TOOLS: ToolDef[] = [
  {
    id: 'get-map',
    label: 'Get LCZ Map',
    labelKey: 'toolGetMap',
    descKey: 'toolGetMapDesc',
    icon: 'map-download',
    group: 'Map',
    category: 'Data',
    functionIds: ['lcz_get_map', 'lcz_get_map_euro', 'lcz_get_map_usa', 'lcz_get_map_generator', 'lcz_plot_map'],
    outputTypes: ['map'],
  },
  {
    id: 'area-calc',
    label: 'Calculate LCZ Areas',
    labelKey: 'toolAreaCalc',
    descKey: 'toolAreaCalcDesc',
    icon: 'area',
    category: 'Extraction',
    functionIds: ['lcz_cal_area'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
  {
    id: 'morphological-params',
    label: 'Building Morphology',
    labelKey: 'toolMorphParams',
    descKey: 'toolMorphParamsDesc',
    icon: 'buildings',
    group: 'Parameters',
    category: 'Extraction',
    functionIds: ['lcz_get_parameters', 'lcz_plot_parameters'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'file'],
  },
  {
    id: 'ucp',
    label: 'Urban Canopy Parameters',
    labelKey: 'toolUCP',
    descKey: 'toolUCPDesc',
    icon: 'canopy',
    group: 'Parameters',
    category: 'Extraction',
    functionIds: ['lcz_get_ucp'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'file'],
  },
  {
    id: 'remote-sensing',
    label: 'Satellite Data',
    labelKey: 'toolRemoteSensing',
    descKey: 'toolRemoteSensingDesc',
    icon: 'satellite',
    category: 'Extraction',
    functionIds: ['lcz_get_lst', 'lcz_get_planetary_computer', 'lcz_list_pc_assets'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table', 'file'],
  },
  {
    id: 'spectral-indices',
    label: 'Vegetation & Built-up Indices',
    labelKey: 'toolSpectralIndices',
    descKey: 'toolSpectralIndicesDesc',
    icon: 'indices',
    category: 'Extraction',
    functionIds: ['lcz_cal_indices', 'lcz_cal_indexes', 'lcz_get_indices'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
  {
    id: 'gridded',
    label: 'Climate & Environment Grids',
    labelKey: 'toolGridded',
    descKey: 'toolGriddedDesc',
    icon: 'climate-grid',
    group: 'Gridded climate data',
    category: 'Extraction',
    functionIds: ['lcz_grid_chirps', 'lcz_grid_era5', 'lcz_grid_era5_global', 'lcz_grid_pdsi', 'lcz_grid_pollution_ghap', 'lcz_grid_pollution_merra2', 'plot_grid_only', 'plot_lcz_relationship'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table', 'file'],
  },
  {
    id: 'utility',
    label: 'Clear Cache',
    labelKey: 'toolUtility',
    descKey: 'toolUtilityDesc',
    icon: 'cache',
    category: 'System',
    functionIds: ['lcz_clear_cache'],
    outputView: 'visualization',
    outputTypes: ['file'],
  },
]

export const LOCAL_TOOLS: ToolDef[] = [
  {
    id: 'time-series',
    label: 'Station Time Series',
    labelKey: 'toolTimeSeries',
    descKey: 'toolTimeSeriesDesc',
    icon: 'time-series',
    category: 'Analysis',
    functionIds: ['lcz_degree_hours', 'lcz_dtr', 'lcz_ts'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
  {
    id: 'thermal-anomaly',
    label: 'Temperature Anomalies',
    labelKey: 'toolThermalAnomaly',
    descKey: 'toolThermalAnomalyDesc',
    icon: 'anomaly',
    group: 'Anomaly',
    category: 'Analysis',
    functionIds: ['lcz_anomaly', 'lcz_anomaly_map'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
  },
  {
    id: 'uhi-intensity',
    label: 'Canopy Heat Island',
    labelKey: 'toolCanopyUHI',
    descKey: 'toolCanopyUHIDesc',
    icon: 'heat-island',
    category: 'Analysis',
    functionIds: ['lcz_uhi_intensity'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
  {
    id: 'uhi-surface',
    label: 'Surface Heat Island',
    labelKey: 'toolSurfaceUHI',
    descKey: 'toolSurfaceUHIDesc',
    icon: 'surface-heat',
    category: 'Analysis',
    functionIds: ['lcz_uhi_surface'],
    outputView: 'map',
    outputTypes: ['map', 'plot'],
  },
  {
    id: 'interpolation',
    label: 'Spatial Interpolation',
    labelKey: 'toolInterpolation',
    descKey: 'toolInterpolationDesc',
    icon: 'interpolation',
    group: 'Interpolation',
    category: 'Interpolation',
    functionIds: ['lcz_interp_map', 'lcz_interp_eval', 'lcz_plot_interp', 'lcz_variogram'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
  },
  {
    id: 'ml-interpolation',
    label: 'ML Interpolation',
    labelKey: 'toolMLInterpolation',
    descKey: 'toolMLInterpolationDesc',
    icon: 'ml-interpolation',
    group: 'Interpolation',
    category: 'Interpolation',
    functionIds: ['lcz_interp_map_plus', 'lcz_interp_eval_plus'],
    outputView: 'map',
    outputTypes: ['map', 'plot', 'table'],
  },
  {
    id: 'climate-indices',
    label: 'Drought Indices',
    labelKey: 'toolDroughtIndices',
    descKey: 'toolDroughtIndicesDesc',
    icon: 'drought',
    category: 'Climate',
    functionIds: ['lcz_climate_compute_spei', 'lcz_climate_compute_spi'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
  {
    id: 'thermal-comfort',
    label: 'Thermal Comfort & Waste Heat',
    labelKey: 'toolThermalComfort',
    descKey: 'toolThermalComfortDesc',
    icon: 'comfort',
    group: 'Thermal & UHI',
    category: 'Climate',
    functionIds: ['lcz_utci', 'lcz_anthropogenic_heat'],
    outputView: 'visualization',
    outputTypes: ['plot', 'table'],
  },
]

export function getToolsForWorkspace(workspace: 'general' | 'local') {
  return workspace === 'general' ? GENERAL_TOOLS : LOCAL_TOOLS
}

export function findTool(workspace: 'general' | 'local', id: string | null) {
  if (!id) return null
  return getToolsForWorkspace(workspace).find((tool) => tool.id === id) ?? null
}

export function getCategories(tools: ToolDef[]): string[] {
  const seen = new Set<string>()
  for (const tool of tools) {
    if (tool.category) seen.add(tool.category)
  }
  return [...seen]
}

export function getToolsByCategory(tools: ToolDef[], category: string): ToolDef[] {
  return tools.filter((tool) => tool.category === category)
}
