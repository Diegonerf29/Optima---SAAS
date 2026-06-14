// tarjeta de empleado con avatar, rol y accesos rapidos de contacto
import { Shield, User, Calendar, ChevronRight, Mail, Phone, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { employeeDotClass } from '@/lib/employeeColor'
import { avatarColor, fmtSinceShort, telHref } from './employeeUtils'

/** tarjeta de empleado con avatar, rol y acceso al detalle */
export function EmployeeCard({ emp, onOpen, showReactivate, onReactivate }) {
  const isAdmin = emp.roleName === 'ADMIN'
  // si el admin eligio color se usa solido, si no un degradado segun el id
  const dotBg = emp.color ? employeeDotClass(emp) : null
  const avatarClass = dotBg
    ? dotBg
    : `bg-gradient-to-br ${avatarColor(emp.id)}`
  const stripClass = dotBg
    ? dotBg
    : `bg-gradient-to-r ${avatarColor(emp.id)}`
  return (
    <div
      onClick={onOpen}
      className="group bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] overflow-hidden hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] hover:border-blue-200 transition cursor-pointer"
    >
      <div className={`h-1 w-full ${stripClass}`} />
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${avatarClass} text-white font-bold text-lg shadow-[0_6px_16px_-6px_rgba(14,165,233,0.4)]`}>
            {emp.fullName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[#1e3a5f] truncate">{emp.fullName}</p>
              {isAdmin
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1e3a5f] text-white shrink-0"><Shield size={10} /> Admin</span>
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 shrink-0"><User size={10} /> Empleado</span>
              }
            </div>
            <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1 capitalize">
              <Calendar size={11} /> Empleado desde {fmtSinceShort(emp.createdAt)}
            </p>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition shrink-0" />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {emp.email && (
            <a
              href={`mailto:${emp.email}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition truncate max-w-full"
            >
              <Mail size={12} /> {emp.email}
            </a>
          )}
          {emp.phone ? (
            <a
              href={telHref(emp.phone)}
              className="inline-flex items-center gap-1.5 text-xs font-medium font-mono px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
            >
              <Phone size={12} /> {emp.phone}
            </a>
          ) : (
            <span className="text-xs text-slate-300 italic">Sin teléfono</span>
          )}
        </div>

        {showReactivate && (
          <div className="mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
            <Button variant="success" size="sm" onClick={onReactivate} className="w-full gap-2">
              <ArchiveRestore size={14} /> Reactivar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
