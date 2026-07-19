import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import DriverAppErrorBoundary from '@/components/driver/DriverAppErrorBoundary'
import 'leaflet/dist/leaflet.css'
import '@/index.css'
import '@/styles/driverMapTheme.css'
import '@/styles/driverAuthTheme.css'
import '@/styles/driverLaunchTheme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <DriverAppErrorBoundary>
    <App />
  </DriverAppErrorBoundary>
)
