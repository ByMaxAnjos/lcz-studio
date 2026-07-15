# LCZ Studio — R Plumber Sidecar API
# Run via: Rscript -e "plumber::plumb('<path>')$run(host='127.0.0.1',port=8765)"

suppressPackageStartupMessages({
  library(plumber)
  library(jsonlite)
})

# ── Null-coalesce operator ───────────────────────────────────────────────────
`%||%` <- function(a, b) if (!is.null(a) && length(a) > 0) a else b

# ── Load LCZ4r (local dev path first, then installed package) ────────────────
local_pkg <- "/Users/co2map/Documents/CO2CityMap/CO2CityMap/packages/LZC4r"
tryCatch({
  if (dir.exists(local_pkg) && requireNamespace("pkgload", quietly = TRUE)) {
    pkgload::load_all(local_pkg, quiet = TRUE)
  } else {
    suppressPackageStartupMessages(library(LCZ4r))
  }
}, error = function(e) {
  suppressPackageStartupMessages(library(LCZ4r))
})

suppressPackageStartupMessages({
  library(terra)
  library(sf)
  library(ggplot2)
})

# ── Output directory ─────────────────────────────────────────────────────────
OUTPUT_DIR <- Sys.getenv("LCZ_OUTPUT_DIR", unset = file.path(tempdir(), "lcz-studio"))
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
message(sprintf("[LCZ Studio Sidecar] Output: %s", OUTPUT_DIR))

out_path <- function(...) file.path(OUTPUT_DIR, ...)

uid <- function() paste0(format(Sys.time(), "%Y%m%d_%H%M%S"), "_", sample.int(9999, 1))

safe_df <- function(x) tryCatch(as.data.frame(fromJSON(toJSON(x, auto_unbox = TRUE))), error = function(e) NULL)

save_raster <- function(r, stem) {
  p <- out_path(paste0(stem, "_", uid(), ".tif"))
  terra::writeRaster(r, p, overwrite = TRUE)
  p
}

save_plot <- function(p, stem, w = 10, h = 7) {
  path <- out_path(paste0(stem, "_", uid(), ".png"))
  ggplot2::ggsave(path, plot = p, width = w, height = h, dpi = 150, bg = "white")
  path
}

ok_r  <- function(r, stem) list(success = TRUE, tiff_path = save_raster(r, stem))
ok_p  <- function(p, stem, ...) list(success = TRUE, plot_path = save_plot(p, stem, ...))
err   <- function(msg) list(success = FALSE, error = as.character(msg))

require_tiff <- function(body) {
  if (is.null(body$tiff_path) || !file.exists(body$tiff_path))
    stop("tiff_path is required and must be a valid file path")
  terra::rast(body$tiff_path)
}

# ── CORS filter ───────────────────────────────────────────────────────────────
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (identical(req$REQUEST_METHOD, "OPTIONS")) { res$status <- 204L; return(list()) }
  plumber::forward()
}

# ── Health ────────────────────────────────────────────────────────────────────
#* @get /health
function() {
  list(
    status  = "ok",
    version = tryCatch(as.character(packageVersion("LCZ4r")), error = function(e) "dev"),
    r       = R.version$version.string
  )
}

# ── Map download ──────────────────────────────────────────────────────────────

#* Download global LCZ map for a city
#* @post /lcz/get-map
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  city <- trimws(body$city %||% "")
  if (!nzchar(city)) return(err("city is required"))
  tryCatch(
    ok_r(lcz_get_map(city = city, roi = NULL, isave_map = FALSE, isave_global = FALSE),
         paste0("lcz_", gsub("[^a-z0-9]", "_", tolower(city)))),
    error = function(e) err(e$message)
  )
}

#* Clip a pre-downloaded global raster
#* @post /lcz/get-map2
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x <- require_tiff(body)
    ok_r(lcz_get_map2(x = x, city = body$city %||% "", roi = NULL, isave_map = FALSE), "lcz_clipped")
  }, error = function(e) err(e$message))
}

#* Download from LCZ Generator
#* @post /lcz/get-map-generator
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  id <- body$ID %||% body$id
  if (is.null(id)) return(err("ID is required"))
  tryCatch(
    ok_r(lcz_get_map_generator(ID = id, band = body$band %||% "lczFilter", isave_map = FALSE),
         paste0("lcz_gen_", id)),
    error = function(e) err(e$message)
  )
}

#* Download USA LCZ map
#* @post /lcz/get-map-usa
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch(
    ok_r(lcz_get_map_usa(city = body$city %||% "", roi = NULL, isave_map = FALSE), "lcz_usa"),
    error = function(e) err(e$message)
  )
}

#* Download European LCZ map
#* @post /lcz/get-map-euro
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch(
    ok_r(lcz_get_map_euro(city = body$city %||% "", roi = NULL, isave_map = FALSE), "lcz_euro"),
    error = function(e) err(e$message)
  )
}

# ── Parameters & area ─────────────────────────────────────────────────────────

#* Extract LCZ urban parameters
#* @post /lcz/get-parameters
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x <- require_tiff(body)
    iselect <- body$iselect %||% "SVF"
    result <- lcz_get_parameters(x = x, iselect = iselect, istack = TRUE, isave = FALSE)
    list(success = TRUE, tiff_path = save_raster(result, "lcz_params"), parameters = iselect)
  }, error = function(e) err(e$message))
}

#* Calculate LCZ class areas
#* @post /lcz/cal-area
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x <- require_tiff(body)
    ok_p(lcz_cal_area(x = x, plot_type = body$plot_type %||% "bar", iplot = TRUE, isave = FALSE),
         "lcz_area")
  }, error = function(e) err(e$message))
}

#* Plot LCZ map
#* @post /lcz/plot-map
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x <- require_tiff(body)
    ok_p(lcz_plot_map(x = x, isave = FALSE, show_legend = TRUE), "lcz_map_plot")
  }, error = function(e) err(e$message))
}

# ── UHI ───────────────────────────────────────────────────────────────────────

#* UHI intensity analysis
#* @post /lcz/uhi-intensity
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x  <- require_tiff(body)
    df <- safe_df(body$data)
    if (is.null(df)) stop("Failed to parse station data")
    p  <- lcz_uhi_intensity(
      x = x, data_frame = df,
      var        = body$var        %||% "airT",
      station_id = body$station_id %||% "station",
      time.freq  = body$time_freq  %||% "hour",
      extract.method = body$extract_method %||% "simple",
      method     = body$method     %||% "LCZ",
      by         = body$by         %||% NULL,
      iplot = TRUE, isave = FALSE
    )
    ok_p(p, "uhi_intensity", w = 12)
  }, error = function(e) err(e$message))
}

# ── Anomaly ───────────────────────────────────────────────────────────────────

#* Temperature anomaly analysis
#* @post /lcz/anomaly
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x  <- require_tiff(body)
    df <- safe_df(body$data)
    if (is.null(df)) stop("Failed to parse station data")
    ok_p(lcz_anomaly(
      x = x, data_frame = df,
      var        = body$var        %||% "airT",
      station_id = body$station_id %||% "station",
      time.freq  = body$time_freq  %||% "hour",
      plot_type  = body$plot_type  %||% "diverging_bar",
      iplot = TRUE, isave = FALSE
    ), "anomaly")
  }, error = function(e) err(e$message))
}

#* Spatial kriging interpolation of anomalies
#* @post /lcz/anomaly-map
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x  <- require_tiff(body)
    df <- safe_df(body$data)
    if (is.null(df)) stop("Failed to parse station data")
    r <- lcz_anomaly_map(
      x = x, data_frame = df,
      var        = body$var        %||% "airT",
      station_id = body$station_id %||% "station",
      sp.res     = as.numeric(body$sp_res %||% 100),
      tp.res     = body$tp_res     %||% "hour",
      vg.model   = body$vg_model   %||% "Sph",
      LCZinterp  = isTRUE(body$LCZinterp),
      isave = FALSE
    )
    ok_r(r, "anomaly_map")
  }, error = function(e) err(e$message))
}

# ── Time series ───────────────────────────────────────────────────────────────

#* Time series analysis
#* @post /lcz/ts
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x  <- require_tiff(body)
    df <- safe_df(body$data)
    if (is.null(df)) stop("Failed to parse station data")
    ok_p(lcz_ts(
      x = x, data_frame = df,
      var        = body$var        %||% "airT",
      station_id = body$station_id %||% "station",
      time.freq  = body$time_freq  %||% "hour",
      plot_type  = body$plot_type  %||% "basic_line",
      by         = body$by         %||% NULL,
      smooth     = isTRUE(body$smooth),
      iplot = TRUE, isave = FALSE
    ), "time_series", w = 14)
  }, error = function(e) err(e$message))
}

# ── Interpolation evaluation ──────────────────────────────────────────────────

#* Cross-validation of kriging interpolation
#* @post /lcz/interp-eval
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x  <- require_tiff(body)
    df <- safe_df(body$data)
    if (is.null(df)) stop("Failed to parse station data")
    result <- lcz_interp_eval(
      x = x, data_frame = df,
      var        = body$var        %||% "airT",
      station_id = body$station_id %||% "station",
      LOOCV      = isTRUE(body$LOOCV %||% TRUE),
      sp.res     = as.numeric(body$sp_res %||% 100),
      tp.res     = body$tp_res   %||% "hour",
      vg.model   = body$vg_model %||% "Sph",
      LCZinterp  = isTRUE(body$LCZinterp),
      isave = FALSE
    )
    csv_path <- out_path(paste0("interp_eval_", uid(), ".csv"))
    write.csv(result, csv_path, row.names = FALSE)
    list(success = TRUE, csv_path = csv_path, n_rows = nrow(result))
  }, error = function(e) err(e$message))
}

#* Plot interpolated/anomaly raster
#* @post /lcz/plot-interp
function(req) {
  body <- tryCatch(fromJSON(req$postBody), error = function(e) list())
  tryCatch({
    x <- require_tiff(body)
    ok_p(lcz_plot_interp(x = x, isave = FALSE), "interp_plot")
  }, error = function(e) err(e$message))
}

# ── Utilities ─────────────────────────────────────────────────────────────────

#* Clear LCZ4r cache
#* @post /lcz/clear-cache
function() tryCatch({ lcz_clear_cache(); list(success = TRUE) }, error = function(e) err(e$message))

#* List output files
#* @get /output/list
function() {
  files <- list.files(OUTPUT_DIR, full.names = TRUE)
  list(success = TRUE, files = files, count = length(files))
}
