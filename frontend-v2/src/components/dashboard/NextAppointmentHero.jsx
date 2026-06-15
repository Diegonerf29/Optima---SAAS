// hero con la proxima cita del dia: cuenta atras, datos y acceso al detalle
import { Clock, Scissors, MapPin, User } from 'lucide-react'
import { hhmmFromIso } from '@/lib/format'
import { countdownLabel } from './dashboardShared'

/** Hero con la proxima cita: countdown, datos y CTA al detalle */
export function NextAppointmentHero({ appt, mins, onOpen }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_20px_50px_-20px_rgba(14,165,233,0.45)]"
         style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #0ea5e9 100%)' }}>
      <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
          <Clock size={12} /> Próxima cita
        </span>
        <div className="text-2xl font-extrabold tracking-tight tabular-nums">{countdownLabel(mins)}</div>
        <div>
          <div className="text-base font-semibold">{appt.clientName}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-200">
            {appt.bookedServices?.[0]?.serviceName && (
              <span className="inline-flex items-center gap-1"><Scissors size={13} /> {appt.bookedServices.map(b => b.serviceName).join(', ')}</span>
            )}
            <span className="inline-flex items-center gap-1"><User size={13} /> {appt.userFullName}</span>
            {appt.boothName && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {appt.boothName}</span>}
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onOpen}
            className="flex-1 px-3 py-2 rounded-xl bg-white text-[#1e3a5f] text-xs font-semibold hover:bg-blue-50 transition"
          >
            Ver detalle
          </button>
          <span className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-semibold text-center tabular-nums">
            {hhmmFromIso(appt.startDateTime)} – {hhmmFromIso(appt.endDateTime)}
          </span>
        </div>
      </div>
    </div>
  )
}
