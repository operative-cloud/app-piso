import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

if (navigator.storage?.persist) navigator.storage.persist() // evita que el sistema borre la caché local

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
