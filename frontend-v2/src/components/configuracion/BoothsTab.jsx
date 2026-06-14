// pestana de configuracion: BoothsTab
import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Archive, ArchiveRestore, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { CARD, emptyBooth, BOOTH_COLOR_OPTIONS, BOOTH_COLOR_CLS, boothColor, fmtSinceShort } from './configShared'
import { SectionHint, Toolbar, ArchiveViewToggle } from './configWidgets'

/** Pestana de cabinas fisicas con gestion y color asignado */
export function BoothsTab({ bId, isAdmin }) {
  const toast = useToast()
  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_cfg_booths_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_cfg_booths_size', String(pageSize)) }, [pageSize])
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('optima_cfg_booths_sort') || 'asc')
  useEffect(() => { localStorage.setItem('optima_cfg_booths_sort', sortDir) }, [sortDir])

  // Vista activos / archivados - sin persistir
  const [view, setView] = useState('active')
  const isArchived = view === 'archived'
  const queryParams = useMemo(() => ({ sort: `name,${sortDir}`, active: view === 'active' }), [sortDir, view])

  const { items: booths, page, totalPages, totalElements, loading, setPage, refresh } =
    usePagedFetch(bId ? `/api/businesses/${bId}/booths` : null, { size: pageSize, params: queryParams })

  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyBooth)
  const [saving, setSaving]     = useState(false)

  const closeModal  = () => { setModal(null); setSelected(null) }
  const openCreate  = () => { setForm(emptyBooth); setSelected(null); setModal('create') }
  const openEdit    = (b) => { setSelected(b); setForm({ name: b.name, color: b.color || '' }); setModal('edit') }
  const openArchive = (b) => { setSelected(b); setModal('archive') }

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ type: 'error', message: 'El nombre es obligatorio.' }); return }
    setSaving(true)
    try {
      const body = { name: form.name, color: form.color || null }
      if (modal === 'create') {
        await api.post(`/api/businesses/${bId}/booths`, body)
        toast({ type: 'success', message: 'Cabina creada.' })
      } else {
        await api.put(`/api/businesses/${bId}/booths/${selected.id}`, body)
        toast({ type: 'success', message: 'Cabina actualizada.' })
      }
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo guardar la cabina.') })
    } finally { setSaving(false) }
  }

  const handleArchive = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/booths/${selected.id}`)
      toast({ type: 'success', message: 'Cabina archivada.' })
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo archivar la cabina.') })
    } finally { setSaving(false) }
  }

  // Restaurar es un clic directo (no destructivo): sin ventana de confirmacion
  const handleReactivate = async (booth) => {
    try {
      await api.patch(`/api/businesses/${bId}/booths/${booth.id}/reactivate`)
      toast({ type: 'success', message: 'Cabina restaurada.' })
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo restaurar la cabina.') })
    }
  }

  return (
    <div>
      <SectionHint title="¿Qué es una cabina?">
        Una cabina representa un espacio físico de trabajo (sala, silla,
        camilla, mesa…). Es útil cuando dos clientes pueden atenderse a
        la misma hora en sitios distintos del local, para reservar la
        cita al sitio concreto. Si tu negocio no necesita trackear esto,
        déjalo vacío: las citas funcionan igual sin cabinas.
      </SectionHint>
      <Toolbar
        rightCount={totalElements}
        rightLabel={isArchived
          ? `cabina${totalElements === 1 ? '' : 's'} archivada${totalElements === 1 ? '' : 's'}`
          : `cabina${totalElements === 1 ? '' : 's'}`}
        filter={<ArchiveViewToggle view={view} onChange={setView} />}
        sortOptions={[{ value: 'asc', label: 'Nombre A → Z' }, { value: 'desc', label: 'Nombre Z → A' }]}
        sortValue={sortDir} onSortChange={setSortDir}
        pageSize={pageSize} onPageSize={(v) => { setPageSize(v); setPage(0) }}
        onRefresh={refresh} loading={loading}
        primary={isAdmin && <Button onClick={openCreate} className="gap-2"><Plus size={16} /> Nueva cabina</Button>}
      />

      {loading ? (
        <div className="card-grid">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : booths.length === 0 ? (
        <p className="py-16 text-center text-slate-400">
          {isArchived ? 'No hay cabinas archivadas.' : 'No hay cabinas configuradas.'}
        </p>
      ) : (
        <>
          <div className="card-grid">
            {booths.map((b) => (
              <div key={b.id} className="group bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-200 hover:shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.4)] ${
                        b.color && BOOTH_COLOR_CLS[b.color]
                          ? BOOTH_COLOR_CLS[b.color]
                          : `bg-gradient-to-br ${boothColor(b.id)}`
                      }`}
                    >
                      <Store size={17} />
                    </div>
                    <div>
                      <p className="font-bold text-[#1e3a5f]">{b.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Creada {fmtSinceShort(b.createdAt)}</p>
                    </div>
                  </div>
                  {isAdmin && !isArchived && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(b)} className="rounded-xl p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => openArchive(b)} className="rounded-xl p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition" title="Archivar"><Archive size={14} /></button>
                    </div>
                  )}
                </div>
                {isAdmin && isArchived && (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    <Button variant="success" size="sm" onClick={() => handleReactivate(b)} className="w-full gap-2">
                      <ArchiveRestore size={14} /> Restaurar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={`mt-6 ${CARD} overflow-hidden`}>
              <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />
            </div>
          )}
        </>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'create' ? 'Nueva cabina' : 'Editar cabina'} size="sm">
        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Sala 1"
            maxLength={80}
          />
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Color en el calendario</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, color: '' }))}
                title="Sin color — el calendario usa uno automático"
                className={`h-8 px-2 rounded-lg border-2 text-[10px] font-bold text-slate-500 transition ${form.color === '' ? 'border-[#1e3a5f]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                Auto
              </button>
              {BOOTH_COLOR_OPTIONS.map(({ name, cls }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: name }))}
                  title={name}
                  aria-label={`Color ${name}`}
                  className={`h-8 w-8 rounded-lg ${cls} ring-2 ring-offset-2 transition ${form.color === name ? 'ring-[#1e3a5f]' : 'ring-transparent hover:ring-slate-300'}`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Para diferenciar las citas de cada cabina de un vistazo. Varias cabinas pueden compartir color.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{modal === 'create' ? 'Crear' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === 'archive'} onClose={closeModal} title="Archivar cabina" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
            <Archive size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-snug">¿Archivar la cabina <strong>{selected?.name}</strong>? Dejará de poder asignarse a citas nuevas.</p>
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

