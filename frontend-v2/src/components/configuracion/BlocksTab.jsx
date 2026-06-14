// pestana de configuracion: BlocksTab
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Store, User, Globe, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { emptyBlock, fmtDate } from './configShared'
import { SectionHint } from './configWidgets'

/** Pestana de bloqueos de agenda (global, por empleado o por cabina) */
export function BlocksTab({ bId, isAdmin }) {
  const toast = useToast()
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Sin paginacion: esta pestana agrupa los bloqueos en secciones (En curso /
  // Proximos / Pasados) Paginar descuadraria el recuento de cada seccion
  // frente al total size=100 es el tope del servidor, de sobra para los
  // bloqueos de agenda de un negocio
  const { items: blocks, totalElements, loading, refresh } =
    usePagedFetch(bId ? `/api/businesses/${bId}/schedule-blocks` : null, { size: 100 })

  const [employees, setEmployees] = useState([])
  const [booths, setBooths]       = useState([])
  useEffect(() => {
    if (!bId) return
    Promise.allSettled([
      api.get(`/api/businesses/${bId}/users?size=100`),
      api.get(`/api/businesses/${bId}/booths?size=100`),
    ]).then(([u, b]) => {
      setEmployees(u.status === 'fulfilled' ? u.value.data.content : [])
      setBooths(b.status === 'fulfilled' ? b.value.data.content : [])
    })
  }, [bId])

  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyBlock)
  const [saving, setSaving]     = useState(false)

  const closeModal = () => { setModal(null); setSelected(null) }
  const openCreate = () => { setForm(emptyBlock); setModal('create') }
  const openDelete = (b) => { setSelected(b); setModal('delete') }

  const handleCreate = async () => {
    if (form.type === 'employee' && !form.membershipId) { toast({ type: 'error', message: 'Selecciona un empleado.' }); return }
    if (form.type === 'booth' && !form.boothId)         { toast({ type: 'error', message: 'Selecciona una cabina.' }); return }
    if (!form.startDate || !form.endDate)               { toast({ type: 'error', message: 'Las fechas son obligatorias.' }); return }
    if (form.startDate > form.endDate)                  { toast({ type: 'error', message: 'La fecha de fin debe ser igual o posterior al inicio.' }); return }
    setSaving(true)
    try {
      await api.post(`/api/businesses/${bId}/schedule-blocks`, {
        membershipId: form.type === 'employee' ? Number(form.membershipId) : null,
        boothId:      form.type === 'booth' ? Number(form.boothId) : null,
        startDate: form.startDate, endDate: form.endDate, reason: form.reason || null,
      })
      toast({ type: 'success', message: 'Bloqueo creado.' })
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo crear el bloqueo.') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/schedule-blocks/${selected.id}`)
      toast({ type: 'success', message: 'Bloqueo eliminado.' })
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo eliminar el bloqueo.') })
    } finally { setSaving(false) }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const typeOf = (b) => b.membershipId ? 'employee' : (b.boothId ? 'booth' : 'global')

  const filtered = blocks.filter((b) => typeFilter === 'ALL' || typeOf(b) === typeFilter.toLowerCase())

  const sections = useMemo(() => {
    const active = [], upcoming = [], past = []
    filtered.forEach((b) => {
      const start = new Date(`${b.startDate}T00:00:00`)
      const end   = new Date(`${b.endDate}T23:59:59`)
      if (today >= start && today <= end) active.push(b)
      else if (today < start) upcoming.push(b)
      else past.push(b)
    })
    upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    active.sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    past.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    return { active, upcoming, past }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  const blockKindBadge = (b) => {
    if (b.membershipId) return <Badge variant="info"><User size={10} className="mr-0.5" />{b.userFullName}</Badge>
    if (b.boothId)      return <Badge variant="purple"><Store size={10} className="mr-0.5" />{b.boothName}</Badge>
    return <Badge variant="default"><Globe size={10} className="mr-0.5" />Global</Badge>
  }

  const BlockCard = ({ b, kind }) => {
    const isActive = kind === 'active'
    return (
      <div className={`bg-white rounded-2xl border ${isActive ? 'border-rose-200' : 'border-slate-100'} p-4 flex items-center gap-3`}>
        {isActive && <div className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 ring-1 ring-rose-200">EN CURSO</div>}
        {blockKindBadge(b)}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1e3a5f]">{fmtDate(b.startDate)} – {fmtDate(b.endDate)}</div>
          {b.reason && <div className="text-xs text-slate-500 truncate">{b.reason}</div>}
        </div>
        {isAdmin && (
          <button onClick={() => openDelete(b)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Eliminar"><Trash2 size={14} /></button>
        )}
      </div>
    )
  }

  return (
    <div>
      <SectionHint title="¿Qué es un bloqueo de agenda?">
        Cierra días completos para que no se puedan agendar citas. Útil
        para festivos, vacaciones del negocio o el cierre puntual de una
        cabina o un empleado concreto. Puede aplicar a todo el negocio
        (Global), a un empleado o a una cabina. Para huecos cortos dentro
        del día usa el horario del empleado o sus ausencias.
      </SectionHint>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {[
            { key: 'ALL',      label: 'Todos' },
            { key: 'GLOBAL',   label: 'Global' },
            { key: 'EMPLOYEE', label: 'Empleado' },
            { key: 'BOOTH',    label: 'Cabina' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${typeFilter === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
            >{label}</button>
          ))}
        </div>
        <button
          onClick={refresh}
          title="Refrescar"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-xs text-slate-500">{totalElements} bloqueo{totalElements === 1 ? '' : 's'}</span>
        {isAdmin && (
          <Button onClick={openCreate} className="ml-auto gap-2" size="sm"><Plus size={14} /> Nuevo bloqueo</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-400">No hay bloqueos de agenda.</p>
      ) : (
        <div className="space-y-6">
          {sections.active.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider">Activos ahora</h2>
                <span className="text-xs text-slate-400 font-medium">· {sections.active.length}</span>
              </div>
              <div className="space-y-2">{sections.active.map((b) => <BlockCard key={b.id} b={b} kind="active" />)}</div>
            </div>
          )}
          {sections.upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider">Próximos</h2>
                <span className="text-xs text-slate-400 font-medium">· {sections.upcoming.length}</span>
              </div>
              <div className="space-y-2">{sections.upcoming.map((b) => <BlockCard key={b.id} b={b} kind="upcoming" />)}</div>
            </div>
          )}
          {sections.past.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <h2 className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider">Pasados</h2>
                <span className="text-xs text-slate-400 font-medium">· {sections.past.length}</span>
              </div>
              <div className="space-y-2">{sections.past.map((b) => <BlockCard key={b.id} b={b} kind="past" />)}</div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'create'} onClose={closeModal} title="Nuevo bloqueo de agenda" size="sm">
        <div className="space-y-4">
          <Select label="Tipo de bloqueo *" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, membershipId: '', boothId: '' }))}>
            <option value="global">Global — todo el negocio</option>
            <option value="employee">Por empleado</option>
            <option value="booth">Por cabina</option>
          </Select>
          {form.type === 'employee' && (
            <Select label="Empleado *" value={form.membershipId} onChange={(e) => setForm((p) => ({ ...p, membershipId: e.target.value }))}>
              <option value="">Selecciona empleado</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </Select>
          )}
          {form.type === 'booth' && (
            <Select label="Cabina *" value={form.boothId} onChange={(e) => setForm((p) => ({ ...p, boothId: e.target.value }))}>
              <option value="">Selecciona cabina</option>
              {booths.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Desde *" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            <Input label="Hasta *" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <Input label="Motivo" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Vacaciones, festivo, mantenimiento…" maxLength={255} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">Crear bloqueo</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === 'delete'} onClose={closeModal} title="Eliminar bloqueo" size="sm">
        <p className="text-sm text-slate-600 mb-5">¿Eliminar el bloqueo del <strong>{fmtDate(selected?.startDate)}</strong> al <strong>{fmtDate(selected?.endDate)}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving} className="flex-1">Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}

