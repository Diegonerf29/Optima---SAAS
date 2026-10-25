import { useEffect, useState } from 'react'

/** la hora actual, refrescada cada minuto (el PC de recepcion deja la pantalla abierta todo el dia) */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
