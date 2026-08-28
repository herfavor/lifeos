import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setDefaultOptions } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import './index.css'
import './styles/ux-polish.css'
import App from './App.tsx'
import { logBuildInfo } from './services/logger'

// Use Simplified Chinese as the default locale for all date-fns formatting
setDefaultOptions({ locale: zhCN })

// Log build info on startup (always visible in console for support/debugging)
logBuildInfo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
