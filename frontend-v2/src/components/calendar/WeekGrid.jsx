// vista semanal por horas (agrupacion cronologica) con huecos, bloqueos y arrastre
import { DAYS_ES_SHORT, keyOf, isSameDay, startOfWeek, layoutEvents, openRangesFor, blocksForCell, labelForBlock } from './utils'
import { HourColumn, HourSlots, NowLine, PositionedEvent, BlockOverlay } from './cells'

/** Vista semanal por horas */
export function WeekGrid({ cursor, today, eventsByDay, colorBy, onSelectEvent, onSlotClick, dayStart, dayEnd, hourPx, businessHours, now, blocks = [], onDropAppointment, appointmentInterval = 30 }) {
  const ws = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d })
  return (
    <div className="overflow-auto" style={{ maxHeight: '68dvh' }}>
      <div className="flex min-w-[720px]">
        <HourColumn dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx} />
        <div className="flex-1 grid grid-cols-7">
          {days.map((d, i) => {
            const dayKey = keyOf(d)
            const laidOut = layoutEvents(eventsByDay.get(dayKey) || [])
            const isToday = isSameDay(d, today)
            const openRanges = openRangesFor(businessHours, d)
            // En semana simple solo se muestran bloqueos globales
            const dayBlocks = blocksForCell(blocks, d)
            const dayIsBlocked = dayBlocks.length > 0
            const dayBlockLabel = dayIsBlocked ? labelForBlock(dayBlocks[0]) : null
            return (
              <div key={i} className="relative border-r-2 border-slate-300 last:border-r-0">
                <div className={`h-10 border-b-2 border-slate-300 flex items-center justify-center gap-2 sticky top-0 z-10 ${isToday ? 'bg-blue-100' : 'bg-white'}`}>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${i >= 5 ? 'text-blue-600' : 'text-slate-500'}`}>{DAYS_ES_SHORT[i]}</span>
                  <span className={`inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded-full text-xs font-bold ${isToday ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' : 'text-[#1e3a5f]'}`}>{d.getDate()}</span>
                </div>
                <div
                  data-cal-cell
                  data-day={dayKey}
                  data-resource-type="none"
                  data-resource-id="__none__"
                  data-hour-px={hourPx}
                  data-day-start={dayStart}
                  data-interval={appointmentInterval}
                  className="relative"
                >
                  <HourSlots dayKey={dayKey} onSlotClick={onSlotClick} dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx} closedRanges={openRanges}
                             isBlocked={dayIsBlocked} blockedReason={dayBlockLabel} />
                  {laidOut.map(({ a, col, cols }) => (
                    <PositionedEvent key={a.id} appt={a} onClick={onSelectEvent} onDrop={onDropAppointment} col={col} cols={cols} colorBy={colorBy} dayStart={dayStart} hourPx={hourPx} />
                  ))}
                  {isToday && <NowLine now={now} dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx} />}
                  <BlockOverlay blocks={dayBlocks} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
