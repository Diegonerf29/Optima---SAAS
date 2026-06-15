// panel "agenda de hoy": pestanas de estado, timeline, tabla cronologica y pie
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, ArrowRight } from 'lucide-react'
import { totalBooked, hhmmFromIso, fmtEur } from '@/lib/format'
import { avatarColor, initials } from '@/lib/avatar'
import { STATUS_TABS, STATUS_CHIP, STATUS_COLORS, STATUS_LABELS } from './dashboardShared'
import { TodayTimeline } from './TodayTimeline'

/** Agenda del dia: filtro por estado, timeline horario y tabla de citas */
export function TodayAgenda({ todayList, visibleToday, loading, filter, onFilter, timelineRange, now, onSelect }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] flex flex-col">

      <div className="flex flex-wrap items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex-1">
          <div className="text-base font-bold text-[#1e3a5f] flex items-center gap-2"><CalendarDays size={16} /> Agenda de hoy</div>
          <div className="text-xs text-slate-400 mt-0.5">{visibleToday.length} citas · vista cronológica</div>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 overflow-x-auto max-w-full">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilter(key)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                filter === key
                  ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                  : 'text-slate-500 hover:text-[#1e3a5f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && todayList.length > 0 && (
        <TodayTimeline
          list={todayList} now={now} onSelect={onSelect}
          dayStart={timelineRange.start} dayEnd={timelineRange.end}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.12em] text-slate-400 border-b border-slate-100 bg-slate-50/60">
              <th className="text-left font-semibold px-6 py-3">Cliente</th>
              <th className="text-left font-semibold px-2 py-3">Hora</th>
              <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Servicio</th>
              <th className="text-left font-semibold px-2 py-3 hidden lg:table-cell">Empleado · Cabina</th>
              <th className="text-left font-semibold px-2 py-3">Estado</th>
              <th className="text-right font-semibold px-2 py-3">Importe</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={7} className="px-6 py-4">
                    <div className="h-4 bg-slate-100 rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))
            ) : visibleToday.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                  {filter === 'Todas'
                    ? 'Sin citas para hoy. Disfruta de un día tranquilo.'
                    : 'Sin citas con este estado hoy.'}
                </td>
              </tr>
            ) : (
              visibleToday.map((a) => {
                const total = parseFloat(totalBooked(a.bookedServices))
                return (
                  <tr
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(a.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(a.clientName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1e3a5f] truncate">{a.clientName}</div>
                          <div className="text-xs text-slate-400">{a.isPaid ? 'Pagada' : 'Pendiente de pago'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 tabular-nums">
                      <div className="font-semibold text-[#1e3a5f]">{hhmmFromIso(a.startDateTime)} – {hhmmFromIso(a.endDateTime)}</div>
                      <div className="text-xs text-slate-400">Hoy</div>
                    </td>
                    <td className="px-2 py-3.5 text-slate-600 hidden md:table-cell">
                      {a.bookedServices?.map(b => b.serviceName).join(', ') || '—'}
                    </td>
                    <td className="px-2 py-3.5 hidden lg:table-cell">
                      <div className="font-semibold text-[#1e3a5f] text-sm leading-tight">{a.userFullName}</div>
                      {a.boothName && <div className="text-xs text-slate-400 mt-0.5">{a.boothName}</div>}
                    </td>
                    <td className="px-2 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_CHIP[a.statusName]}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[a.statusName] }} />
                        {STATUS_LABELS[a.statusName]}
                      </span>
                    </td>
                    <td className={`px-2 py-3.5 text-right tabular-nums font-semibold ${a.isPaid ? 'text-[#1e3a5f]' : 'text-orange-600'}`}>
                      {fmtEur(total)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-300">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Mostrando {visibleToday.length} de {todayList.length} citas de hoy
        </span>
        <Link to="/citas" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
          Ver todas las citas <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
