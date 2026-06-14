// vista de tabla del listado de clientes: cabeceras ordenables, skeleton, vacio y paginacion
import {
  Pencil, Archive, ArchiveRestore, Mail, Phone, Users,
  ChevronsUpDown, ArrowDown, ArrowUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { avatarColor, fmtSince, telHref } from './clientShared'

/** Icono de orden de columna; recibe el estado de orden por props para vivir fuera del render */
function SortIcon({ k, sortKey, sortDir }) {
  if (sortKey !== k) return <ChevronsUpDown size={12} className="opacity-60" />
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-blue-500" />
    : <ArrowDown size={12} className="text-blue-500" />
}

/** Tabla de clientes con orden por nombre/fecha, acciones por fila y paginacion */
export function ClientsTable({
  clients, loading, search, isArchived,
  sortKey, sortDir, onToggleSort,
  onOpen, onEdit, onArchive, onReactivate, onCreate,
  page, totalPages, totalElements, onPageChange,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th
                onClick={() => onToggleSort('fullName')}
                className="cursor-pointer select-none px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider hover:text-blue-600 transition text-slate-400"
              >
                <span className={`inline-flex items-center gap-1 ${sortKey === 'fullName' ? 'text-[#1e3a5f]' : ''}`}>
                  Nombre <SortIcon k="fullName" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Teléfono</th>
              <th
                onClick={() => onToggleSort('createdAt')}
                className="cursor-pointer select-none px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell hover:text-blue-600 transition text-slate-400"
              >
                <span className={`inline-flex items-center gap-1 ${sortKey === 'createdAt' ? 'text-[#1e3a5f]' : ''}`}>
                  Cliente desde <SortIcon k="createdAt" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
              <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  {search ? (
                    <p className="px-6 py-16 text-center text-slate-400 text-sm">
                      Sin coincidencias para «{search}».
                    </p>
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
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(c.id)} text-white text-xs font-bold`}>
                        {c.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1e3a5f] truncate">{c.fullName}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {c.notes
                            ? c.notes.length > 48 ? c.notes.slice(0, 48) + '…' : c.notes
                            : <span className="text-slate-300">Sin notas</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition"
                      >
                        <Mail size={13} className="text-slate-400" /> {c.email}
                      </a>
                    ) : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {c.phone ? (
                      <a
                        href={telHref(c.phone)}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition font-mono"
                      >
                        <Phone size={13} className="text-slate-400" /> {c.phone}
                      </a>
                    ) : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-500 capitalize">
                    {fmtSince(c.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {isArchived ? (
                      <div className="flex justify-end">
                        <Button variant="success" size="sm" onClick={() => onReactivate(c)} className="gap-1.5">
                          <ArchiveRestore size={14} /> Restaurar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => onEdit(c)}
                          className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onArchive(c)}
                          className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Archivar"
                        >
                          <Archive size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onChange={onPageChange}
      />
    </div>
  )
}
