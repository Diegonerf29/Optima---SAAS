// constantes y helpers compartidos por la pagina de citas y la tarjeta de cita
import { ymd, minutesBetween } from '@/lib/format'

// Degradado del bloque de fecha de cada tarjeta, segun el estado
export const TINTS = {
  PENDING:     'from-amber-400 to-orange-500',
  CONFIRMED:   'from-blue-500 to-indigo-500',
  IN_PROGRESS: 'from-cyan-400 to-blue-500',
  COMPLETED:   'from-emerald-400 to-teal-500',
  CANCELLED:   'from-slate-400 to-slate-500',
  NO_SHOW:     'from-slate-400 to-slate-500',
}

// Punto de color del estado en las pestanas de filtro
export const STATUS_DOT = {
  PENDING:     'bg-orange-500',
  CONFIRMED:   'bg-blue-500',
  IN_PROGRESS: 'bg-sky-500',
  COMPLETED:   'bg-emerald-500',
  CANCELLED:   'bg-slate-400',
  NO_SHOW:     'bg-rose-500',
}

// D3: estados terminales en los que NO se muestra el chip "Pasada" (la cita
// ya fue cerrada manualmente por el admin, su pasado es esperado)
export const STATES_CERRADOS = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW'])

// Devuelve {from, to} para un preset
export const datePreset = (key) => {
  const today = new Date()
  const mondayOf = (d) => {
    const x = new Date(d)
    const wd = x.getDay() === 0 ? 7 : x.getDay()
    x.setDate(x.getDate() - (wd - 1))
    return x
  }
  switch (key) {
    case 'today':     return { from: ymd(today), to: ymd(today) }
    case 'tomorrow': {
      const t = new Date(today); t.setDate(t.getDate() + 1)
      return { from: ymd(t), to: ymd(t) }
    }
    case 'week': {
      const mon = mondayOf(today)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: ymd(mon), to: ymd(sun) }
    }
    case 'next7': {
      const end = new Date(today); end.setDate(today.getDate() + 6)
      return { from: ymd(today), to: ymd(end) }
    }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      const last  = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: ymd(first), to: ymd(last) }
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last  = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: ymd(first), to: ymd(last) }
    }
    default: return { from: '', to: '' }
  }
}

// Duracion legible entre dos instantes ISO ("45 min", "1 h 30 min")
export const formatDuration = (a, b) => {
  const m = minutesBetween(a, b)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h <= 0) return `${m} min`
  return r ? `${h} h ${r} min` : `${h} h`
}

// Tiempo restante legible para el banner "en curso"
export const fmtMinsLeft = (m) => {
  if (m <= 0) return 'ahora mismo'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
