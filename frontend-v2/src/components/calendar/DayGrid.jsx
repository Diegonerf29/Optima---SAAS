// vista de un dia con rejilla horaria y barra lateral de resumen y agenda
import { keyOf, minutesOf, isSameDay, layoutEvents, openRangesFor, blocksForCell, labelForBlock, STATUS_STYLES } from './utils'
import { HourColumn, HourSlots, NowLine, PositionedEvent, BlockOverlay, EventChip } from './cells'

/** Vista Dia cronologica con barra lateral de agenda */
export function DayGrid({ cursor, eventsByDay, colorBy, onSelectEvent, onSlotClick, statusLabel, dayStart, dayEnd, hourPx, businessHours, now, blocks = [], onDropAppointment, appointmentInterval = 30 }) {
  const dayKey = keyOf(cursor)
  const dayEvents = eventsByDay.get(dayKey) || []
  const sorted = [...dayEvents].sort((a, b) => minutesOf(a.startDateTime) - minutesOf(b.startDateTime))
  const laidOut = layoutEvents(dayEvents)
  const openRanges = openRangesFor(businessHours, cursor)
  const isToday = isSameDay(cursor, new Date())
  // En dia simple solo se muestran bloqueos globales
  const dayBlocks = blocksForCell(blocks, cursor)
  const dayIsBlocked = dayBlocks.length > 0
  const dayBlockLabel = dayIsBlocked ? labelForBlock(dayBlocks[0]) : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 p-5">
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: '64dvh' }}>
          <div className="flex">
            <HourColumn withHeader={false} dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx} />
            <div
              data-cal-cell
              data-day={dayKey}
              data-resource-type="none"
              data-resource-id="__none__"
              data-hour-px={hourPx}
              data-day-start={dayStart}
              data-interval={appointmentInterval}
              className="flex-1 relative"
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
        </div>
      </div>

      <aside className="space-y-4 no-print">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold mb-1">Resumen del día</p>
          <p className="text-3xl font-bold text-[#1e3a5f]">{dayEvents.length}</p>
          <p className="text-sm text-slate-500">cita{dayEvents.length === 1 ? '' : 's'} programada{dayEvents.length === 1 ? '' : 's'}</p>
          <div className="mt-4 space-y-2">
            {dayEvents.length === 0 && <p className="text-sm text-slate-400">Sin citas este día.</p>}
            {Object.keys(STATUS_STYLES).map((k) => {
              const n = dayEvents.filter((e) => e.statusName === k).length
              if (n === 0) return null
              const s = STATUS_STYLES[k]
              return (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-slate-600">{statusLabel(k)}</span>
                  </span>
                  <span className={`font-semibold ${s.text}`}>{n}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-semibold mb-3">Agenda</p>
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">No hay citas este día.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((a) => <EventChip key={a.id} appt={a} onClick={onSelectEvent} colorBy={colorBy} />)}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
