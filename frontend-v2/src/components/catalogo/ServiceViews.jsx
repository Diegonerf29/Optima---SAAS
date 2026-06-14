// vistas de listado de servicios: rejilla plana, agrupada por categoria y tabla densa
import { useMemo } from 'react'
import { Pencil, Archive, ArchiveRestore, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { catColor, priceWithVat, fmtEur } from './catalogShared'
import { ServiceCard } from './ServiceCard'

/** Rejilla plana de ServiceCard sin agrupar por categoria */
export function FlatGrid({ list, taxes, isAdmin, archived, onOpen, onEdit, onArchive, onReactivate }) {
  return (
    <div className="card-grid">
      {list.map((s) => (
        <ServiceCard
          key={s.id}
          service={s}
          taxes={taxes}
          isAdmin={isAdmin}
          archived={archived}
          onOpen={onOpen}
          onEdit={onEdit}
          onArchive={onArchive}
          onReactivate={onReactivate}
        />
      ))}
    </div>
  )
}

/** Vista de servicios agrupados por categoria con cabeceras */
export function GroupedView({ list, categories, taxes, isAdmin, archived, onOpen, onEdit, onArchive, onReactivate }) {
  const byCat = useMemo(() => {
    const m = new Map()
    list.forEach((s) => {
      if (!m.has(s.categoryId)) m.set(s.categoryId, [])
      m.get(s.categoryId).push(s)
    })
    return m
  }, [list])
  // Primero las categorias activas en su orden; despues cualquier categoria
  // presente en los servicios pero no en la lista activa (pej en vista
  // archivados, una categoria que tambien fue archivada) El nombre se toma
  // del propio servicio (categoryName) para no perder el grupo
  const ordered = useMemo(() => {
    const fromActive = categories.filter((c) => byCat.has(c.id))
    const known = new Set(fromActive.map((c) => c.id))
    const extra = []
    byCat.forEach((group, id) => {
      if (!known.has(id)) extra.push({ id, name: group[0]?.categoryName || 'Sin categoría' })
    })
    return [...fromActive, ...extra]
  }, [categories, byCat])
  return (
    <div className="space-y-7">
      {ordered.map((c) => {
        const color = catColor(c.id)
        const group = byCat.get(c.id)
        return (
          <section key={c.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ background: color.dot }} />
              <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wider">{c.name}</h2>
              <span className="text-xs text-slate-400 font-medium">
                {group.length} servicio{group.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="card-grid">
              {group.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  taxes={taxes}
                  isAdmin={isAdmin}
                  archived={archived}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onReactivate={onReactivate}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Tabla densa de servicios con columnas ordenables y acciones por fila */
export function ServicesTable({ list, taxes, isAdmin, archived, onOpen, onEdit, onArchive, onReactivate }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Servicio</th>
              <th className="px-2 py-3 text-left hidden md:table-cell">Categoría</th>
              <th className="px-2 py-3 text-left hidden lg:table-cell">Duración</th>
              <th className="px-2 py-3 text-right">Precio</th>
              <th className="px-2 py-3 text-right hidden md:table-cell">Con IVA</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const color = catColor(s.categoryId)
              const totalWithVat = priceWithVat(s, taxes)
              return (
                <tr
                  key={s.id}
                  onClick={() => onOpen(s)}
                  className="border-b border-slate-50 hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color.grad }}>
                        <Scissors size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1e3a5f] truncate">{s.name}</div>
                        {s.description && <div className="text-xs text-slate-400 truncate">{s.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.dot }} />
                      {s.categoryName}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 hidden lg:table-cell text-slate-500 tabular-nums">
                    {s.durationMinutes} min
                  </td>
                  <td className="px-2 py-3.5 text-right font-bold text-blue-600 tabular-nums">{fmtEur(s.price)}</td>
                  <td className="px-2 py-3.5 text-right hidden md:table-cell text-xs text-slate-500 tabular-nums">
                    {totalWithVat == null
                      ? <span title="IVA no disponible (impuesto archivado)">N/D</span>
                      : fmtEur(totalWithVat)}
                    <div className="text-[10px] text-slate-400">{s.taxName}</div>
                  </td>
                  <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      archived ? (
                        <div className="flex justify-end">
                          <Button variant="success" size="sm" onClick={() => onReactivate(s)} className="gap-1.5">
                            <ArchiveRestore size={14} /> Restaurar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onEdit(s)} className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => onArchive(s)} className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition" title="Archivar">
                            <Archive size={14} />
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
