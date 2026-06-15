// tarjeta de cita con bloque de fecha, datos del cliente y resumen del estado
import { Clock, User, Scissors, MapPin } from 'lucide-react'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { formatDateTime, totalBooked } from '@/lib/format'
import { avatarColor, initials } from '@/lib/avatar'
import { dotClassFromColorAndId } from '@/lib/employeeColor'
import { TINTS, STATES_CERRADOS, formatDuration } from './citasShared'

/** Tarjeta de cita con bloque de fecha, datos del cliente y resumen del estado */
export function AppointmentCard({ appointment: a, onClick, employeeColor }) {
  const isInProgress = a.statusName === 'IN_PROGRESS'
  const servicesLabel = a.bookedServices?.map((b) => b.serviceName).join(' + ') || 'Sin servicios'
  const showUnpaidChip = !a.isPaid && (a.statusName === 'COMPLETED' || a.statusName === 'IN_PROGRESS')
  // Chip "Pasada": SOLO indicador visual, no cambia el estado en BD Avisa
  // al admin que la cita esta sin cerrar y deberia marcarla manualmente
  // (COMPLETED / CANCELLED / NO_SHOW segun lo que ocurrio)
  const isOverdue = new Date(a.endDateTime).getTime() < Date.now()
                    && !STATES_CERRADOS.has(a.statusName)
  // Punto del color del empleado (F del audit): si el admin asigno color
  // en Empleadosjsx, ese; si no, color automatico por membershipId
  const empDot = dotClassFromColorAndId(employeeColor, a.membershipId)
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border ${isInProgress ? 'border-sky-200' : 'border-slate-100/80'} shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] p-5 hover:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.1)] hover:border-blue-200/60 transition-all cursor-pointer relative overflow-hidden`}
    >
      {isInProgress && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500" />}
      <div className="flex items-center gap-5">
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${TINTS[a.statusName] || 'from-cyan-400 to-blue-500'} shrink-0 shadow-[0_8px_20px_-8px_rgba(14,165,233,0.4)]`}>
          <span className="text-2xl font-bold text-white leading-none">{new Date(a.startDateTime).getDate()}</span>
          <span className="text-[10px] text-white/80 uppercase font-semibold tracking-wide">
            {new Date(a.startDateTime).toLocaleDateString('es-ES', { month: 'short' })}
          </span>
        </div>

        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(a.clientId)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {initials(a.clientName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <p className="font-bold text-[#1e3a5f] text-base truncate">{a.clientName}</p>
            <StatusBadge status={a.statusName} />
            {a.isPaid && <Badge variant="success">Pagada</Badge>}
            {showUnpaidChip && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                Pendiente cobro
              </span>
            )}
            {isOverdue && (
              <span
                title="La cita pasó sin marcarse como completada, cancelada ni ausencia. Ciérrala manualmente."
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              >
                Pasada sin cerrar
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium mb-1 truncate">
            <Scissors size={11} className="inline -mt-0.5 mr-1 text-slate-400" /> {servicesLabel}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {formatDateTime(a.startDateTime)} · {formatDuration(a.startDateTime, a.endDateTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${empDot}`} aria-hidden />
              <User size={12} />{a.userFullName}
            </span>
            {a.boothName && <span className="flex items-center gap-1.5"><MapPin size={12} />{a.boothName}</span>}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-xl font-bold tabular-nums ${a.isPaid ? 'text-[#1e3a5f]' : (showUnpaidChip ? 'text-orange-600' : 'text-[#1e3a5f]')}`}>
            {totalBooked(a.bookedServices)} €
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ver detalle</p>
        </div>
      </div>
    </div>
  )
}
