// rejilla mensual 7x6 del calendario con heatmap de densidad, bloqueos y citas por dia
import { Plus } from 'lucide-react'
import { totalBooked } from '@/lib/format'
import { DAYS_ES_SHORT, keyOf, isSameDay, buildMonthGrid, blocksForCell, labelForBlock } from './utils'
import { EventChip } from './cells'

/** Rejilla mensual 7x6 con citas y bloqueos por dia */
export function MonthGrid({ cursor, today, eventsByDay, colorBy, onCellClick, onSelectEvent, onOpenDay, blocks = [] }) {
  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth())
  const month = cursor.getMonth()
  return (
    <>
      <div className="grid grid-cols-7 border-b-2 border-slate-300 bg-slate-50/40">
        {DAYS_ES_SHORT.map((d, i) => (
          <div key={d} className={`px-3 py-3 text-[11px] uppercase tracking-[0.14em] font-semibold ${i >= 5 ? 'text-blue-600' : 'text-slate-500'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 bg-slate-300 gap-[2px]">
        {cells.map((date, idx) => {
          const inMonth = date.getMonth() === month
          const isToday = isSameDay(date, today)
          const dayEvents = eventsByDay.get(keyOf(date)) || []
          const overflow = dayEvents.length - 3
          const shown = overflow > 0 ? dayEvents.slice(0, 2) : dayEvents.slice(0, 3)
          const activeAppts = dayEvents.filter((a) => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
          const dayRevenue = activeAppts.reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0)
          // [J] Heatmap por densidad de citas activas: cuanto mas ocupado el
          // dia, mas saturado el fondo Umbrales 1/3/6 ajustados a un negocio
          // pequeno-mediano Dias fuera del mes mantienen su gris claro y
          // hoy conserva su acento (chip con el numero del dia)
          const heat = activeAppts.length
          const heatBg = !inMonth
            ? 'bg-slate-50/60 hover:bg-slate-50'
            : heat >= 6 ? 'bg-blue-100/80 hover:bg-blue-200/60'
            : heat >= 3 ? 'bg-blue-50/70 hover:bg-blue-100/60'
            : heat >= 1 ? 'bg-blue-50/40 hover:bg-blue-50/70'
            : 'bg-white hover:bg-blue-50/40'
          // En el mes se muestra el primer bloqueo del dia
          const dayBlocks = blocksForCell(blocks, date)
            .concat(blocks.filter((b) => (b.membershipId != null || b.boothId != null)
                                          && keyOf(date) >= b.startDate
                                          && keyOf(date) <= b.endDate))
          // Evita repetir bloqueos ya encontrados
          const seenIds = new Set()
          const uniqueDayBlocks = dayBlocks.filter((b) => {
            if (seenIds.has(b.id)) return false
            seenIds.add(b.id); return true
          })
          const hasBlock = uniqueDayBlocks.length > 0
          return (
            <div
              key={idx}
              onClick={() => onOpenDay(date)}
              className={`group relative min-h-[120px] p-2 transition ${heatBg} ${hasBlock ? 'ring-1 ring-inset ring-rose-200 cursor-not-allowed' : 'cursor-pointer'}`}
              title={hasBlock ? labelForBlock(uniqueDayBlocks[0]) : 'Ver el día'}
              style={hasBlock ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(244,63,94,0.08) 0 6px, transparent 6px 14px)' } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-semibold ${
                  isToday
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_4px_10px_-2px_rgba(14,165,233,0.55)]'
                    : inMonth ? 'text-[#1e3a5f]' : 'text-slate-400'
                }`}>{date.getDate()}</div>
                {!hasBlock && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCellClick(keyOf(date)) }}
                    title="Crear cita este día"
                    className="opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-100 rounded p-0.5 transition"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {hasBlock && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    <span className="truncate max-w-[100px]">{labelForBlock(uniqueDayBlocks[0])}</span>
                  </span>
                )}
                {shown.map((a) => <EventChip key={a.id} appt={a} onClick={onSelectEvent} colorBy={colorBy} variant="grid" />)}
                {overflow > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenDay(date) }}
                    className="w-full text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-md px-1.5 py-1 text-left transition"
                  >
                    +{overflow + 1} más
                  </button>
                )}
              </div>
              {inMonth && dayEvents.length > 0 && (
                <div className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-400 tabular-nums">
                  {dayEvents.length} · {dayRevenue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
