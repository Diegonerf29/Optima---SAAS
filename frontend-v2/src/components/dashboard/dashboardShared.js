// constantes y helpers compartidos por el dashboard y sus tarjetas

// estados que cuentan como cita "activa" del dia (no canceladas ni cerradas)
export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS']

export const STATUS_LABELS = {
  PENDING:     'Pendiente',
  CONFIRMED:   'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
  NO_SHOW:     'No presentado',
}

// Colores para timeline y donut (paleta original del Dashboard)
export const STATUS_COLORS = {
  PENDING:     '#f97316',
  CONFIRMED:   '#3b82f6',
  IN_PROGRESS: '#0ea5e9',
  COMPLETED:   '#10b981',
  CANCELLED:   '#94a3b8',
  NO_SHOW:     '#f43f5e',
}

export const STATUS_CHIP = {
  PENDING:     'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  CONFIRMED:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  COMPLETED:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CANCELLED:   'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  NO_SHOW:     'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
}

export const STATUS_TABS = [
  { key: 'Todas',       label: 'Todas' },
  { key: 'PENDING',     label: 'Pendiente' },
  { key: 'CONFIRMED',   label: 'Confirmada' },
  { key: 'IN_PROGRESS', label: 'En curso' },
  { key: 'COMPLETED',   label: 'Completada' },
  { key: 'CANCELLED',   label: 'Cancelada' },
  { key: 'NO_SHOW',     label: 'No presentado' },
]

// Fecha larga con la primera letra en mayuscula ("Lunes, 15 de junio de 2026")
export const fullDate = (d) =>
  d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
   .replace(/^\w/, (c) => c.toUpperCase())

// Saludo segun la hora del dia
export const greeting = (d = new Date()) => {
  const h = d.getHours()
  if (h < 6)  return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

// Cuenta atras legible para la proxima cita ("en 25 min", "en 1 h 30 min")
export const countdownLabel = (mins) => {
  if (mins == null) return ''
  if (mins <= 0)    return 'ahora mismo'
  if (mins < 60)    return `en ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `en ${h} h ${m} min` : `en ${h} h`
}
