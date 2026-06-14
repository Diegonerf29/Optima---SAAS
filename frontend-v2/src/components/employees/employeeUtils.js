// helpers y constantes compartidas por la pagina de empleados, su tarjeta y su panel

// etiquetas de los dias de la semana
export const DAYS_SHORT = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D']
export const DAYS_FULL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// colores disponibles para el avatar del empleado
const AVATAR_COLORS = [
  'from-cyan-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-400 to-violet-500',
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
]
export const avatarColor = (id) => AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length]

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

export const ymd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// dia de la semana de hoy con el lunes como 1 y el domingo como 7
export const todayDow = () => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export const telHref = (phone) => 'tel:' + String(phone || '').replace(/\s/g, '')
