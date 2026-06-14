// tarjeta de servicio con duracion, precio e impuesto para las vistas grid del catalogo
import { Pencil, Archive, ArchiveRestore, Scissors, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { catColor, priceWithVat, fmtEur } from './catalogShared'

/** Tarjeta de servicio con duracion, precio e impuesto */
export function ServiceCard({ service, taxes, isAdmin, archived, onOpen, onEdit, onArchive, onReactivate }) {
  const color = catColor(service.categoryId)
  const totalWithVat = priceWithVat(service, taxes)
  return (
    <div
      onClick={() => onOpen(service)}
      className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-200 hover:shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-[0_6px_16px_-6px_rgba(20,184,166,0.4)]"
          style={{ background: color.grad }}
        >
          <Scissors size={18} />
        </div>
        {isAdmin && (
          archived ? (
            // Servicios archivados: ademas de "Restaurar", se permite "Editar"
            // para poder reasignar categoria/impuesto a uno activo antes de
            // reactivar (deadlock que aparecia si la categoria del servicio
            // tambien estaba archivada)
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(service)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                title="Editar (sin reactivar)"
              >
                <Pencil size={14} />
              </button>
              <Button variant="success" size="sm" onClick={() => onReactivate(service)} className="gap-1.5">
                <ArchiveRestore size={14} /> Restaurar
              </Button>
            </div>
          ) : (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onEdit(service)} className="rounded-xl p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={() => onArchive(service)} className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition" title="Archivar">
                <Archive size={14} />
              </button>
            </div>
          )
        )}
      </div>
      <div className="font-bold text-[#1e3a5f]">{service.name}</div>
      {service.description ? (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{service.description}</p>
      ) : (
        <p className="text-xs text-slate-300 italic mt-1">Sin descripción</p>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 font-medium">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.dot }} />
          {service.categoryName}
        </span>
        <span className="inline-flex items-center gap-1"><Clock size={11} /> {service.durationMinutes} min</span>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-50 flex items-end justify-between gap-2">
        <div>
          <div className="text-base font-extrabold text-blue-600 tabular-nums">{fmtEur(service.price)}</div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            {totalWithVat == null
              ? 'IVA no disponible'
              : `${service.taxName} · ${fmtEur(totalWithVat)} con IVA`}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition" />
      </div>
    </div>
  )
}
