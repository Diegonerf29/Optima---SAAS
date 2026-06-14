// constantes y helpers compartidos por las pestanas de configuracion

export const DAYS       = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const CARD = 'bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]'
export const TH   = 'px-6 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider'

export const emptyTax   = { name: '', percentage: '' }
export const emptyHour  = { dayOfWeek: '1', startTime: '09:00', endTime: '18:00', isClosed: false }

export const emptyBooth = { name: '', color: '' }

// [L] Paleta de la cabina en el calendario Mismos nombres que en
// membershipscolor y components/calendar/utilsjs Varias cabinas pueden
// compartir color a proposito
export const BOOTH_COLOR_OPTIONS = [
  { name: 'cyan', cls: 'bg-cyan-500' }, { name: 'amber', cls: 'bg-amber-500' },
  { name: 'emerald', cls: 'bg-emerald-500' }, { name: 'indigo', cls: 'bg-indigo-500' },
  { name: 'pink', cls: 'bg-pink-500' }, { name: 'sky', cls: 'bg-sky-500' },
  { name: 'violet', cls: 'bg-violet-500' }, { name: 'teal', cls: 'bg-teal-500' },
]
export const BOOTH_COLOR_CLS = Object.fromEntries(BOOTH_COLOR_OPTIONS.map((o) => [o.name, o.cls]))
export const emptyBlock = { type: 'global', membershipId: '', boothId: '', startDate: '', endDate: '', reason: '' }

export const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fmtSinceShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).replace('.', '') : '—'

export const BOOTH_PALETTE = [
  'from-indigo-400 to-purple-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
]
export const boothColor = (id) => BOOTH_PALETTE[(id ?? 0) % BOOTH_PALETTE.length]



export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
