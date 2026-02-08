import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts — Latin subset only (English site, no need for cyrillic/vietnamese/latin-ext)
// Only import weights actually used in CSS
import '@fontsource/cormorant-garamond/latin-600.css'  // headings only use 600
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
