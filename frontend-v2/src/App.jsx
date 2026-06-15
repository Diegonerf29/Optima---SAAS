// Punto de entrada de rutas y proveedores globales de la aplicacion
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { CatalogProvider } from '@/context/CatalogContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import Login from '@/pages/Login'

// Carga diferida del resto de rutas para dividir el bundle por pagina; Login
// se queda estatico por ser la pantalla de entrada mas frecuente y Register
// arrastra Leaflet (~150 kB), que asi sale del chunk inicial
const Register       = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('@/pages/ResetPassword'))
const Dashboard      = lazy(() => import('@/pages/Dashboard'))
const Clientes       = lazy(() => import('@/pages/Clientes'))
const Empleados      = lazy(() => import('@/pages/Empleados'))
const Catalogo       = lazy(() => import('@/pages/Catalogo'))
const Citas          = lazy(() => import('@/pages/Citas'))
const Calendario     = lazy(() => import('@/pages/Calendario'))
const Configuracion  = lazy(() => import('@/pages/Configuracion'))
const Perfil         = lazy(() => import('@/pages/Perfil'))

/** Spinner a pantalla completa para las rutas publicas diferidas */
function FullScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500" />
    </div>
  )
}

/** Rutas principales de la aplicacion */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CatalogProvider>
            {/* Limite para las rutas publicas; las protegidas tienen el suyo en AppLayout */}
            <ErrorBoundary>
              <Suspense fallback={<FullScreenFallback />}>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/empleados" element={<Empleados />} />
                  <Route path="/catalogo" element={<Catalogo />} />
                  <Route path="/citas" element={<Citas />} />
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                  <Route path="/perfil" element={<Perfil />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </CatalogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
