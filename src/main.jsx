import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LovopolyLocal from './components/LovopolyLocal.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {import.meta.env.DEV && window.location.pathname === '/lovopoly-local' ? <LovopolyLocal /> : <App />}
  </React.StrictMode>,
)
