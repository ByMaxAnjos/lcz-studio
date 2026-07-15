# LCZ Studio

A free and open-source, lightweight, cloud-native GIS platform for visualizing, exploring, and analyzing Urban Climate Zones (LCZ) from the LCZ4r R package. Designed for desktop, web browser, and mobile platforms.

## 🌍 Overview

LCZ Studio enables urban climate researchers and practitioners to:

- **Visualize** Local Climate Zone classifications on interactive maps
- **Analyze** urban heat island (UHI) intensity and thermal anomalies
- **Explore** climate parameters and their spatial distribution
- **Import** geospatial data (CSV, GeoJSON, GeoPackage, Shapefile)
- **Query** data using in-browser SQL with DuckDB-WASM Spatial
- **Export** analysis results and visualizations

## 🚀 Features

### Core Capabilities

- **Interactive Mapping**: MapLibre GL JS with deck.gl overlays
- **LCZ Classification**: 17-class color palette with built types and land cover types
- **Urban Heat Island Analysis**: UHI intensity calculation and visualization
- **Thermal Anomaly Detection**: Hotspot and coldspot identification
- **Climate Analysis**: Temperature profiles and trend analysis
- **Data Management**: Layer management with styling controls
- **Multilingual UI**: English, Portuguese, Spanish, Chinese

### Data Processing

- **In-Browser Queries**: DuckDB-WASM Spatial for fast geospatial queries
- **CSV/GeoJSON Import**: Drag-and-drop file upload with validation
- **Station Data Validation**: Automatic schema checking
- **Data Aggregation**: Group by LCZ class with statistics

### Visualization

- **LCZ Legend**: Full 17-class legend with descriptions
- **Statistics Panel**: Area, temperature, and class distribution
- **Climate Metrics**: Expandable metric cards with trends
- **Layer Styling**: Customizable colors, opacity, and strokes
- **Live Preview**: Real-time style updates

## 🏗️ Architecture

```
LCZ Studio
├── Frontend (React + TypeScript)
│   ├── UI Components (Toolbar, Sidebar, MapCanvas)
│   ├── Map Integration (MapLibre GL JS + deck.gl)
│   ├── Data Layer (DuckDB-WASM Spatial)
│   ├── Analysis Tools (UHI, Thermal Anomaly)
│   └── State Management (Zustand)
├── Desktop (Tauri v2 + Rust)
│   ├── Window Management
│   ├── File System Access
│   └── Native Integration
└── Backend (Optional R integration)
    └── LCZ4r R package functions
```

## 📋 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI** | React 18, TypeScript, TailwindCSS | User interface |
| **Map** | MapLibre GL JS, deck.gl | Interactive mapping |
| **Data** | DuckDB-WASM Spatial | In-browser SQL queries |
| **Desktop** | Tauri v2, Rust | Cross-platform desktop app |
| **State** | Zustand | State management |
| **Build** | Vite, npm workspaces | Build tooling |

## 📦 Project Structure

```
lcz-studio/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── store/            # Zustand state management
│   │   ├── map/              # MapLibre & deck.gl integration
│   │   ├── data/             # DuckDB & data import
│   │   ├── analysis/         # UHI & thermal analysis
│   │   ├── utils/            # Utilities (LCZ palette, etc)
│   │   ├── i18n/             # Translations
│   │   ├── App.tsx           # Main component
│   │   └── index.css         # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── desktop/                  # Tauri v2 desktop app
│   ├── src-tauri/
│   │   ├── src/              # Rust code
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── README.md
├── package.json              # Root monorepo config
└── README.md                 # This file
```

## 📥 Download (End Users)

Prebuilt desktop apps are published on the [GitHub Releases](../../releases) page — no build tools required.

- **macOS**: download the `.dmg`, drag LCZ Studio into Applications. The app is **not code-signed**, so macOS Gatekeeper will initially refuse to open it ("cannot verify developer"). To allow it once: right-click the app → **Open** → confirm in the dialog. Or from Terminal: `xattr -cr "/Applications/LCZ Studio.app"`.
- **Windows**: download the installer (`.msi` or `.exe`). SmartScreen may warn about an unrecognized publisher — click **More info → Run anyway**.
- **Linux**: download the `.AppImage` (make it executable: `chmod +x`) or the `.deb`.

## 🚀 Getting Started (Development)

### Prerequisites

- Node.js 18+
- Rust 1.60+ (for desktop builds)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lcz-studio.git
cd lcz-studio

# Install dependencies
npm install
```

### Development

#### Web Browser

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

#### Desktop (Tauri)

```bash
cd desktop
npm run tauri dev
```

### Build

#### Web

```bash
npm run build:web
# Output: frontend/dist/
```

#### Desktop

```bash
npm run build:desktop
# Output: desktop/src-tauri/target/release/
```

## 📖 Usage

### Importing Data

1. Click **Add Data** in the sidebar
2. Drag and drop a CSV or GeoJSON file
3. Validate the data schema
4. Data is loaded into DuckDB-WASM Spatial

### Creating Layers

1. Click **➕** in the Layer Manager
2. Configure layer name and type
3. Use Layer Styler to customize appearance
4. Toggle visibility with checkbox

### Analyzing LCZ

1. Select workspace (General or Local)
2. Choose analysis tool from sidebar
3. View results in bottom panel
4. Export or save visualizations

### Climate Analysis

1. Load station data with temperature values
2. View UHI intensity in Climate Analysis panel
3. Identify hotspots and coldspots
4. Generate thermal anomaly report

## 🌐 Multilingual Support

LCZ Studio supports multiple languages:

- **English** (en)
- **Português** (pt) - Brazilian Portuguese
- **Español** (es) - Spanish
- **中文** (zh) - Simplified Chinese

Change language in the toolbar language selector.

## 📊 Data Format

### CSV Format

Required columns for station data:

```csv
date,station,var,lat,lon,value
2024-01-01,STATION_A,temperature,23.5505,-46.6333,25.5
2024-01-01,STATION_B,temperature,23.5505,-46.6333,24.2
```

### GeoJSON Format

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-46.6333, 23.5505]
      },
      "properties": {
        "lcz_class": 2,
        "temperature": 25.5
      }
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Frontend
VITE_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty
VITE_DEFAULT_CENTER=0,20
VITE_DEFAULT_ZOOM=2
VITE_PUBLIC_WEB_APP_URL=https://your-public-lcz-studio-url.example

# Desktop
RUST_LOG=debug
```

### Tauri Configuration

Edit `desktop/src-tauri/tauri.conf.json` to customize:

- Window size and appearance
- Security settings
- Bundle targets
- App icons

## 📚 API Reference

### Store (Zustand)

```typescript
import { useStore } from '@/store/useStore'

const { language, layers, addLayer, updateLayer } = useStore()
```

### MapLibre Manager

```typescript
import { mapLibreManager } from '@/map/MapLibreManager'

const map = mapLibreManager.initialize(config)
mapLibreManager.addRasterLayer(id, sourceId, opacity)
```

### DuckDB

```typescript
import { executeSQLQuery, loadGeoJSON } from '@/data/duckdb'

const results = await executeSQLQuery('SELECT * FROM table')
await loadGeoJSON('features', geojsonData)
```

### UHI Calculator

```typescript
import { getUHIIntensity, calculateTemperatureProfile } from '@/analysis/uhiCalculator'

const result = getUHIIntensity({ lczClass: 2, temperature: 25.5, referenceTemperature: 20 })
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **LCZ4r**: Urban Climate Zone classification for R
- **MapLibre GL JS**: Open-source mapping library
- **deck.gl**: Large-scale web-based visualization
- **DuckDB**: In-process SQL OLAP database
- **Tauri**: Lightweight cross-platform desktop framework

## 📞 Support

For issues, questions, or suggestions:

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/lcz-studio/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/yourusername/lcz-studio/discussions)
- **Documentation**: [Read the docs](https://lcz-studio.readthedocs.io)

## 🗺️ Roadmap

### v0.2.0 (Q2 2024)

- [ ] R backend integration (LCZ4r)
- [ ] Advanced styling with data-driven properties
- [ ] Time series animation
- [ ] Export to GeoPackage

### v0.3.0 (Q3 2024)

- [ ] Mobile app (iOS/Android)
- [ ] Cloud storage integration
- [ ] Collaborative editing
- [ ] Real-time data streaming

### v1.0.0 (Q4 2024)

- [ ] Production-ready release
- [ ] Comprehensive documentation
- [ ] Community plugins system
- [ ] Commercial support options

## 📝 Citation

If you use LCZ Studio in your research, please cite:

```bibtex
@software{lcz_studio_2024,
  title={LCZ Studio: Urban Climate Analysis Platform},
  author={Your Name},
  year={2024},
  url={https://github.com/yourusername/lcz-studio}
}
```

---

**Made with ❤️ for urban climate researchers and practitioners**
