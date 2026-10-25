import { useEffect, useState } from 'react'

/** devuelve el valor cuando lleva un rato sin cambiar (para no buscar en cada tecla) */
export function useDebounce<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return debounced
}
