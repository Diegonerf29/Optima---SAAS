import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

// Limite raiz: red de seguridad ante un fallo de los proveedores o el router que
// dejaria la app en blanco; las rutas tienen sus propios limites mas internos
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary
      title="Algo ha ido mal"
      description="La aplicación ha encontrado un error inesperado. Recarga la página para continuar."
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
