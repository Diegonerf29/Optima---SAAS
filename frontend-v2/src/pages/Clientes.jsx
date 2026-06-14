// CRUD de clientes con buscador, paginacion, panel lateral y archivado
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Archive, Users, List, LayoutGrid, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, INPUT_SANITIZE } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { AppointmentWizard } from '@/components/appointments/AppointmentWizard'
import { ClientsTable } from '@/components/clients/ClientsTable'
import { ClientCards } from '@/components/clients/ClientCards'
import { ClientDrawer } from '@/components/clients/ClientDrawer'
import { empty } from '@/components/clients/clientShared'

/** Listado y gestion de clientes con buscador en servidor, paginacion y archivado */
export default function Clientes() {
  const { user } = useAuth()
  const toast = useToast()
  const bId = user?.businessId

  const [view, setView] = useState(() => localStorage.getItem('optima_clients_view') || 'table')
  useEffect(() => { localStorage.setItem('optima_clients_view', view) }, [view])

  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_clients_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_clients_size', String(pageSize)) }, [pageSize])

  // sortKey: 'fullName' | 'createdAt' - sortDir: 'asc' | 'desc'
  const [sortKey, setSortKey] = useState(() => localStorage.getItem('optima_clients_sortkey') || 'createdAt')
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('optima_clients_sortdir') || 'desc')
  useEffect(() => { localStorage.setItem('optima_clients_sortkey', sortKey) }, [sortKey])
  useEffect(() => { localStorage.setItem('optima_clients_sortdir', sortDir) }, [sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Por defecto: nombres asc, fechas desc
      setSortDir(key === 'fullName' ? 'asc' : 'desc')
    }
  }

  const [archiveView, setArchiveView] = useState('active') // 'active' | 'archived'
  const isArchived = archiveView === 'archived'

  // Filtros que viajan al servidor: ordenacion + flag de archivado
  const queryParams = useMemo(
    () => ({ sort: `${sortKey},${sortDir}`, active: archiveView === 'active' }),
    [sortKey, sortDir, archiveView],
  )

  // para que la busqueda y la paginacion operen sobre el conjunto
  // completo, no sobre una sola pagina Mismo patron que Bloqueos
  const { items: clients, totalElements, loading, refresh } =
    usePagedFetch(bId ? `/api/businesses/${bId}/clients` : null, { size: 100, params: queryParams })

  const [search, setSearch] = useState('')
  const filtered = clients.filter((c) =>
    c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const [modal, setModal] = useState(null)       // 'create' | 'edit' | 'archive' | null
  const [selected, setSelected] = useState(null) // cliente seleccionado para edit/archive
  const [drawer, setDrawer] = useState(null)     // cliente abierto en el panel lateral
  const [wizardClient, setWizardClient] = useState(null) // cliente para el que se crea una cita
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const openCreate = () => { setForm(empty); setSelected(null); setModal('create') }
  const openEdit = (c) => {
    setSelected(c)
    setForm({
      fullName: c.fullName,
      email:    c.email || '',
      phone:    c.phone || '',
      notes:    c.notes || '',
    })
    setModal('edit')
  }
  const openArchive = (c) => { setSelected(c); setModal('archive') }
  const closeModal = () => setModal(null)
  const closeDrawer = () => setDrawer(null)

  // Cierra el panel con Esc
  useEffect(() => {
    if (!drawer) return
    const handler = (e) => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawer])

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast({ type: 'error', message: 'El nombre es obligatorio.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName: form.fullName,
        email:    form.email,
        phone:    form.phone,
        notes:    form.notes,
      }
      if (modal === 'create') {
        await api.post(`/api/businesses/${bId}/clients`, payload)
        toast({ type: 'success', message: 'Cliente creado correctamente.' })
      } else {
        await api.put(`/api/businesses/${bId}/clients/${selected.id}`, payload)
        toast({ type: 'success', message: 'Cliente actualizado.' })
      }
      closeModal()
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setSaving(true)
    try {
      // El borrado mantiene el cliente en archivado
      await api.delete(`/api/businesses/${bId}/clients/${selected.id}`)
      toast({ type: 'success', message: 'Cliente archivado.' })
      closeModal()
      // Si el panel esta abierto sobre este cliente, cierralo
      if (drawer?.id === selected.id) setDrawer(null)
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al archivar el cliente.') })
    } finally {
      setSaving(false)
    }
  }

  // Restaurar es un clic directo (no destructivo): sin ventana de confirmacion
  const handleReactivate = async (client) => {
    try {
      await api.patch(`/api/businesses/${bId}/clients/${client.id}/reactivate`)
      toast({ type: 'success', message: 'Cliente restaurado.' })
      if (drawer?.id === client.id) setDrawer(null)
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al restaurar el cliente.') })
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
            <Users size={14} />
            {loading
              ? '…'
              : isArchived
                ? `${totalElements} cliente${totalElements === 1 ? '' : 's'} archivado${totalElements === 1 ? '' : 's'}`
                : `${totalElements} cliente${totalElements === 1 ? '' : 's'} registrado${totalElements === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            title="Refrescar"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={openCreate} className="gap-2 shrink-0 whitespace-nowrap">
            <Plus size={16} /> Nuevo cliente
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-[#1f2c4a] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {[{ key: 'active', label: 'Activos' }, { key: 'archived', label: 'Archivados' }].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setArchiveView(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                archiveView === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
              }`}>{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0) }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>por página</span>
        </div>

        <div className="ml-auto inline-flex items-center bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === 'table'
                ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-[#1e3a5f]'
            }`}
          >
            <List size={14} /> Tabla
          </button>
          <button
            type="button"
            onClick={() => setView('cards')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === 'cards'
                ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-[#1e3a5f]'
            }`}
          >
            <LayoutGrid size={14} /> Tarjetas
          </button>
        </div>
      </div>

      {view === 'table' && (
        <ClientsTable
          clients={paged}
          loading={loading}
          search={search}
          isArchived={isArchived}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onOpen={setDrawer}
          onEdit={openEdit}
          onArchive={openArchive}
          onReactivate={handleReactivate}
          onCreate={openCreate}
          page={safePage}
          totalPages={totalPages}
          totalElements={filtered.length}
          onPageChange={setPage}
        />
      )}

      {view === 'cards' && (
        <ClientCards
          clients={paged}
          loading={loading}
          search={search}
          isArchived={isArchived}
          onOpen={setDrawer}
          onEdit={openEdit}
          onArchive={openArchive}
          onReactivate={handleReactivate}
          onCreate={openCreate}
          page={safePage}
          totalPages={totalPages}
          totalElements={filtered.length}
          onPageChange={setPage}
        />
      )}

      {drawer && (
        <ClientDrawer
          client={drawer}
          isArchived={isArchived}
          onClose={closeDrawer}
          onNewAppointment={() => { setWizardClient(drawer); setDrawer(null) }}
          onEdit={() => { openEdit(drawer); setDrawer(null) }}
          onArchive={openArchive}
          onReactivate={handleReactivate}
        />
      )}

      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
      >
        <div className="space-y-4">
          <Input label="Nombre completo *" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Nombre y apellidos" maxLength={150} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="cliente@email.com" maxLength={150} />
          <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} placeholder="600 000 000" sanitize={INPUT_SANITIZE.PHONE} inputMode="tel" maxLength={20} />
          <Textarea label="Notas" name="notes" value={form.notes} onChange={handleChange} placeholder="Observaciones, alergias, preferencias…" maxLength={1000} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {modal === 'create' ? 'Crear cliente' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'archive'} onClose={closeModal} title="Archivar cliente" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
            <Archive size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-snug">
              ¿Archivar a <strong>{selected?.fullName}</strong>?
              Dejará de aparecer en el listado pero seguirá presente en el historial de citas.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleArchive} loading={saving} className="flex-1">Archivar</Button>
          </div>
        </div>
      </Modal>

      <AppointmentWizard
        open={!!wizardClient}
        prefillClientId={wizardClient?.id}
        bId={bId}
        onClose={() => setWizardClient(null)}
      />
    </div>
  )
}
