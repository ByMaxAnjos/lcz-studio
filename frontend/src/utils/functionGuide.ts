export interface FunctionGuide {
  labelKey: string
  summaryKey: string
}

const FUNCTION_GUIDES: Record<string, FunctionGuide> = {
  lcz_get_map: { labelKey: 'fn_lcz_get_map_label', summaryKey: 'fn_lcz_get_map_summary' },
  lcz_get_map_generator: { labelKey: 'fn_lcz_get_map_generator_label', summaryKey: 'fn_lcz_get_map_generator_summary' },
  lcz_get_map_usa: { labelKey: 'fn_lcz_get_map_usa_label', summaryKey: 'fn_lcz_get_map_usa_summary' },
  lcz_get_map_euro: { labelKey: 'fn_lcz_get_map_euro_label', summaryKey: 'fn_lcz_get_map_euro_summary' },
  lcz_plot_map: { labelKey: 'fn_lcz_plot_map_label', summaryKey: 'fn_lcz_plot_map_summary' },
  lcz_get_parameters: { labelKey: 'fn_lcz_get_parameters_label', summaryKey: 'fn_lcz_get_parameters_summary' },
  lcz_plot_parameters: { labelKey: 'fn_lcz_plot_parameters_label', summaryKey: 'fn_lcz_plot_parameters_summary' },
  lcz_get_ucp: { labelKey: 'fn_lcz_get_ucp_label', summaryKey: 'fn_lcz_get_ucp_summary' },
  lcz_cal_area: { labelKey: 'fn_lcz_cal_area_label', summaryKey: 'fn_lcz_cal_area_summary' },
  lcz_cal_indices: { labelKey: 'fn_lcz_cal_indices_label', summaryKey: 'fn_lcz_cal_indices_summary' },
  lcz_cal_indexes: { labelKey: 'fn_lcz_cal_indexes_label', summaryKey: 'fn_lcz_cal_indexes_summary' },
  lcz_get_indices: { labelKey: 'fn_lcz_get_indices_label', summaryKey: 'fn_lcz_get_indices_summary' },
  lcz_get_lst: { labelKey: 'fn_lcz_get_lst_label', summaryKey: 'fn_lcz_get_lst_summary' },
  lcz_get_planetary_computer: { labelKey: 'fn_lcz_get_planetary_computer_label', summaryKey: 'fn_lcz_get_planetary_computer_summary' },
  lcz_list_pc_assets: { labelKey: 'fn_lcz_list_pc_assets_label', summaryKey: 'fn_lcz_list_pc_assets_summary' },
  lcz_grid_chirps: { labelKey: 'fn_lcz_grid_chirps_label', summaryKey: 'fn_lcz_grid_chirps_summary' },
  lcz_grid_era5: { labelKey: 'fn_lcz_grid_era5_label', summaryKey: 'fn_lcz_grid_era5_summary' },
  lcz_grid_era5_global: { labelKey: 'fn_lcz_grid_era5_global_label', summaryKey: 'fn_lcz_grid_era5_global_summary' },
  lcz_grid_pdsi: { labelKey: 'fn_lcz_grid_pdsi_label', summaryKey: 'fn_lcz_grid_pdsi_summary' },
  lcz_grid_pollution_ghap: { labelKey: 'fn_lcz_grid_pollution_ghap_label', summaryKey: 'fn_lcz_grid_pollution_ghap_summary' },
  lcz_grid_pollution_merra2: { labelKey: 'fn_lcz_grid_pollution_merra2_label', summaryKey: 'fn_lcz_grid_pollution_merra2_summary' },
  plot_grid_only: { labelKey: 'fn_plot_grid_only_label', summaryKey: 'fn_plot_grid_only_summary' },
  plot_lcz_relationship: { labelKey: 'fn_plot_lcz_relationship_label', summaryKey: 'fn_plot_lcz_relationship_summary' },
  lcz_clear_cache: { labelKey: 'fn_lcz_clear_cache_label', summaryKey: 'fn_lcz_clear_cache_summary' },
  lcz_ts: { labelKey: 'fn_lcz_ts_label', summaryKey: 'fn_lcz_ts_summary' },
  lcz_dtr: { labelKey: 'fn_lcz_dtr_label', summaryKey: 'fn_lcz_dtr_summary' },
  lcz_degree_hours: { labelKey: 'fn_lcz_degree_hours_label', summaryKey: 'fn_lcz_degree_hours_summary' },
  lcz_anomaly: { labelKey: 'fn_lcz_anomaly_label', summaryKey: 'fn_lcz_anomaly_summary' },
  lcz_anomaly_map: { labelKey: 'fn_lcz_anomaly_map_label', summaryKey: 'fn_lcz_anomaly_map_summary' },
  lcz_uhi_intensity: { labelKey: 'fn_lcz_uhi_intensity_label', summaryKey: 'fn_lcz_uhi_intensity_summary' },
  lcz_uhi_surface: { labelKey: 'fn_lcz_uhi_surface_label', summaryKey: 'fn_lcz_uhi_surface_summary' },
  lcz_interp_map: { labelKey: 'fn_lcz_interp_map_label', summaryKey: 'fn_lcz_interp_map_summary' },
  lcz_interp_eval: { labelKey: 'fn_lcz_interp_eval_label', summaryKey: 'fn_lcz_interp_eval_summary' },
  lcz_interp_map_plus: { labelKey: 'fn_lcz_interp_map_plus_label', summaryKey: 'fn_lcz_interp_map_plus_summary' },
  lcz_interp_eval_plus: { labelKey: 'fn_lcz_interp_eval_plus_label', summaryKey: 'fn_lcz_interp_eval_plus_summary' },
  lcz_plot_interp: { labelKey: 'fn_lcz_plot_interp_label', summaryKey: 'fn_lcz_plot_interp_summary' },
  lcz_variogram: { labelKey: 'fn_lcz_variogram_label', summaryKey: 'fn_lcz_variogram_summary' },
  lcz_climate_compute_spi: { labelKey: 'fn_lcz_climate_compute_spi_label', summaryKey: 'fn_lcz_climate_compute_spi_summary' },
  lcz_climate_compute_spei: { labelKey: 'fn_lcz_climate_compute_spei_label', summaryKey: 'fn_lcz_climate_compute_spei_summary' },
  lcz_utci: { labelKey: 'fn_lcz_utci_label', summaryKey: 'fn_lcz_utci_summary' },
  lcz_anthropogenic_heat: { labelKey: 'fn_lcz_anthropogenic_heat_label', summaryKey: 'fn_lcz_anthropogenic_heat_summary' },
}

/** Plain-language labels for common parameter snake_case names. */
const PARAM_LABELS: Record<string, string> = {
  city: 'City name',
  roi: 'Region of interest (ROI)',
  lcz_map: 'LCZ map',
  lcz_path: 'LCZ map path',
  x: 'LCZ map',
  data_frame: 'Station data',
  data: 'Input data',
  stations: 'Station data',
  start_date: 'Start date',
  end_date: 'End date',
  years: 'Years',
  months: 'Months',
  var: 'Variable',
  variable_name: 'Variable name',
  station_id: 'Station ID',
  method: 'Method',
  plot_type: 'Plot type',
  iselect: 'LCZ classes to include',
  pollutants: 'Pollutants',
  degree_type: 'Degree-hour type',
  base_temp: 'Base temperature',
  output: 'Output type',
  style: 'Publication style',
  add_scalebar: 'Add scale bar',
  add_north_arrow: 'Add north arrow',
  save_extension: 'Export format',
  isave: 'Save output',
  renderer: 'Map renderer',
  source: 'Data source',
  collection: 'Image collection',
  band: 'Band',
  colorscale: 'Color scale',
  grid: 'Grid layer',
  grid_result: 'Previous grid result',
  time_freq: 'Time frequency',
  by: 'Group by',
  sp: 'Spatial resolution',
  sp_res: 'Spatial resolution',
  iplot: 'Show plot',
  impute: 'Fill missing values',
  vg_model: 'Variogram model',
  nmax: 'Max neighbors',
  nmin: 'Min neighbors',
  maxdist: 'Max distance',
  air_temp: 'Air temperature',
  wind_speed: 'Wind speed',
  relative_humidity: 'Relative humidity',
  lcz_classes: 'LCZ classes',
  scale: 'Timescale',
  lang: 'Language',
  use_webgl: 'Use WebGL',
  use_geoarrow: 'Use GeoArrow',
  use_duckdb: 'Use DuckDB',
  max_pixels: 'Max pixels',
  data_type: 'Data type',
  add_basemap: 'Add basemap',
}

export function humanize(value: string): string {
  if (PARAM_LABELS[value]) return PARAM_LABELS[value]
  return value
    .replace(/^lcz_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getFunctionGuide(functionId: string): FunctionGuide {
  return FUNCTION_GUIDES[functionId] ?? {
    labelKey: 'fn_fallback_label',
    summaryKey: 'fn_fallback_summary',
  }
}

/** Resolve a friendly display label for a backend function id. */
export function getFunctionLabelKey(functionId: string): string {
  return getFunctionGuide(functionId).labelKey
}
