import type { MembershipSummary, TokenResponse } from '@/api/types'

/** datos que lleva dentro el token (no se verifica aqui: eso lo hace el backend) */
export type Claims = {
  sub: string
  userId: number
  businessId?: number
  role?: 'ADMIN' | 'EMPLOYEE'
  exp: number
}

export type Session = {
  token: string
  tokenType: 'tenant' | 'identity'
  claims: Claims
  businesses: MembershipSummary[]
  pendingInvitations: number
}

/*
 * el token se guarda en memoria y en sessionStorage (no en localStorage):
 * desaparece al cerrar el navegador y un script de otra pestaña no lo puede leer mas tarde
 */
const STORAGE_KEY = 'optima.session'

/** lee el contenido del token (la parte del medio, en base64url) */
export function decodeClaims(token: string): Claims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Claims
  } catch {
    return null
  }
}

export function sessionFrom(response: TokenResponse): Session | null {
  const claims = response.token ? decodeClaims(response.token) : null
  if (!response.token || !claims) return null
  return {
    token: response.token,
    tokenType: response.tokenType === 'identity' ? 'identity' : 'tenant',
    claims,
    businesses: response.businesses ?? [],
    pendingInvitations: response.pendingInvitations ?? 0,
  }
}

export function isExpired(session: Session): boolean {
  return session.claims.exp * 1000 <= Date.now()
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    return isExpired(session) ? null : session
  } catch {
    return null
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sin sessionStorage (modo privado estricto) la sesion vive solo en memoria
  }
}
