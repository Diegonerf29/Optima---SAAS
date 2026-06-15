// listado de citas agrupado por dia, con cabecera por fecha y AppointmentCard por cita
import { useMemo } from 'react'
import { AppointmentCard } from './AppointmentCard'

/** Lista agrupada por dia con cabeceras y AppointmentCard por cita */
export function DayGroupedList({ list, onOpen, empColorMap }) {
  // Agrupa por fecha (yyyy-mm-dd) manteniendo el orden de `list`
  const groups = useMemo(() => {
    const m = new Map()
    list.forEach((a) => {
      const key = a.startDateTime.slice(0, 10)
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(a)
    })
    return [...m.entries()]
  }, [list])

  const fmtDayHeader = (ymdStr) => {
    const d = new Date(`${ymdStr}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const tag =
      d.getTime() === today.getTime()    ? 'Hoy'    :
      d.getTime() === tomorrow.getTime() ? 'Mañana' : ''
    const long = d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })
    return tag ? `${tag} · ${long}` : long
  }

  return (
    <div className="space-y-6">
      {groups.map(([day, dayList]) => (
        <section key={day}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider capitalize">
              {fmtDayHeader(day)}
            </h2>
            <span className="text-xs text-slate-400">· {dayList.length} cita{dayList.length === 1 ? '' : 's'}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="appt-grid">
            {dayList.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                onClick={() => onOpen(a)}
                employeeColor={empColorMap?.get(a.membershipId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
