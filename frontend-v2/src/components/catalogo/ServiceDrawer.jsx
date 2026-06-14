// panel lateral con el detalle completo de un servicio
import { Scissors, X, Calendar, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { catColor, priceWithVat, fmtEur, fmtSince } from './catalogShared'

/** panel lateral con el detalle de un servicio */
export function ServiceDrawer({ service, taxes, isAdmin, archived, onClose, onEdit, onArchive, onReactivate }) {
  const color = catColor(service.categoryId)
  const tax = taxes.find((t) => t.id === service.taxId)
  const totalWithVat = priceWithVat(service, taxes)
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      />
      <aside className="fixed top-0 right-0 z-50 h-[100dvh] w-[480px] max-w-[95vw] bg-white shadow-[0_28px_56px_-16px_rgba(15,23,42,0.22)] flex flex-col animate-[slideInRight_240ms_cubic-bezier(0.2,0.7,0.2,1)]">

        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)]"
                style={{ background: color.grad }}
              >
                <Scissors size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-[#1e3a5f] truncate">{service.name}</div>
                <div className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color.dot }} />
                  {service.categoryName}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-[#1e3a5f] transition" title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Precio base</div>
              <div className="text-2xl font-extrabold text-[#1e3a5f] mt-1 tabular-nums">{fmtEur(service.price)}</div>
              <div className="text-xs text-emerald-600 mt-0.5 font-semibold tabular-nums">
                {totalWithVat == null
                  ? 'IVA no disponible'
                  : `+ ${service.taxName} · ${fmtEur(totalWithVat)} con IVA`}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duración</div>
              <div className="text-2xl font-extrabold text-[#1e3a5f] mt-1 tabular-nums">{service.durationMinutes} min</div>
              <div className="text-xs text-slate-400 mt-0.5">minutos por sesión</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Descripción</div>
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 min-h-[80px]">
              {service.description || <span className="text-slate-400 italic">Sin descripción registrada.</span>}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Datos fiscales</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Impuesto aplicado</div>
                <div className="text-[#1e3a5f] font-semibold mt-0.5">
                  {service.taxName}{tax ? ` · ${tax.percentage}%` : ''}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Creado en</div>
                <div className="text-[#1e3a5f] font-semibold mt-0.5 capitalize inline-flex items-center gap-1.5">
                  <Calendar size={11} /> {fmtSince(service.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
            {archived ? (
              <>
                <Button variant="outline" onClick={onEdit} className="flex-1 gap-2">
                  <Pencil size={15} /> Editar
                </Button>
                <Button variant="success" onClick={onReactivate} className="flex-1 gap-2">
                  <ArchiveRestore size={15} /> Restaurar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onArchive} className="flex-1 gap-2">
                  <Archive size={15} /> Archivar
                </Button>
                <Button onClick={onEdit} className="flex-1 gap-2">
                  <Pencil size={15} /> Editar
                </Button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
