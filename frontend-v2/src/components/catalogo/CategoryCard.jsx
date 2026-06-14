// tarjeta de categoria del catalogo con su recuento de servicios y acciones de gestion
import { Tag, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { catColor, fmtSince } from './catalogShared'

/** Tarjeta de categoria: en activas navega a sus servicios, en archivadas permite restaurar */
export function CategoryCard({ category, count, isAdmin, archived, onOpen, onEdit, onArchive, onReactivate }) {
  // Color determinista por id, igual que en los chips y las tarjetas de servicio
  const color = catColor(category.id)
  return (
    <div
      // Solo las categorias activas son clicables (abren sus servicios filtrados)
      onClick={archived ? undefined : onOpen}
      className={`group bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-200 hover:shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] transition ${
        archived ? '' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.4)] shrink-0"
            style={{ background: color.grad }}
          >
            <Tag size={17} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#1e3a5f] truncate">{category.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {count} servicio{count !== 1 ? 's' : ''} · creada {fmtSince(category.createdAt)}
            </p>
          </div>
        </div>
        {isAdmin && !archived && (
          // stopPropagation para que editar/archivar no dispare la navegacion del contenedor
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onArchive}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
              title="Archivar"
            >
              <Archive size={14} />
            </button>
          </div>
        )}
      </div>
      {isAdmin && archived && (
        <div className="mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
          <Button variant="success" size="sm" onClick={onReactivate} className="w-full gap-2">
            <ArchiveRestore size={14} /> Restaurar
          </Button>
        </div>
      )}
    </div>
  )
}
