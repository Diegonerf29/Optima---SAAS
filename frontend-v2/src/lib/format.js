// Funciones de formato de fechas, horas y precios para la interfaz de citas

/** Date local a "YYYY-MM-DD" sin pasar por UTC (evita el desfase de toISOString) */
export const ymd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

/** Minutos transcurridos entre dos instantes (ISO o Date) */
export const minutesBetween = (a, b) => (new Date(b) - new Date(a)) / 60000

/** "HH:mm" extraido de un LocalDateTime ISO del servidor ("...THH:mm:ss") */
export const hhmmFromIso = (iso) => String(iso).slice(11, 16)

/** Importe en euros con dos decimales y separador de miles local */
export const fmtEur = (n) =>
  Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

/** Normaliza un LocalTime ("HH:mm" o "HH:mm:ss") a "HH:mm:ss" */
export const toHms = (t) => {
  const parts = String(t ?? '').split(':')
  while (parts.length < 3) parts.push('00')
  return parts.slice(0, 3).map((p) => p.padStart(2, '0')).join(':')
}

/** "HH:mm" para mostrar una hora */
export const hhmm = (t) => toHms(t).slice(0, 5)

/** Fecha + hora legible a partir de un LocalDateTime ISO del servidor */
export const formatDateTime = (dt) =>
  new Date(dt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

/** Fecha larga ("lunes, 25 de mayo de 2026") a partir de un "YYYY-MM-DD" */
export const formatDateLong = (ymd) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

/** Suma de los precios congelados de los servicios reservados de una cita */
export const totalBooked = (bookedServices) =>
  ((bookedServices ?? []).reduce((acc, s) => acc + Number(s.appliedPrice || 0), 0)).toFixed(2)
