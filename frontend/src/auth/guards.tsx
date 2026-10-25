import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth, useTenant } from '@/auth/context'
import { EmptyState } from '@/components/common/States'

/** rutas que necesitan haber iniciado sesion */
export function RequireSession() {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <Outlet />
}

/** rutas de un negocio: hace falta haber elegido negocio (token "tenant") */
export function RequireTenant() {
  const { session } = useAuth()
  if (session?.tokenType !== 'tenant') return <Navigate to="/select-business" replace />
  return <Outlet />
}

/**
 * login y registro: si al entrar ya hay sesion se va directamente a la agenda
 * solo se mira al entrar: si la sesion empieza aqui (login o registro), es la propia pagina
 * la que decide a donde ir (por ejemplo, el registro lleva a la configuracion)
 */
export function PublicOnly() {
  const { session } = useAuth()
  const [yaHabiaSesion] = useState(() => session?.tokenType === 'tenant')
  if (yaHabiaSesion) return <Navigate to="/app" replace />
  return <Outlet />
}

/**
 * contenido solo para administracion
 * ojo: es solo visual, la seguridad de verdad la aplica el backend en cada peticion
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useTenant()
  if (!isAdmin) {
    return <EmptyState title="Solo para administración" description="Pide a la persona que administra el negocio que haga este cambio." />
  }
  return <>{children}</>
}
