import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts (eliminates Google Fonts network chain)
// Only import weights actually used in CSS to minimize font downloads
import '@fontsource/cormorant-garamond/600.css'  // headings only use 600
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
