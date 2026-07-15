export interface FunctionGuide {
  label: string
  summary: string
  inputHint: string
  outputHint: string
}

const FUNCTION_GUIDES: Record<string, FunctionGuide> = {
  lcz_get_map: {
    label: 'Download LCZ Coverage',
    summary: 'Download a standardized LCZ raster for a city or region and use it as the starting point for all map-driven analysis.',
    inputHint: 'Input: city or ROI',
    outputHint: 'Output: LCZ map',
  },
  lcz_get_map_generator: {
    label: 'Download Generator LCZ',
    summary: 'Fetch an LCZ map from a user-submitted LCZ Generator job when you need a custom classification run.',
    inputHint: 'Input: generator ID',
    outputHint: 'Output: LCZ map',
  },
  lcz_get_map2: {
    label: 'Clip LCZ Coverage',
    summary: 'Trim an existing LCZ raster to a city boundary or region of interest so it matches the analysis footprint.',
    inputHint: 'Input: source raster + city',
    outputHint: 'Output: clipped LCZ map',
  },
  lcz_get_map_usa: {
    label: 'Download US LCZ Coverage',
    summary: 'Download the US regional LCZ map variant when your study area falls inside the CONUS coverage.',
    inputHint: 'Input: city',
    outputHint: 'Output: LCZ map',
  },
  lcz_get_map_euro: {
    label: 'Download Europe LCZ Coverage',
    summary: 'Download the European LCZ map variant for LCZ workflows over the European coverage area.',
    inputHint: 'Input: city',
    outputHint: 'Output: LCZ map',
  },
  lcz_plot_map: {
    label: 'Preview LCZ Coverage',
    summary: 'Render the map in an interactive browser view so class patterns and spatial context are easy to inspect.',
    inputHint: 'Input: LCZ map',
    outputHint: 'Output: plot',
  },
  lcz_get_parameters: {
    label: 'Extract Morphology Metrics',
    summary: 'Extract the 34 Stewart and Oke morphological and thermal parameters for each LCZ class and turn them into analysis-ready outputs.',
    inputHint: 'Input: LCZ map',
    outputHint: 'Output: parameter raster',
  },
  lcz_plot_parameters: {
    label: 'Preview Morphology Metrics',
    summary: 'Plot the parameter rasters so the LCZ class structure is easier to compare field by field.',
    inputHint: 'Input: parameter raster',
    outputHint: 'Output: plots',
  },
  lcz_get_ucp: {
    label: 'Extract Urban Canopy Metrics',
    summary: 'Derive the urban canopy parameters that summarize built-form structure and urban geometry for each LCZ class.',
    inputHint: 'Input: LCZ map',
    outputHint: 'Output: UCP raster',
  },
  lcz_cal_area: {
    label: 'Calculate LCZ Area',
    summary: 'Compute how much area each LCZ class occupies and present the result as a chart-friendly summary.',
    inputHint: 'Input: LCZ map',
    outputHint: 'Output: plot + table',
  },
  lcz_cal_indices: {
    label: 'Compute Satellite Indices',
    summary: 'Compute LCZ-wise spectral indices from satellite inputs so you can compare vegetation, built-up, and bare-surface signals.',
    inputHint: 'Input: satellite scene',
    outputHint: 'Output: plot + table',
  },
  lcz_cal_indexes: {
    label: 'Compute Satellite Indices',
    summary: 'Compute LCZ-wise spectral indices from satellite inputs so you can compare vegetation, built-up, and bare-surface signals.',
    inputHint: 'Input: satellite scene',
    outputHint: 'Output: plot + table',
  },
  lcz_get_indices: {
    label: 'Collect Satellite Indices',
    summary: 'Retrieve or summarize satellite-derived indices for LCZ comparison workflows.',
    inputHint: 'Input: satellite scene + LCZ map',
    outputHint: 'Output: table',
  },
  lcz_get_lst: {
    label: 'Get Land Surface Temperature',
    summary: 'Fetch land surface temperature products cropped to the LCZ footprint so surface heat patterns stay aligned with the map.',
    inputHint: 'Input: LCZ map + date window',
    outputHint: 'Output: LST series',
  },
  lcz_get_planetary_computer: {
    label: 'Load Planetary Computer Imagery',
    summary: 'Pull multispectral imagery from Microsoft Planetary Computer and keep it aligned with the LCZ footprint.',
    inputHint: 'Input: LCZ map + scene selection',
    outputHint: 'Output: imagery',
  },
  lcz_list_pc_assets: {
    label: 'List Planetary Computer Assets',
    summary: 'List the Planetary Computer assets available for a given LCZ footprint or scene request.',
    inputHint: 'Input: footprint query',
    outputHint: 'Output: asset list',
  },
  lcz_grid_chirps: {
    label: 'CHIRPS Grid',
    summary: 'Project CHIRPS precipitation onto the LCZ grid so rainfall patterns can be compared with urban form.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  lcz_grid_era5: {
    label: 'ERA5-Land Grid',
    summary: 'Project ERA5-Land climate fields onto the LCZ grid for a city-scale climate view.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  lcz_grid_era5_global: {
    label: 'Global ERA5 Grid',
    summary: 'Project global ERA5 fields onto the LCZ grid when the regional variant is not enough.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  lcz_grid_pdsi: {
    label: 'PDSI Grid',
    summary: 'Bring Palmer Drought Severity Index data onto the LCZ grid for drought exposure analysis.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  lcz_grid_pollution_ghap: {
    label: 'GHAP Pollution Grid',
    summary: 'Project GHAP air-pollution data onto the LCZ grid to compare exposure across zones.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  lcz_grid_pollution_merra2: {
    label: 'MERRA-2 Pollution Grid',
    summary: 'Project MERRA-2 air-pollution data onto the LCZ grid for a global air-quality comparison.',
    inputHint: 'Input: LCZ map + period',
    outputHint: 'Output: gridded map',
  },
  plot_grid_only: {
    label: 'Preview Grid',
    summary: 'Plot a gridded climate or environmental layer on its own so the structure is easy to inspect quickly.',
    inputHint: 'Input: gridded layer',
    outputHint: 'Output: plot',
  },
  plot_lcz_relationship: {
    label: 'Plot LCZ Relationship',
    summary: 'Visualize how a gridded environmental variable changes across LCZ classes.',
    inputHint: 'Input: LCZ map + gridded layer',
    outputHint: 'Output: plot',
  },
  lcz_clear_cache: {
    label: 'Clear LCZ Cache',
    summary: 'Remove cached LCZ assets when you want to reclaim disk space or refresh a stale download.',
    inputHint: 'Input: none',
    outputHint: 'Output: cleanup report',
  },
  lcz_ts: {
    label: 'LCZ Time Series',
    summary: 'Show LCZ-stratified station temperature series so you can see how each zone evolves over time.',
    inputHint: 'Input: LCZ map + station data',
    outputHint: 'Output: plot + table',
  },
  lcz_dtr: {
    label: 'Diurnal Temperature Range',
    summary: 'Summarize the daily temperature swing by LCZ class and compare day-night variability across stations.',
    inputHint: 'Input: LCZ map + station data',
    outputHint: 'Output: plot + table',
  },
  lcz_degree_hours: {
    label: 'Degree Hours',
    summary: 'Measure accumulated thermal exposure over time and express it as degree-hour summaries by LCZ.',
    inputHint: 'Input: LCZ map + station data',
    outputHint: 'Output: plot + table',
  },
  lcz_anomaly: {
    label: 'Temperature Anomalies',
    summary: 'Compare each station to the network mean and expose departures as tables and charts.',
    inputHint: 'Input: station data',
    outputHint: 'Output: plot + table',
  },
  lcz_anomaly_map: {
    label: 'Anomaly Surface',
    summary: 'Turn station anomalies into an interpolated surface so spatial gradients become visible.',
    inputHint: 'Input: station data + LCZ map',
    outputHint: 'Output: map',
  },
  lcz_uhi_intensity: {
    label: 'Canopy UHI',
    summary: 'Compute the classic canopy-layer urban heat island intensity from LCZ-stratified station data.',
    inputHint: 'Input: LCZ map + station data',
    outputHint: 'Output: plot + table',
  },
  lcz_uhi_surface: {
    label: 'Surface UHI',
    summary: 'Measure surface urban heat island patterns from satellite land surface temperature and the LCZ map.',
    inputHint: 'Input: LCZ map + LST',
    outputHint: 'Output: map + plot',
  },
  lcz_interp_map: {
    label: 'Spatial Interpolation',
    summary: 'Interpolate sparse station data into a continuous surface that can be evaluated alongside the LCZ map.',
    inputHint: 'Input: station data + LCZ map',
    outputHint: 'Output: map',
  },
  lcz_interp_eval: {
    label: 'Interpolation Evaluation',
    summary: 'Score the interpolation result so you can see how well the surface matches observed station data.',
    inputHint: 'Input: station data + LCZ map',
    outputHint: 'Output: table',
  },
  lcz_interp_map_plus: {
    label: 'ML Interpolation with UCP',
    summary: 'Use machine-learning interpolation with urban canopy parameters as predictors for a richer spatial surface.',
    inputHint: 'Input: station data + LCZ map + UCP',
    outputHint: 'Output: map',
  },
  lcz_interp_eval_plus: {
    label: 'ML Interpolation Check',
    summary: 'Evaluate the machine-learning interpolation workflow so you can compare it with geostatistical baselines.',
    inputHint: 'Input: station data + LCZ map + UCP',
    outputHint: 'Output: table',
  },
  lcz_plot_interp: {
    label: 'Preview Interpolation',
    summary: 'Visualize the interpolation result on its own, making the fitted surface easier to inspect and share.',
    inputHint: 'Input: interpolated surface',
    outputHint: 'Output: plot',
  },
  lcz_variogram: {
    label: 'Variogram Check',
    summary: 'Inspect spatial autocorrelation and fit quality before trusting the interpolation surface.',
    inputHint: 'Input: station data',
    outputHint: 'Output: plot + table',
  },
  lcz_climate_compute_spi: {
    label: 'SPI Drought',
    summary: 'Compute the standardized precipitation index at multiple timescales from monthly precipitation.',
    inputHint: 'Input: monthly precipitation table',
    outputHint: 'Output: plot + table',
  },
  lcz_climate_compute_spei: {
    label: 'SPEI Drought',
    summary: 'Compute the standardized precipitation-evapotranspiration index to capture warming-amplified drought risk.',
    inputHint: 'Input: monthly precipitation table',
    outputHint: 'Output: plot + table',
  },
  lcz_utci: {
    label: 'Thermal Comfort (UTCI)',
    summary: 'Estimate outdoor heat stress with the Universal Thermal Climate Index and LCZ-driven inputs.',
    inputHint: 'Input: station data + meteorology',
    outputHint: 'Output: plot + table',
  },
  lcz_anthropogenic_heat: {
    label: 'Anthropogenic Heat Flux',
    summary: 'Estimate the waste heat released by buildings, traffic, and people across LCZ classes.',
    inputHint: 'Input: LCZ map + climate drivers',
    outputHint: 'Output: plot + table',
  },
}

export function humanize(value: string): string {
  return value
    .replace(/^lcz_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getFunctionGuide(functionId: string): FunctionGuide {
  return FUNCTION_GUIDES[functionId] ?? {
    label: humanize(functionId),
    summary: 'Open the function, fill the required inputs, and review the output in Map or Viz depending on the result type.',
    inputHint: 'Input: see function fields',
    outputHint: 'Output: depends on run',
  }
}
