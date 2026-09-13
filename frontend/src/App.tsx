import { useEffect } from 'react'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { MainWorkspace } from './components/MainWorkspace'
import { initializeRSidecar } from './services/rService'
import { useStore } from './store/useStore'
import './App.css'

function App() {
  const language = useStore((s) => s.language)

  // Detect sidecar on startup (desktop: spawn via Tauri; web: probe localhost:8765)
  useEffect(() => {
    initializeRSidecar().catch((e) => console.warn('[App] Sidecar init failed:', e))
  }, [])

  // Arabic is the only RTL language in the catalog — flip document direction to match.
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  return (
    <div className="app-container">
      <div className="app-frame">
        <Toolbar />
        <div className="main-content">
          <Sidebar />
          <MainWorkspace />
        </div>
      </div>
    </div>
  )
}

export default App
