import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { api, connectSession, unwrap } from '@/api/client'
import type { TokenResponse } from '@/api/types'
import { AuthContext, type AuthContextValue } from '@/auth/context'
import { isExpired, loadSession, saveSession, sessionFrom, type Session } from '@/auth/session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSessionState] = useState<Session | null>(() => loadSession())
  const sessionRef = useRef(session)
  const [expiredNotice, setExpiredNotice] = useState(false)

  const setSession = useCallback(
    (next: Session | null) => {
      sessionRef.current = next
      saveSession(next)
      setSessionState(next)
      // los datos en cache eran de la sesion anterior
      queryClient.clear()
    },
    [queryClient],
  )

  const applyToken = useCallback(
    (response: TokenResponse) => {
      const next = sessionFrom(response)
      if (!next) throw new Error('Respuesta de inicio de sesión no válida')
      setSession(next)
      return next
    },
    [setSession],
  )

  // el cliente HTTP pide el token aqui y avisa de los 401
  useEffect(() => {
    connectSession({
      getToken: () => sessionRef.current?.token ?? null,
      onUnauthorized: () => {
        if (sessionRef.current) {
          setExpiredNotice(true)
          setSession(null)
        }
      },
    })
  }, [setSession])

  // cierre automatico cuando caduca el token
  useEffect(() => {
    if (!session) return
    const ms = session.claims.exp * 1000 - Date.now()
    const timer = window.setTimeout(
      () => {
        if (sessionRef.current && isExpired(sessionRef.current)) {
          setExpiredNotice(true)
          setSession(null)
        }
      },
      Math.max(ms, 0),
    )
    return () => window.clearTimeout(timer)
  }, [session, setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      expiredNotice,
      clearExpiredNotice: () => setExpiredNotice(false),
      async login(email, password) {
        setExpiredNotice(false)
        return applyToken(await unwrap(api.POST('/api/auth/token', { body: { email, password } })))
      },
      async register(body) {
        return applyToken(await unwrap(api.POST('/api/auth/register', { body })))
      },
      async selectBusiness(businessId) {
        const response = await unwrap(api.POST('/api/auth/select-business/{businessId}', { params: { path: { businessId } } }))
        // se conserva la lista de negocios para poder cambiar de negocio despues
        const next = applyToken({ ...response, businesses: sessionRef.current?.businesses })
        return next
      },
      logout() {
        setSession(null)
      },
      async logoutEverywhere() {
        try {
          await unwrap(api.POST('/api/auth/logout-all'))
        } finally {
          setSession(null)
        }
      },
    }),
    [session, expiredNotice, applyToken, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
