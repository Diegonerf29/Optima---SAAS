// panel lateral con la ficha completa de un cliente y sus acciones
import {
  Pencil, Archive, ArchiveRestore, Mail, Phone, X, Calendar, CalendarPlus, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { avatarColor, fmtSinceLong, telHref } from './clientShared'

/** Panel lateral con contacto, notas y acciones (nueva cita, editar, archivar, restaurar) */
export function ClientDrawer({ client, isArchived, onClose, onNewAppointment, onEdit, onArchive, onReactivate }) {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      />
      <aside
        className="fixed top-0 right-0 z-50 h-[100dvh] w-[420px] max-w-[95vw] bg-white shadow-[0_28px_56px_-16px_rgba(15,23,42,0.22)] flex flex-col animate-[slideInRight_240ms_cubic-bezier(0.2,0.7,0.2,1)]"
      >
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(client.id)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
              {client.fullName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-[#1e3a5f] truncate">{client.fullName}</div>
              <div className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1.5">
                <Calendar size={12} /> Cliente desde {fmtSinceLong(client.createdAt)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Contacto</div>
            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition"
              >
                <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Mail size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Email</span>
                  <span className="block text-sm font-semibold text-[#1e3a5f] truncate">{client.email}</span>
                </span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500" />
              </a>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 opacity-60">
                <span className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Mail size={16} /></span>
                <span className="flex-1 text-sm text-slate-400">Sin email</span>
              </div>
            )}
            {client.phone ? (
              <a
                href={telHref(client.phone)}
                className="group mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition"
              >
                <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Phone size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Teléfono</span>
                  <span className="block text-sm font-semibold text-[#1e3a5f] truncate font-mono">{client.phone}</span>
                </span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500" />
              </a>
            ) : (
              <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 opacity-60">
                <span className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Phone size={16} /></span>
                <span className="flex-1 text-sm text-slate-400">Sin teléfono</span>
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Notas</div>
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[80px] rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              {client.notes || <span className="text-slate-400 italic">Sin notas registradas.</span>}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-2">
          {!isArchived && (
            <Button onClick={onNewAppointment} className="w-full gap-2">
              <CalendarPlus size={15} /> Nueva cita
            </Button>
          )}
          <div className="flex gap-2">
            {isArchived ? (
              <Button variant="success" onClick={() => onReactivate(client)} className="flex-1 gap-2">
                <ArchiveRestore size={15} /> Restaurar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => onArchive(client)} className="flex-1 gap-2">
                  <Archive size={15} /> Archivar
                </Button>
                <Button onClick={onEdit} className="flex-1 gap-2">
                  <Pencil size={15} /> Editar
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
