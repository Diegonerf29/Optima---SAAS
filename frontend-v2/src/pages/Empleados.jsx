// gestion de empleados con su detalle, horario semanal, ausencias y desactivacion
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, UserMinus, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, INPUT_SANITIZE } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { useCatalog } from '@/context/CatalogContext'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { ymd } from '@/lib/format'
import { EmployeeCard } from '@/components/employees/EmployeeCard'
import { EmployeeDrawer } from '@/components/employees/EmployeeDrawer'

// formulario vacio de empleado
const empty = { fullName: '', email: '', phone: '', password: '', roleId: '', color: '' }

// paleta de colores del empleado en el calendario
// coinciden con los de components/calendar/utils.js y varias personas pueden compartir color
const COLOR_OPTIONS = [
  { name: 'cyan', cls: 'bg-cyan-500' }, { name: 'amber', cls: 'bg-amber-500' },
  { name: 'emerald', cls: 'bg-emerald-500' }, { name: 'indigo', cls: 'bg-indigo-500' },
  { name: 'pink', cls: 'bg-pink-500' }, { name: 'sky', cls: 'bg-sky-500' },
  { name: 'violet', cls: 'bg-violet-500' }, { name: 'teal', cls: 'bg-teal-500' },
]

/** listado de empleados con accesos al detalle, horario y ausencias */
export default function Empleados() {
  const { user } = useAuth()
  const { roles, roleLabel } = useCatalog()
  const toast = useToast()
  const navigate = useNavigate()
  const bId = user?.businessId
  const isAdmin = user?.role === 'ADMIN'

  // preferencias que se recuerdan en el navegador
  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_emp_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_emp_size', String(pageSize)) }, [pageSize])

  // orden estable por nombre de usuario
  const [sortKey, setSortKey] = useState(() => {
    const stored = localStorage.getItem('optima_emp_sortkey')
    return stored === 'createdAt' ? stored : 'user.fullName'
  })
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('optima_emp_sortdir') || 'asc')
  useEffect(() => { localStorage.setItem('optima_emp_sortkey', sortKey) }, [sortKey])
  useEffect(() => { localStorage.setItem('optima_emp_sortdir', sortDir) }, [sortDir])

  const onSortChange = (value) => {
    // el desplegable envia el campo y el sentido juntos como fullName,asc
    const [k, d] = value.split(',')
    setSortKey(k); setSortDir(d)
  }

  // vista de activos o archivados, no se recuerda entre visitas
  const [view, setView] = useState('active') // 'active' | 'archived'
  const isArchived = view === 'archived'

  // filtros que se mandan al servidor, el orden y si estan archivados
  const queryParams = useMemo(
    () => ({ sort: `${sortKey},${sortDir}`, active: view === 'active' }),
    [sortKey, sortDir, view],
  )

  // se cargan todos los empleados a la vez para buscar y paginar en el cliente
  const { items: employees, totalElements, loading, refresh } =
    usePagedFetch(bId ? `/api/businesses/${bId}/users` : null, { size: 100, params: queryParams })

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL') // ALL | ADMIN | EMPLOYEE
  const [drawer, setDrawer] = useState(null) // empleado seleccionado para el panel
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  // cierra el panel con la tecla esc
  useEffect(() => {
    if (!drawer) return
    const handler = (e) => { if (e.key === 'Escape') setDrawer(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawer])

  const filtered = employees
    .filter((e) => roleFilter === 'ALL' || e.roleName === roleFilter)
    .filter((e) =>
      e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
    )

  // paginacion en el cliente sobre el resultado ya filtrado
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  // rol que sale marcado por defecto en el alta de empleado
  const defaultRoleId = () => roles.find((r) => r.name === 'EMPLOYEE')?.id ?? roles[0]?.id ?? ''

  const openCreate = () => { setForm({ ...empty, roleId: defaultRoleId() }); setSelected(null); setModal('create') }
  const openEditRole = (e) => {
    setSelected(e)
    setForm({
      fullName: e.fullName,
      email:    e.email,
      phone:    e.phone || '',
      password: '',
      roleId:   e.roleId,
      color:    e.color || '',
    })
    setModal('edit')
  }
  // cuenta las citas proximas del empleado antes de desactivarlo
  // es null mientras carga y un numero cuando llega la respuesta
  // si la consulta se cancela o falla se asume cero
  const [upcomingInfo, setUpcomingInfo] = useState({ loading: false, count: null })
  const upcomingAbortRef = useRef(null)

  // abre la ventana de baja y consulta las citas proximas del empleado
  const openDeactivate = async (e) => {
    upcomingAbortRef.current?.abort()
    const controller = new AbortController()
    upcomingAbortRef.current = controller

    setSelected(e)
    setModal('deactivate')
    setUpcomingInfo({ loading: true, count: null })

    const from = ymd(new Date())
    try {
      const r = await api.get(`/api/businesses/${bId}/appointments`, {
        params: { membershipId: e.id, from, size: 1 },
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setUpcomingInfo({ loading: false, count: r.data.totalElements ?? 0 })
    } catch (err) {
      // si se cancela la consulta no se hace nada, el admin cerro la ventana antes
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      setUpcomingInfo({ loading: false, count: 0 })
    }
  }
  const closeModal = () => {
    // corta la consulta de citas si seguia en marcha al cerrar la ventana
    upcomingAbortRef.current?.abort()
    setUpcomingInfo({ loading: false, count: null })
    setModal(null)
    setSelected(null)
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  // guarda el alta del empleado o los cambios de rol y color
  const handleSave = async () => {
    if (modal === 'create' && (!form.fullName.trim() || !form.email.trim())) {
      toast({ type: 'error', message: 'Nombre y email son obligatorios.' }); return
    }
    if (!form.roleId) {
      toast({ type: 'error', message: 'Selecciona un rol.' }); return
    }
    if (modal === 'create' && !form.password) {
      toast({ type: 'error', message: 'La contraseña es obligatoria.' }); return
    }
    if (modal === 'create' && form.password.length < 8) {
      toast({ type: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' }); return
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.post(`/api/businesses/${bId}/users`, {
          fullName: form.fullName,
          email:    form.email,
          phone:    form.phone || null,
          password: form.password,
          roleId:   Number(form.roleId),
        })
        toast({ type: 'success', message: 'Empleado creado correctamente.' })
      } else {
        // aqui solo se cambian el rol y el color
        // el nombre, email y telefono se editan en el perfil del usuario
        await api.put(`/api/businesses/${bId}/users/${selected.id}`, {
          roleId: Number(form.roleId),
          color: form.color || null,
        })
        toast({ type: 'success', message: 'Cambios guardados.' })
      }
      closeModal()
      refresh()
      // si el panel seguia abierto sobre este empleado se cierra
      if (drawer?.id === selected?.id) setDrawer(null)
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally {
      setSaving(false)
    }
  }

  // desactiva el empleado y refresca el listado
  const handleDeactivate = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/users/${selected.id}`)
      toast({ type: 'success', message: 'Empleado desactivado.' })
      closeModal()
      if (drawer?.id === selected.id) setDrawer(null)
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al desactivar el empleado.') })
    } finally {
      setSaving(false)
    }
  }

  // reactivar es directo y no pide confirmacion
  const handleReactivate = async (emp) => {
    try {
      await api.patch(`/api/businesses/${bId}/users/${emp.id}/reactivate`)
      toast({ type: 'success', message: 'Empleado reactivado.' })
      if (drawer?.id === emp.id) setDrawer(null)
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al reactivar el empleado.') })
    }
  }


  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">

      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Empleados</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
            <Users size={14} />
            {loading
              ? '…'
              : isArchived
                ? `${totalElements} usuario${totalElements === 1 ? '' : 's'} desactivado${totalElements === 1 ? '' : 's'}`
                : `${totalElements} usuario${totalElements === 1 ? '' : 's'} en plantilla`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            title="Refrescar"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <Button onClick={openCreate} className="gap-2" disabled={!roles.length}>
              <Plus size={16} /> Nuevo empleado
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-[#1f2c4a] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {[
            { key: 'ALL',      label: 'Todos' },
            { key: 'ADMIN',    label: 'Admins' },
            { key: 'EMPLOYEE', label: 'Empleados' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                roleFilter === key
                  ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                  : 'text-slate-500 hover:text-[#1e3a5f]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {[{ key: 'active', label: 'Activos' }, { key: 'archived', label: 'Desactivados' }].map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setView(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
              }`}>{label}</button>
          ))}
        </div>

        <select
          value={`${sortKey},${sortDir}`}
          onChange={(e) => onSortChange(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
        >
          <option value="user.fullName,asc">Nombre A → Z</option>
          <option value="user.fullName,desc">Nombre Z → A</option>
          <option value="createdAt,desc">Más recientes</option>
          <option value="createdAt,asc">Más antiguos</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0) }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="card-grid">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            {search || roleFilter !== 'ALL' ? (
              <p className="py-20 text-center text-slate-400">
                Sin resultados con estos filtros.
              </p>
            ) : isArchived ? (
              <EmptyState
                icon={Users}
                title="No hay empleados desactivados"
                description="Los empleados que desactives aparecerán aquí para que puedas reactivarlos."
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Aún no hay empleados"
                description="Da de alta a tu equipo para asignarles horarios y citas."
                actionLabel={isAdmin ? 'Nuevo empleado' : undefined}
                onAction={isAdmin ? openCreate : undefined}
              />
            )}
          </div>
        ) : (
          paged.map((e) => (
            <EmployeeCard
              key={e.id}
              emp={e}
              onOpen={() => setDrawer(e)}
              archived={isArchived}
              showReactivate={isArchived && isAdmin}
              onReactivate={() => handleReactivate(e)}
            />
          ))
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 overflow-hidden bg-white">
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalElements={filtered.length}
          onChange={setPage}
        />
      </div>

      {drawer && (
        <EmployeeDrawer
          key={drawer.id}
          emp={drawer}
          bId={bId}
          isAdmin={isAdmin}
          archived={isArchived}
          onClose={() => setDrawer(null)}
          onEditRole={() => openEditRole(drawer)}
          onDeactivate={() => openDeactivate(drawer)}
          onReactivate={() => handleReactivate(drawer)}
        />
      )}

      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Nuevo empleado' : 'Cambiar rol del empleado'}
      >
        <div className="space-y-4">
          {modal === 'edit' && (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-500">
              Para cambiar el nombre, email o teléfono el propio usuario debe editarlo en su perfil.
              Desde aquí solo puedes actualizar el rol.
            </div>
          )}
          <Input
            label="Nombre completo *"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Nombre y apellidos"
            disabled={modal === 'edit'}
            maxLength={150}
          />
          <Input
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="empleado@empresa.com"
            disabled={modal === 'edit'}
            maxLength={150}
          />
          <Input
            label="Teléfono"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="600 000 000"
            disabled={modal === 'edit'}
            sanitize={INPUT_SANITIZE.PHONE}
            inputMode="tel"
            maxLength={20}
          />
          {modal === 'create' && (
            <Input
              label="Contraseña *"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              maxLength={100}
            />
          )}
          <Select label="Rol *" name="roleId" value={form.roleId} onChange={handleChange}>
            <option value="">Selecciona rol</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>
            ))}
          </Select>
          {modal === 'edit' && (
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
                {COLOR_OPTIONS.map(({ name, cls }) => (
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
              <p className="text-xs text-slate-400 mt-1.5">Para diferenciar sus citas de un vistazo. Varios empleados pueden compartir color.</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {modal === 'create' ? 'Crear empleado' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'deactivate'} onClose={closeModal} title="Desactivar empleado" size="sm">
        <div className="space-y-5">
          {upcomingInfo.count != null && upcomingInfo.count > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-4">
              <UserMinus size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800 leading-snug space-y-1.5">
                <p>
                  <strong>{selected?.fullName}</strong> tiene <strong>{upcomingInfo.count} cita{upcomingInfo.count === 1 ? '' : 's'}</strong> pendiente{upcomingInfo.count === 1 ? '' : 's'}.
                </p>
                <p className="text-rose-700">
                  No se puede archivar a un empleado con citas activas: <strong>cancélalas o reasígnalas</strong> antes
                  de archivarlo. Pulsa <em>Ver citas</em> para revisarlas con el filtro ya aplicado.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
              <UserMinus size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-snug">
                {upcomingInfo.loading ? (
                  <>Comprobando citas próximas de <strong>{selected?.fullName}</strong>…</>
                ) : (
                  <>¿Desactivar a <strong>{selected?.fullName}</strong>? Dejará de poder iniciar sesión y
                  no podrá asignarse a nuevas citas, pero seguirá presente en el historial.</>
                )}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            {upcomingInfo.count > 0 ? (
              <Button
                variant="primary"
                onClick={() => {
                  // deja preseleccionado el filtro de este empleado en citas y navega alla
                  if (selected?.id) localStorage.setItem('optima_citas_emp', String(selected.id))
                  closeModal()
                  navigate('/citas')
                }}
                className="flex-1 gap-2"
              >
                Ver citas <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleDeactivate}
                loading={saving}
                disabled={upcomingInfo.loading}
                className="flex-1"
              >
                Desactivar
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
