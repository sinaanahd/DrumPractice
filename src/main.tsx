import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initializeDatabase } from './db/database'
import './styles.css'

registerSW({ immediate: true })
initializeDatabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
})
