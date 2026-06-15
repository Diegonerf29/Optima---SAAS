// Listado paginado de citas con filtros por fecha, estado, empleado y wizard de creacion
import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, CalendarDays, FilterX,
  AlertCircle, Zap, ArrowRight, RefreshCw, List, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppointmentWizard } from '@/components/appointments/AppointmentWizard'
import { AppointmentDetailModal } from '@/components/appointments/AppointmentDetailModal'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { DayGroupedList } from '@/components/appointments/DayGroupedList'
import { datePreset, fmtMinsLeft, STATUS_DOT } from '@/components/appointments/citasShared'
import { useAuth } from '@/context/AuthContext'
import { useCatalog } from '@/context/CatalogContext'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { totalBooked, fmtEur } from '@/lib/format'


/** Listado de citas con filtros por fecha, empleado y estado, y wizard para crear o editar */
export default function Citas() {
  const { user } = useAuth()
  const { statuses, statusLabel } = useCatalog()
  const toast = useToast()
  const bId = user?.businessId

  // Tick cada minuto para countdown del banner "EN CURSO"
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_citas_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_citas_size', String(pageSize)) }, [pageSize])

  // D2: selector temporal "Proximas" (futuras asc) / "Pasadas" (pasadas desc)
  // Sustituye al "asc/desc" ambiguo anterior La key cambia para no heredar
  // valores antiguos del almacen local
  const [timeMode, setTimeMode] = useState(() => localStorage.getItem('optima_citas_timemode') || 'upcoming')
  useEffect(() => { localStorage.setItem('optima_citas_timemode', timeMode) }, [timeMode])

  const [view, setView] = useState(() => localStorage.getItem('optima_citas_view') || 'list')
  useEffect(() => { localStorage.setItem('optima_citas_view', view) }, [view])

  // Filtros en servidor persistidos (rango y empleado)
  const [fromDate, setFromDate]         = useState(() => localStorage.getItem('optima_citas_from') || '')
  const [toDate, setToDate]             = useState(() => localStorage.getItem('optima_citas_to') || '')
  const [employeeFilter, setEmployeeFilter] = useState(() => localStorage.getItem('optima_citas_emp') || '')
  useEffect(() => { localStorage.setItem('optima_citas_from', fromDate) }, [fromDate])
  useEffect(() => { localStorage.setItem('optima_citas_to',   toDate) },   [toDate])
  useEffect(() => { localStorage.setItem('optima_citas_emp',  employeeFilter) }, [employeeFilter])

  // Solo se envian claves con valor
  // sort: la auditoria I010 dice que solo `startDateTime` es seguro como sort
  // El timeMode "upcoming" -> asc, "past" -> desc
  const listParams = useMemo(() => {
    const p = { sort: `startDateTime,${timeMode === 'past' ? 'desc' : 'asc'}` }
    if (fromDate) p.from = fromDate
    if (toDate)   p.to = toDate
    if (employeeFilter) p.membershipId = employeeFilter
    return p
  }, [fromDate, toDate, employeeFilter, timeMode])

  // Se cargan TODAS las citas del rango (size=100, tope del servidor) para que
  // la busqueda y la paginacion operen sobre el conjunto completo
  const {
    items: appointments, totalElements, loading, refresh,
  } = usePagedFetch(bId ? `/api/businesses/${bId}/appointments` : null, { size: 100, params: listParams })

  // Empleados para el desplegable
  const [employees, setEmployees] = useState([])
  useEffect(() => {
    if (!bId) return
    api.get(`/api/businesses/${bId}/users?size=100`)
      .then((r) => setEmployees(r.data.content))
      .catch((err) => toast({ type: 'error', message: getErrorMessage(err, 'No se pudieron cargar los empleados.') }))
  }, [bId, toast])

  // Map membershipId -> color asignado al empleado Sirve para pintar el
  // punto de identidad visual del empleado en cada cita (tarjeta y detalle)
  // de forma coherente con el calendario F del audit de interfaz
  const empColorMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.color])),
    [employees],
  )

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [unpaidOnly, setUnpaidOnly] = useState(false)

  // Frontera temporal: las citas de HOY se consideran "Proximas" todo el dia
  // (no se mueven de modo durante la jornada) Comparar contra startOfToday
  // en lugar de `now` evita reordenes y movimientos inesperados
  const startOfToday = useMemo(() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime()
  }, [now])

  const visible = appointments.filter((a) => {
    const startMs = new Date(a.startDateTime).getTime()
    if (timeMode === 'upcoming' && startMs < startOfToday) return false
    if (timeMode === 'past' && startMs >= startOfToday) return false
    const matchSearch = !search ||
      a.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.userFullName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || a.statusName === filterStatus
    const matchPaid   = !unpaidOnly || !a.isPaid
    return matchSearch && matchStatus && matchPaid
  })

  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = visible.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const inProgressNow = useMemo(
    () =>
      appointments.find(
        (a) => a.statusName === 'IN_PROGRESS' &&
               new Date(a.startDateTime) <= now &&
               now <= new Date(a.endDateTime),
      ),
    [appointments, now],
  )
  const inProgressMinsLeft = inProgressNow
    ? Math.max(0, Math.round((new Date(inProgressNow.endDateTime) - now) / 60000))
    : null

  const pageStats = useMemo(() => {
    const considered = visible.filter((a) => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
    const total = considered.reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0)
    const paid  = considered.filter((a) => a.isPaid)
                            .reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0)
    const unpaidCount = considered.filter((a) => !a.isPaid).length
    const lost = visible.filter((a) => a.statusName === 'CANCELLED' || a.statusName === 'NO_SHOW').length
    return { count: visible.length, total, paid, unpaidCount, lost }
  }, [visible])

  const statusTabs = [
    { key: '', label: 'Todos' },
    ...statuses.map((s) => ({ key: s.name, label: statusLabel(s.name) })),
  ]

  const presetsConfig = [
    { key: 'today',     label: 'Hoy' },
    { key: 'tomorrow',  label: 'Mañana' },
    { key: 'week',      label: 'Esta semana' },
    { key: 'next7',     label: 'Próximos 7 días' },
    { key: 'month',     label: 'Este mes' },
    { key: 'lastMonth', label: 'Mes pasado' },
  ]
  const applyPreset = (key) => {
    const { from, to } = datePreset(key)
    setFromDate(from); setToDate(to)
  }

  const clearAllFilters = () => {
    setFromDate(''); setToDate(''); setEmployeeFilter('')
    setSearch(''); setFilterStatus(''); setUnpaidOnly(false)
  }
  const hasAnyFilter = Boolean(
    fromDate || toDate || employeeFilter || search || filterStatus || unpaidOnly,
  )
  const hasServerFilters = Boolean(fromDate || toDate || employeeFilter)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState(null)
  const [detailAppt, setDetailAppt] = useState(null)
  // startEditing apaga explicitamente cualquier otro estado que pudiera
  // mantener el wizard abierto en modo crear; asi no hay solape de modos
  const startEditing = (appt) => {
    setDetailAppt(null)
    setWizardOpen(false)
    setEditingAppt(appt)
  }
  const closeWizard = () => { setWizardOpen(false); setEditingAppt(null) }


  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">

      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Citas</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
            <CalendarDays size={14} />
            {loading ? '…' : `${totalElements} cita${totalElements === 1 ? '' : 's'} registrada${totalElements === 1 ? '' : 's'}`}
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
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus size={16} /> Nueva cita
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="En esta página" value={pageStats.count} tone="default" />
        <StatTile label="€ previstos"    value={fmtEur(pageStats.total)} tone="default" />
        <StatTile label="€ cobrados"     value={fmtEur(pageStats.paid)}  tone="success" />
        <StatTile label="Sin cobrar"     value={pageStats.unpaidCount} tone="warning" />
        <StatTile label="Canceladas / no show" value={pageStats.lost} tone="danger" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o empleado…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-[#1f2c4a] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <select
          value={timeMode}
          onChange={(e) => setTimeMode(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
        >
          <option value="upcoming">Próximas</option>
          <option value="past">Pasadas</option>
        </select>

        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === 'list'
                ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-[#1e3a5f]'
            }`}
          >
            <List size={14} /> Lista
          </button>
          <button
            type="button"
            onClick={() => setView('day')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === 'day'
                ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-[#1e3a5f]'
            }`}
          >
            <Calendar size={14} /> Por día
          </button>
        </div>

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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mr-1">Estado</span>
        {statusTabs.map(({ key, label }) => (
          <button
            key={key || 'ALL'}
            onClick={() => setFilterStatus(key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
              filterStatus === key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#1e3a5f]'
            }`}
          >
            {key && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[key]}`} />}
            {label}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-slate-200" />
        <button
          onClick={() => setUnpaidOnly((v) => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
            unpaidOnly
              ? 'bg-amber-500 text-white'
              : 'bg-white border border-slate-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50'
          }`}
        >
          <AlertCircle size={12} /> Solo pendientes de pago
        </button>
      </div>

      <div className="mb-5 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.05)] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mr-1">Atajos</span>
          {presetsConfig.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 transition"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Input label="Desde" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="w-40">
            <Input label="Hasta" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="w-56">
            <Select label="Empleado" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">Todos los empleados</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </Select>
          </div>
          {hasAnyFilter && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5">
              <FilterX size={14} /> Limpiar todo
            </Button>
          )}
          <span className="ml-auto text-[11px] text-slate-400 font-medium pb-2.5">
            <strong>Rango/empleado</strong> filtran todo el listado · <strong>Estado/pago/búsqueda</strong> solo esta página
          </span>
        </div>
      </div>

      {inProgressNow && (
        <div className="mb-4 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-4 shadow-[0_4px_16px_-4px_rgba(14,165,233,0.25)]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shrink-0 animate-pulse">
            <Zap size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-sky-700 uppercase tracking-[0.18em]">Ahora en curso</div>
            <div className="text-sm font-bold text-[#1e3a5f] mt-0.5 truncate">
              {inProgressNow.clientName}
              {' · '}{inProgressNow.bookedServices?.map((b) => b.serviceName).join(' + ') || 'Sin servicios'}
              {' · '}{inProgressNow.userFullName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Termina en <strong className="text-sky-700">{fmtMinsLeft(inProgressMinsLeft)}</strong>
              {' · '}{inProgressNow.startDateTime.slice(11, 16)} – {inProgressNow.endDateTime.slice(11, 16)}
              {inProgressNow.boothName && ` · ${inProgressNow.boothName}`}
            </div>
          </div>
          <button
            onClick={() => setDetailAppt(inProgressNow)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
          >
            Ver detalle <ArrowRight size={12} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="appt-grid">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        hasServerFilters ? (
          <div className="py-20 text-center text-slate-400">
            No hay citas en el rango seleccionado.
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Aún no hay citas"
            description="Crea la primera cita con el asistente: cliente, servicios y un hueco disponible."
            actionLabel="Nueva cita"
            onAction={() => setWizardOpen(true)}
          />
        )
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          Sin resultados con esos filtros.
        </div>
      ) : view === 'day' ? (
        <DayGroupedList list={paged} onOpen={setDetailAppt} empColorMap={empColorMap} />
      ) : (
        // Rejilla en vez de lista vertical: en 2K/4K una sola columna estiraba
        // cada tarjeta a 3000+ px dejando un hueco enorme entre datos e importe
        <div className="appt-grid">
          {paged.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onClick={() => setDetailAppt(a)}
              employeeColor={empColorMap.get(a.membershipId)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
          <Pagination page={safePage} totalPages={totalPages} totalElements={visible.length} onChange={setPage} />
        </div>
      )}

      <AppointmentWizard
        open={wizardOpen || Boolean(editingAppt)}
        onClose={closeWizard}
        onCreated={refresh}
        bId={bId}
        appointmentToEdit={editingAppt}
      />
      <AppointmentDetailModal
        appointment={detailAppt}
        bId={bId}
        onClose={() => setDetailAppt(null)}
        onChanged={refresh}
        onEdit={startEditing}
        employeeColor={detailAppt ? empColorMap.get(detailAppt.membershipId) : undefined}
      />
    </div>
  )
}


/** Tarjeta de KPI del strip superior */
function StatTile({ label, value, tone }) {
  const tones = {
    default: 'text-[#1e3a5f]',
    success: 'text-emerald-600',
    warning: 'text-orange-600',
    danger:  'text-rose-500',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  )
}

