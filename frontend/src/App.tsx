import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Introduction } from './pages/Introduction'
import { Dashboard } from './pages/Dashboard'
import { ScenarioBuilder } from './pages/ScenarioBuilder'
import { ResearchAssistant } from './pages/ResearchAssistant'
import { MapView } from './pages/MapView'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Introduction />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/scenarios" element={<ScenarioBuilder />} />
                <Route path="/research" element={<ResearchAssistant />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
