import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import MyMapsPage from './pages/MyMapsPage.jsx'
import MapViewer from './pages/MapViewer.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/"               element={<LandingPage />} />
          <Route path="/editor"         element={<App />} />
          <Route path="/editor/:mapId"  element={<App />} />
          <Route path="/maps"           element={<MyMapsPage />} />
          <Route path="/map/:mapId"     element={<MapViewer />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
