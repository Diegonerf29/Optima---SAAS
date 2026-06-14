// vista de tarjetas del listado de clientes: skeleton, vacio, rejilla y paginacion
import { Pencil, Archive, ArchiveRestore, Mail, Phone, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { avatarColor, fmtSince, telHref } from './clientShared'

/** Rejilla de tarjetas de cliente con acciones y paginacion */
export function ClientCards({
  clients, loading, search, isArchived,
  onOpen, onEdit, onArchive, onReactivate, onCreate,
  page, totalPages, totalElements, onPageChange,
}) {
  if (loading) {
    return (
      <div className="card-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] p-5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
        {search ? (
          <p className="px-6 py-16 text-center text-slate-400 text-sm">Sin coincidencias para «{search}».</p>
        ) : isArchived ? (
          <EmptyState
            icon={Users}
            title="No hay clientes archivados"
            description="Los clientes que archives aparecerán aquí para que puedas restaurarlos."
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Aún no hay clientes"
            description="Crea la primera ficha de cliente para empezar a gestionar sus citas."
            actionLabel="Nuevo cliente"
            onAction={onCreate}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="card-grid">
        {clients.map((c) => (
          <div
            key={c.id}
            onClick={() => onOpen(c)}
            className="group bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] p-5 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] hover:border-blue-200 transition cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(c.id)} text-white text-sm font-bold`}>
                {c.fullName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#1e3a5f] truncate">{c.fullName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1 capitalize">
                  <Calendar size={12} /> Cliente desde {fmtSince(c.createdAt)}
                </div>
              </div>
              <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                {isArchived ? (
                  <Button variant="success" size="sm" onClick={() => onReactivate(c)} className="gap-1.5">
                    <ArchiveRestore size={14} /> Restaurar
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => onEdit(c)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onArchive(c)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-amber-50 hover:text-amber-600 transition"
                      title="Archivar"
                    >
                      <Archive size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition truncate max-w-full"
                >
                  <Mail size={12} /> {c.email}
                </a>
              )}
              {c.phone && (
                <a
                  href={telHref(c.phone)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium font-mono px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                >
                  <Phone size={12} /> {c.phone}
                </a>
              )}
              {!c.email && !c.phone && (
                <span className="text-xs text-slate-300 italic">Sin datos de contacto</span>
              )}
            </div>
            {c.notes && (
              <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-2">{c.notes}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 bg-white rounded-xl border border-slate-100/80">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          onChange={onPageChange}
        />
      </div>
    </>
  )
}
