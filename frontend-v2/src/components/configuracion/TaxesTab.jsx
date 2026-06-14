// pestana de configuracion: TaxesTab
import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Archive, ArchiveRestore, Percent } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { CARD, TH, emptyTax } from './configShared'
import { SectionHint, Toolbar, ArchiveViewToggle } from './configWidgets'

/** Pestana de impuestos con gestion y archivado */
export function TaxesTab({ bId, isAdmin }) {
  const toast = useToast()
  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_cfg_taxes_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_cfg_taxes_size', String(pageSize)) }, [pageSize])
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('optima_cfg_taxes_sort') || 'asc')
  useEffect(() => { localStorage.setItem('optima_cfg_taxes_sort', sortDir) }, [sortDir])

  // Vista activos / archivados - sin persistir
  const [view, setView] = useState('active')
  const isArchived = view === 'archived'
  const queryParams = useMemo(() => ({ sort: `name,${sortDir}`, active: view === 'active' }), [sortDir, view])

  const { items: taxes, page, totalPages, totalElements, loading, setPage, refresh } =
    usePagedFetch(bId ? `/api/businesses/${bId}/taxes` : null, { size: pageSize, params: queryParams })

  // Carga del catalogo para contar uso por impuesto (sin rutas dedicado)
  const [services, setServices] = useState([])
  useEffect(() => {
    if (!bId) return
    api.get(`/api/businesses/${bId}/services?size=100`).then((r) => setServices(r.data.content ?? [])).catch(() => {})
  }, [bId])
  const usageBy = useMemo(() => {
    const m = new Map()
    services.forEach((s) => m.set(s.taxId, (m.get(s.taxId) ?? 0) + 1))
    return m
  }, [services])

  const avgPct = useMemo(() => taxes.length === 0 ? null : taxes.reduce((a, t) => a + Number(t.percentage), 0) / taxes.length, [taxes])

  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyTax)
  const [saving, setSaving]     = useState(false)

  const closeModal = () => { setModal(null); setSelected(null) }
  const openCreate  = () => { setForm(emptyTax); setSelected(null); setModal('create') }
  const openEdit    = (t) => { setSelected(t); setForm({ name: t.name, percentage: String(t.percentage) }); setModal('edit') }
  const openArchive = (t) => { setSelected(t); setModal('archive') }

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ type: 'error', message: 'El nombre es obligatorio.' }); return }
    if (form.percentage === '' || isNaN(Number(form.percentage))) {
      toast({ type: 'error', message: 'El porcentaje es obligatorio.' }); return
    }
    setSaving(true)
    try {
      const payload = { name: form.name, percentage: Number(form.percentage) }
      if (modal === 'create') {
        await api.post(`/api/businesses/${bId}/taxes`, payload)
        toast({ type: 'success', message: 'Impuesto creado.' })
      } else {
        await api.put(`/api/businesses/${bId}/taxes/${selected.id}`, payload)
        toast({ type: 'success', message: 'Impuesto actualizado.' })
      }
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo guardar el impuesto.') })
    } finally { setSaving(false) }
  }

  const handleArchive = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/taxes/${selected.id}`)
      toast({ type: 'success', message: 'Impuesto archivado.' })
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo archivar el impuesto.') })
    } finally { setSaving(false) }
  }

  // Restaurar es un clic directo (no destructivo): sin ventana de confirmacion
  const handleReactivate = async (tax) => {
    try {
      await api.patch(`/api/businesses/${bId}/taxes/${tax.id}/reactivate`)
      toast({ type: 'success', message: 'Impuesto restaurado.' })
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo restaurar el impuesto.') })
    }
  }

  return (
    <div>
      <SectionHint title="¿Qué son los impuestos?">
        Cada servicio del catálogo puede llevar asociado un impuesto
        (IVA, IGIC…). El total de cada cita se calcula con el porcentaje
        vigente en el momento de la reserva. Los impuestos archivados ya
        no se pueden asignar a servicios nuevos, pero las citas que los
        usaron conservan el valor original.
      </SectionHint>
      <Toolbar
        rightCount={totalElements}
        rightLabel={isArchived
          ? `impuesto${totalElements === 1 ? '' : 's'} archivado${totalElements === 1 ? '' : 's'}`
          : `impuesto${totalElements === 1 ? '' : 's'}`}
        extraStats={!isArchived && avgPct != null ? `IVA medio ${avgPct.toFixed(1)}%` : null}
        filter={<ArchiveViewToggle view={view} onChange={setView} />}
        sortOptions={[{ value: 'asc', label: 'Nombre A → Z' }, { value: 'desc', label: 'Nombre Z → A' }]}
        sortValue={sortDir} onSortChange={setSortDir}
        pageSize={pageSize} onPageSize={(v) => { setPageSize(v); setPage(0) }}
        onRefresh={refresh} loading={loading}
        primary={isAdmin && <Button onClick={openCreate} className="gap-2"><Plus size={16} /> Nuevo impuesto</Button>}
      />

      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={TH}>Nombre</th>
                <th className={TH}>Porcentaje</th>
                <th className={TH}>Servicios que lo usan</th>
                {isAdmin && <th className={`${TH} text-right`}>Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
                ))
              ) : taxes.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  {isArchived ? 'No hay impuestos archivados.' : 'No hay impuestos configurados.'}
                </td></tr>
              ) : (
                taxes.map((t) => {
                  const count = usageBy.get(t.id) ?? 0
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#1e3a5f]">{t.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant="default"><Percent size={10} className="mr-0.5" />{t.percentage}%</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {count > 0 ? `${count} servicio${count === 1 ? '' : 's'}` : <span className="text-slate-300">— ninguno</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          {isArchived ? (
                            <div className="flex justify-end">
                              <Button variant="success" size="sm" onClick={() => handleReactivate(t)} className="gap-1.5">
                                <ArchiveRestore size={14} /> Restaurar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(t)} className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Editar"><Pencil size={15} /></button>
                              <button onClick={() => openArchive(t)} className="rounded-xl p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition" title="Archivar"><Archive size={15} /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />
      </div>

      <Modal open={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'create' ? 'Nuevo impuesto' : 'Editar impuesto'} size="sm">
        <div className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="IVA general" maxLength={50} />
          <Input label="Porcentaje *" type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={(e) => setForm((p) => ({ ...p, percentage: e.target.value }))} placeholder="21" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{modal === 'create' ? 'Crear' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === 'archive'} onClose={closeModal} title="Archivar impuesto" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
            <Archive size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-snug">
              ¿Archivar el impuesto <strong>{selected?.name}</strong>?
              {(usageBy.get(selected?.id) ?? 0) > 0 && ` Hay ${usageBy.get(selected?.id)} servicio(s) usándolo; el backend bloqueará la acción si tiene dependencias activas.`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleArchive} loading={saving} className="flex-1">Archivar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

