import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/noto-sans/cyrillic-400.css'
import '@fontsource/noto-sans/cyrillic-500.css'
import '@fontsource/noto-sans/cyrillic-600.css'
import '@fontsource/noto-sans/cyrillic-700.css'
import '@fontsource/noto-sans/cyrillic-800.css'
import './index.css'
import { initializeTheme } from './themeRuntime'

initializeTheme()
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/staff/sw.js'))
}
