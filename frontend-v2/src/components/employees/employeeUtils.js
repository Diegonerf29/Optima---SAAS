// helpers y constantes compartidas por la pagina de empleados, su tarjeta y su panel
// avatar y ymd viven en lib compartido; se reexportan para conservar el API del modulo
export { avatarColor } from '@/lib/avatar'
export { ymd } from '@/lib/format'

// etiquetas de los dias de la semana
export const DAYS_SHORT = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAYS_FULL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// valores iniciales de los formularios de horario y ausencia
export const emptySchedule = { dayOfWeek: '1', startTime: '09:00', endTime: '18:00' }
export const emptyAbsence = { startDateTime: '', endDateTime: '', reason: '' }

// formateo de fechas para las tarjetas y el panel
export const fmtAbsence = (dt) =>
  new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtSinceShort = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '')
    : '—'

export const fmtSinceLong = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

// dia de la semana de hoy con el lunes como 1 y el domingo como 7
export const todayDow = () => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export const telHref = (phone) => 'tel:' + String(phone || '').replace(/\s/g, '')
