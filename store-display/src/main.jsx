import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StoreApp from './StoreApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreApp />
  </StrictMode>,
)
