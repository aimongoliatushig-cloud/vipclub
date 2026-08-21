import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource/noto-sans/cyrillic-400.css'
import '@fontsource/noto-sans/cyrillic-ext-400.css'
import '@fontsource/noto-sans/cyrillic-500.css'
import '@fontsource/noto-sans/cyrillic-ext-500.css'
import '@fontsource/noto-sans/cyrillic-600.css'
import '@fontsource/noto-sans/cyrillic-ext-600.css'
import '@fontsource/noto-sans/cyrillic-700.css'
import '@fontsource/noto-sans/cyrillic-ext-700.css'
import '@fontsource/noto-sans/cyrillic-800.css'
import '@fontsource/noto-sans/cyrillic-ext-800.css'
import '@fontsource/noto-sans/cyrillic-900.css'
import '@fontsource/noto-sans/cyrillic-ext-900.css'
import '@fontsource/noto-serif/cyrillic-600.css'
import '@fontsource/noto-serif/cyrillic-ext-600.css'
import '@fontsource/noto-serif/cyrillic-700.css'
import '@fontsource/noto-serif/cyrillic-ext-700.css'
import '@fontsource/noto-serif/cyrillic-800.css'
import '@fontsource/noto-serif/cyrillic-ext-800.css'
import '@fontsource/noto-serif/cyrillic-900.css'
import '@fontsource/noto-serif/cyrillic-ext-900.css'
import App from './App'
import './styles.css'
import './premium.css'
import './detail.css'
import './theme.css'
import { initializeTheme } from './themeRuntime'

initializeTheme()
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)

if(import.meta.env.PROD&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    const serviceWorkerUrl=new URL('sw.js',document.baseURI)
    const scope=new URL('.',document.baseURI).pathname
    navigator.serviceWorker.register(serviceWorkerUrl,{scope}).catch(()=>{})
  })
}
