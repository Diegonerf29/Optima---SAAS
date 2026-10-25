import { useState } from 'react'

/**
 * lee ?token= de la direccion y lo quita enseguida (B16): asi no se queda en el historial
 * del navegador ni se envia a otras webs en la cabecera Referer
 */
export function useTokenFromUrl(): string | null {
  const [token] = useState(() => {
    const url = new URL(window.location.href)
    const value = url.searchParams.get('token')
    if (value) {
      url.searchParams.delete('token')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
    return value
  })
  return token
}
