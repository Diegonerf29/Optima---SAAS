// Layout principal de la app: sidebar persistente y area de contenido con Outlet
import { Suspense, useCallback, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'

/** Spinner del area de contenido mientras se carga el chunk diferido de la pagina */
function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500" />
    </div>
  )
}

/** Layout de paginas protegidas: sidebar fijo en escritorio, panel en movil */
export function AppLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f4f7fe]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <img src="/logo-horizontal.svg" alt="OPTIMA" className="h-7 w-auto" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* key por ruta: si una vista falla al cargar, navegar a otra resetea el limite y reintenta */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
