import { useEffect } from 'react'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { MainWorkspace } from './components/MainWorkspace'
import { initializeRSidecar } from './services/rService'
import './App.css'

function App() {
  // Detect sidecar on startup (desktop: spawn via Tauri; web: probe localhost:8765)
  useEffect(() => {
    initializeRSidecar().catch((e) => console.warn('[App] Sidecar init failed:', e))
  }, [])

  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-content">
        <Sidebar />
        <MainWorkspace />
      </div>
    </div>
  )
}

export default App
