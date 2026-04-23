import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { StoreProvider } from './context/StoreContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './styles/globals.scss'
import './styles/tailwind.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <AppProvider>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </AppProvider>
    </StoreProvider>
  </StrictMode>,
)
