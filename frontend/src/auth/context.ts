import { createContext, useContext } from 'react'

import type { components } from '@/api/schema'
import type { Session } from '@/auth/session'

export type AuthContextValue = {
  session: Session | null
  /** true si la sesion se ha cerrado sola (caducada o cerrada en otro dispositivo) */
  expiredNotice: boolean
  clearExpiredNotice: () => void
  login: (email: string, password: string) => Promise<Session>
  register: (body: components['schemas']['RegisterRequest']) => Promise<Session>
  selectBusiness: (businessId: number) => Promise<Session>
  logout: () => void
  logoutEverywhere: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth se usa dentro de <AuthProvider>')
  return ctx
}

/** negocio y rol de la sesion actual; solo dentro de las rutas /app (token de negocio) */
export function useTenant() {
  const { session } = useAuth()
  const claims = session?.claims
  if (!claims?.businessId || !claims.role) {
    throw new Error('useTenant se usa dentro de las rutas de negocio')
  }
  return {
    businessId: claims.businessId,
    userId: claims.userId,
    role: claims.role,
    isAdmin: claims.role === 'ADMIN',
  }
}
