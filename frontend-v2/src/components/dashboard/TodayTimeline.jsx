// timeline horizontal del dia con las citas posicionadas y la linea "ahora"
import { minutesBetween, hhmmFromIso } from '@/lib/format'
import { STATUS_LABELS, STATUS_COLORS } from './dashboardShared'

/** Timeline horizontal del dia con las citas y la linea "ahora" */
export function TodayTimeline({ list, now, onSelect, dayStart = 9, dayEnd = 21 }) {
  // Rango horario derivado de business_hours; 9-21 es el alternativa
  const DAY_START = dayStart, DAY_END = dayEnd
  const totalMin = (DAY_END - DAY_START) * 60
  const minutesFrom = (iso) => {
    const t = String(iso).slice(11, 16).split(':')
    return (parseInt(t[0], 10) - DAY_START) * 60 + parseInt(t[1], 10)
  }
  const nowMin = (now.getHours() - DAY_START) * 60 + now.getMinutes()
  const nowPct = Math.max(0, Math.min(100, (nowMin / totalMin) * 100))

  return (
    <div className="mx-5 mb-4 border border-slate-100 rounded-xl bg-slate-50/60 p-4">
      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums font-medium mb-2">
        {Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => (
          <span key={i}>{String(DAY_START + i).padStart(2, '0')}</span>
        ))}
      </div>
      <div className="relative h-14 bg-white border border-slate-100 rounded-lg">
        {list.map((a) => {
          const startM = minutesFrom(a.startDateTime)
          const durM = minutesBetween(a.startDateTime, a.endDateTime)
          if (startM + durM <= 0 || startM >= totalMin) return null
          const left = Math.max(0, (startM / totalMin) * 100)
          const width = Math.min(100 - left, (durM / totalMin) * 100)
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="absolute top-1.5 bottom-1.5 rounded text-[10px] font-semibold text-white px-1.5 overflow-hidden whitespace-nowrap text-ellipsis hover:-translate-y-0.5 hover:shadow-md transition"
              style={{ left: `${left}%`, width: `${width}%`, background: STATUS_COLORS[a.statusName] }}
              title={`${a.clientName} · ${hhmmFromIso(a.startDateTime)}`}
            >
              {a.clientName}
            </button>
          )
        })}
        {nowMin > 0 && nowMin < totalMin && (
          <div className="absolute -top-1 -bottom-1 w-0.5 bg-rose-500 rounded-full" style={{ left: `${nowPct}%` }}>
            <div className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full bg-rose-500" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
        {Object.entries(STATUS_LABELS).slice(0, 4).map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS[k] }} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Ahora · {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
