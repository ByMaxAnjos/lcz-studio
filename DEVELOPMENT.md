# Development Guide

Complete guide for developing and contributing to LCZ Studio.

## Table of Contents

1. [Setup](#setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Component Development](#component-development)
5. [Data Layer](#data-layer)
6. [Map Integration](#map-integration)
7. [Analysis Tools](#analysis-tools)
8. [Testing](#testing)
9. [Building](#building)
10. [Deployment](#deployment)

## Setup

### Prerequisites

- Node.js 18+ (`node --version`)
- Rust 1.60+ (`rustc --version`)
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/lcz-studio.git
cd lcz-studio

# Install dependencies
npm install

# Verify setup
npm run build:web
```

### IDE Setup

#### VS Code

Recommended extensions:

- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **Rust-analyzer** (rust-lang.rust-analyzer)
- **Tauri** (tauri-apps.tauri-vscode)

#### Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

## Project Structure

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Toolbar.tsx      # Top toolbar
│   │   ├── Sidebar.tsx      # Left sidebar
│   │   ├── MapCanvas.tsx    # Map container
│   │   ├── BottomPanel.tsx  # Results panel
│   │   ├── LayerManager.tsx # Layer management
│   │   ├── LayerStyler.tsx  # Layer styling
│   │   ├── DataTable.tsx    # Data display
│   │   ├── FileUpload.tsx   # File import
│   │   ├── LCZLegend.tsx    # LCZ legend
│   │   ├── LCZStatistics.tsx # Stats panel
│   │   └── ClimateAnalysisPanel.tsx
│   ├── store/               # State management
│   │   └── useStore.ts      # Zustand store
│   ├── map/                 # Map integration
│   │   ├── MapLibreManager.ts
│   │   ├── DeckGLManager.ts
│   │   └── cogHandler.ts
│   ├── data/                # Data layer
│   │   ├── duckdb.ts        # DuckDB integration
│   │   └── dataImporter.ts  # File import
│   ├── analysis/            # Analysis tools
│   │   ├── uhiCalculator.ts
│   │   └── thermalAnomalyAnalyzer.ts
│   ├── utils/               # Utilities
│   │   └── lczPalette.ts    # LCZ colors
│   ├── i18n/                # Translations
│   │   └── translations.ts
│   ├── App.tsx              # Main component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Desktop (`desktop/`)

```
desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   └── lib.rs           # Tauri setup
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Configuration
├── package.json
└── README.md
```

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start frontend dev server
cd frontend
npm run dev

# Terminal 2: Start desktop app (optional)
cd desktop
npm run tauri dev
```

### Hot Reload

- Frontend: Automatic with Vite
- Desktop: Automatic with Tauri dev server

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## Component Development

### Creating a New Component

```typescript
// src/components/MyComponent.tsx
import React from 'react'
import './MyComponent.css'

export interface MyComponentProps {
  title: string
  onAction?: () => void
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="my-component">
      <h3>{title}</h3>
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  )
}
```

### Styling

```css
/* src/components/MyComponent.css */
.my-component {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

.my-component h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d5016;
}

.my-component button {
  background: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.my-component button:hover {
  background: #45a049;
}
```

### Using State

```typescript
import { useStore } from '@/store/useStore'

export const MyComponent: React.FC = () => {
  const { language, layers, addLayer } = useStore()

  return (
    <div>
      <p>Language: {language}</p>
      <p>Layers: {layers.length}</p>
      <button onClick={() => addLayer({...})}>Add Layer</button>
    </div>
  )
}
```

## Data Layer

### DuckDB Integration

```typescript
import { initializeDuckDB, executeSQLQuery, loadGeoJSON } from '@/data/duckdb'

// Initialize
await initializeDuckDB()

// Load data
await loadGeoJSON('features', geojsonData)

// Query
const results = await executeSQLQuery('SELECT * FROM features WHERE lon > -46')
```

### Data Import

```typescript
import { importFile } from '@/data/dataImporter'

const result = await importFile(file)
if (result.success) {
  console.log(`Imported ${result.data?.length} records`)
} else {
  console.error(result.errors)
}
```

## Map Integration

### MapLibre GL JS

```typescript
import { mapLibreManager } from '@/map/MapLibreManager'

// Initialize
const map = mapLibreManager.initialize({
  container: mapContainer.current,
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [0, 20],
  zoom: 2,
})

// Add layer
mapLibreManager.addGeoJSONSource('features', geojsonData)
mapLibreManager.addFillLayer('features-fill', 'features', '#4caf50', 0.7)
```

### deck.gl Overlay

```typescript
import { deckGLManager } from '@/map/DeckGLManager'

// Initialize
deckGLManager.initialize({ map })

// Add layer
deckGLManager.addScatterplotLayer('points', data, (d) => [d.lon, d.lat])
```

## Analysis Tools

### UHI Calculator

```typescript
import { getUHIIntensity, calculateTemperatureProfile } from '@/analysis/uhiCalculator'

const result = getUHIIntensity({
  lczClass: 2,
  temperature: 25.5,
  referenceTemperature: 20,
})

console.log(`UHI Intensity: ${result.uhiIntensity}°C (${result.classification})`)
```

### Thermal Anomaly Analyzer

```typescript
import { detectThermalAnomalies, calculateAnomalyStats } from '@/analysis/thermalAnomalyAnalyzer'

const anomalies = detectThermalAnomalies(observations)
const stats = calculateAnomalyStats(anomalies)

console.log(`Mean Anomaly: ${stats.meanAnomaly.toFixed(2)}°C`)
```

## Testing

### Unit Tests

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Example Test

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders title', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

## Building

### Frontend Build

```bash
# Development build
npm run build:web

# Production build
npm run build:web -- --mode production

# Output: frontend/dist/
```

### Desktop Build

```bash
# Development build
npm run build:desktop -- --debug

# Production build
npm run build:desktop

# Output: desktop/src-tauri/target/release/
```

### Bundle Analysis

```bash
npm run build:web -- --analyze
```

## Deployment

### Web Deployment

```bash
# Build
npm run build:web

# Deploy to hosting (e.g., Vercel, Netlify)
vercel frontend/dist
```

### Desktop Distribution

```bash
# Build for all platforms
npm run build:desktop

# Outputs:
# - Linux: .AppImage, .deb
# - macOS: .dmg
# - Windows: .msi
```

## Debugging

### Frontend Debugging

```bash
# Chrome DevTools
# Press F12 in dev mode

# VS Code Debugger
# Add .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend"
    }
  ]
}
```

### Rust Debugging

```bash
# Enable debug logging
RUST_LOG=debug npm run tauri dev

# Use rust-gdb or lldb
rust-gdb ./target/debug/lcz-studio
```

## Performance Optimization

### Frontend

```typescript
// Use React.memo for expensive components
export const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>
})

// Use useMemo for expensive computations
const result = useMemo(() => expensiveCalculation(data), [data])

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // ...
}, [dependencies])
```

### Data Processing

```typescript
// Use DuckDB for aggregations instead of JavaScript
const result = await executeSQLQuery(`
  SELECT lcz_class, COUNT(*) as count
  FROM data
  GROUP BY lcz_class
`)
```

## Common Issues

### Issue: Build fails with "module not found"

**Solution**: Clear node_modules and reinstall

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tauri window doesn't appear

**Solution**: Check frontend is built and dev server is running

```bash
npm run build:web
npm run tauri dev
```

### Issue: Hot reload not working

**Solution**: Ensure Vite dev server is on correct port

```bash
# Check tauri.conf.json devUrl: "http://localhost:1420"
# Check frontend package.json dev script port
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tauri Documentation](https://tauri.app)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [deck.gl Documentation](https://deck.gl)
- [DuckDB Documentation](https://duckdb.org/docs/)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

Happy coding! 🚀
