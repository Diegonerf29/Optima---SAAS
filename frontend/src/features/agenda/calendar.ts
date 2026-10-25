import { format, getDay, parse, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { dateFnsLocalizer } from 'react-big-calendar'

/** react-big-calendar en español con la semana empezando en lunes */
export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

export const MESSAGES = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  agenda: 'Lista',
  date: 'Fecha',
  time: 'Hora',
  event: 'Cita',
  noEventsInRange: 'No hay citas en estas fechas',
  showMore: (n: number) => `+${n} más`,
}
