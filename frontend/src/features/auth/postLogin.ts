import type { Session } from '@/auth/session'

/** a donde ir despues de iniciar sesion */
export function destinoTrasLogin(session: Session, next?: string | null): string {
  if (session.tokenType === 'tenant') {
    return next && next.startsWith('/app') ? next : '/app'
  }
  // token de identidad: o elige negocio o solo tiene invitaciones
  if (session.businesses.length === 0 && session.pendingInvitations > 0) return '/invitations'
  return '/select-business'
}
