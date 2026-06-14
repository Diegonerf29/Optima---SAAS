// Pagina de calendario con vistas mes, semana y dia, arrastre de citas y filtros
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppointmentWizard } from '@/components/appointments/AppointmentWizard'
import { AppointmentDetailModal } from '@/components/appointments/AppointmentDetailModal'
import { useAuth } from '@/context/AuthContext'
import { useCatalog } from '@/context/CatalogContext'
import { useToast } from '@/components/ui/Toast'
import api, { getErrorMessage } from '@/lib/api'
import { totalBooked } from '@/lib/format'

import {
  MONTHS_ES, VIEW_MODES,
  DEFAULT_DAY_START, DEFAULT_DAY_END, HOUR_PX,
  pad2, keyOf, startOfWeek, rangeFor,
  apptDate, minutesOf, blockForAppointment, absenceForAppointment,
} from '@/components/calendar/utils'
import { ResourceDayGrid }  from '@/components/calendar/ResourceDayGrid'
import { WeekResourceGrid } from '@/components/calendar/WeekResourceGrid'
import { MiniCalendarPopover } from '@/components/calendar/MiniCalendar'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { WeekGrid } from '@/components/calendar/WeekGrid'
import { DayGrid } from '@/components/calendar/DayGrid'
import { FiltersBar } from '@/components/calendar/FiltersBar'
import { ConfirmDropModal } from '@/components/calendar/ConfirmDropModal'
import { StatTile } from '@/components/calendar/StatTile'

/** Abreviatura de cabina ("Cabina 3" - "C3"); alternativa a 3 primeras letras */
const boothShort = (name) => {
  const m = (name || '').match(/^cabina\s*(\d+)$/i)
  return m ? `C${m[1]}` : (name || '').slice(0, 3).toUpperCase()
}

/** Calendario Mes/Semana/Dia con citas, ausencias, bloqueos y arrastre para reagendar */
export default function Calendario() {
  const { user } = useAuth()
  const { statusLabel } = useCatalog()
  const toast = useToast()
  const bId = user?.businessId

  const [view, setView] = useState(() => localStorage.getItem('optima_cal_view') || 'Mes')
  useEffect(() => { localStorage.setItem('optima_cal_view', view) }, [view])

  // hourPx adaptativo: con horarios extensos se reduce para que la rejilla quepa en pantalla

  const [colorBy, setColorBy] = useState(() => localStorage.getItem('optima_cal_colorby') || 'status')
  useEffect(() => { localStorage.setItem('optima_cal_colorby', colorBy) }, [colorBy])

  // Filtros de contenido no persistidos para que no oculten citas nuevas tras reabrir
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [boothFilter, setBoothFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Agrupacion del Dia/Semana: 'time' (cronologica) | 'booth' | 'employee'
  const [groupBy, setGroupBy] = useState(() => localStorage.getItem('optima_cal_groupby') || 'booth')
  useEffect(() => { localStorage.setItem('optima_cal_groupby', groupBy) }, [groupBy])

  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) })
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadFlag, setReloadFlag] = useState(0)
  const today = useMemo(() => new Date(), [])

  // tick cada minuto para la linea "ahora"
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])

  const [employees, setEmployees] = useState([])
  const [booths, setBooths] = useState([])
  const [businessHours, setBusinessHours] = useState([])
  // Bloqueos completos del negocio; se filtran al rango visible en blocksInRange
  const [scheduleBlocks, setScheduleBlocks] = useState([])
  // Ausencias filtradas por rango por el rutas dedicado
  const [absences, setAbsences] = useState([])
  // Intervalo usado al mover citas
  const [appointmentInterval, setAppointmentInterval] = useState(30)
  // Horarios semanales indexados por membershipId; falta - alternativa al horario del negocio
  const [schedulesByMembership, setSchedulesByMembership] = useState(() => new Map())

  useEffect(() => {
    if (!bId) return
    Promise.allSettled([
      api.get(`/api/businesses/${bId}/users?size=100`),
      api.get(`/api/businesses/${bId}/booths?size=100`),
      api.get(`/api/businesses/${bId}/hours`),
      api.get(`/api/businesses/${bId}/schedule-blocks?size=100`),
      api.get(`/api/businesses/${bId}`),
    ]).then(([emp, bo, hrs, blks, biz]) => {
      if (emp.status === 'fulfilled') setEmployees(emp.value.data.content ?? [])
      if (bo.status  === 'fulfilled') setBooths(bo.value.data.content ?? [])
      if (hrs.status === 'fulfilled') {
        const data = Array.isArray(hrs.value.data) ? hrs.value.data : (hrs.value.data?.content ?? [])
        setBusinessHours(data)
      }
      if (blks.status === 'fulfilled') setScheduleBlocks(blks.value.data.content ?? [])
      if (biz.status === 'fulfilled') setAppointmentInterval(biz.value.data?.appointmentInterval ?? 30)
    })
  }, [bId, reloadFlag])

  // Carga los horarios de cada empleado en paralelo; los fallos se ignoran sin romper la vista
  useEffect(() => {
    if (!bId || employees.length === 0) {
      setSchedulesByMembership(new Map())
      return
    }
    let cancelled = false
    const ids = employees.map((e) => e.id)
    Promise.all(
      ids.map((id) =>
        api.get(`/api/businesses/${bId}/users/${id}/schedules`)
          .then((r) => [id, Array.isArray(r.data) ? r.data : (r.data?.content ?? [])])
          .catch(() => [id, null])
      )
    ).then((entries) => {
      if (cancelled) return
      const map = new Map()
      entries.forEach(([id, schedules]) => {
        if (schedules !== null) map.set(id, schedules)
      })
      setSchedulesByMembership(map)
    })
    return () => { cancelled = true }
  }, [bId, employees])

  // Rango horario dinamico: abarca business_hours y todas las citas; defaults 8-21
  const { dayStart, dayEnd } = useMemo(() => {
    let minStart = 24, maxEnd = 0
    businessHours.forEach((h) => {
      if (h.isClosed || !h.startTime || !h.endTime) return
      const [sh, sm] = h.startTime.slice(0, 5).split(':').map(Number)
      const [eh, em] = h.endTime.slice(0, 5).split(':').map(Number)
      const s = sh + sm / 60
      const e = eh + em / 60
      if (s < minStart) minStart = s
      if (e > maxEnd)   maxEnd   = e
    })
    // Extiende el rango para que toda cita cargada tenga celdas de rejilla
    appointments.forEach((a) => {
      const s = minutesOf(a.startDateTime) / 60
      const e = minutesOf(a.endDateTime) / 60
      if (s < minStart) minStart = s
      if (e > maxEnd)   maxEnd   = e
    })
    if (minStart === 24 || maxEnd === 0) return { dayStart: DEFAULT_DAY_START, dayEnd: DEFAULT_DAY_END }
    // Cap [0, 24] defensivo
    return {
      dayStart: Math.max(0, Math.floor(minStart)),
      dayEnd: Math.min(24, Math.ceil(maxEnd)),
    }
  }, [businessHours, appointments])

  const hourPx = useMemo(() => {
    const range = Math.max(1, dayEnd - dayStart)
    if (range >= 18) return 40
    if (range >= 14) return 48
    return HOUR_PX
  }, [dayStart, dayEnd])

  // Carga de citas del rango visible
  useEffect(() => {
    if (!bId) { setLoading(false); return }
    let cancelled = false
    const { from, to } = rangeFor(view, cursor)
    setLoading(true)
    // size 100 = tope de Pageable del servidor; rangos con mas citas se ven parciales
    const params = { from, to, size: 100, sort: 'startDateTime,asc' }
    if (employeeFilter) params.membershipId = employeeFilter
    api.get(`/api/businesses/${bId}/appointments`, { params })
      .then((r) => { if (!cancelled) setAppointments(r.data.content ?? []) })
      .catch((err) => { if (!cancelled) toast({ type: 'error', message: getErrorMessage(err, 'No se pudieron cargar las citas.') }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bId, view, cursor, employeeFilter, reloadFlag, toast])

  const refetch = useCallback(() => setReloadFlag((v) => v + 1), [])

  // Mapas color por empleado y cabina; el color asignado tiene prioridad sobre el automatico
  const empColorMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e.color])),
    [employees],
  )
  const boothColorMap = useMemo(
    () => new Map(booths.map((b) => [b.id, b.color])),
    [booths],
  )

  // Filtros en cliente y anexado de employeeColor/boothColor para styleFor
  const filtered = useMemo(() => appointments
    .filter((a) => {
      if (statusFilter && a.statusName !== statusFilter) return false
      if (boothFilter && String(a.boothId ?? '') !== boothFilter) return false
      return true
    })
    .map((a) => ({
      ...a,
      employeeColor: empColorMap.get(a.membershipId) ?? null,
      boothColor: a.boothId != null ? (boothColorMap.get(a.boothId) ?? null) : null,
    })),
    [appointments, statusFilter, boothFilter, empColorMap, boothColorMap])

  // Agrupado por dia
  const eventsByDay = useMemo(() => {
    const map = new Map()
    filtered.forEach((a) => {
      const k = apptDate(a)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(a)
    })
    return map
  }, [filtered])

  // Blocks que intersectan el rango visible; reduce el trabajo por celda
  const blocksInRange = useMemo(() => {
    const r = rangeFor(view, cursor)
    return scheduleBlocks.filter((b) => b.endDate >= r.from && b.startDate <= r.to)
  }, [scheduleBlocks, view, cursor])

  // Ausencias del rango visible; el rutas ya filtra, no hace falta filtro en cliente
  useEffect(() => {
    if (!bId) return
    let cancelled = false
    const r = rangeFor(view, cursor)
    api.get(`/api/businesses/${bId}/absences`, { params: { from: r.from, to: r.to } })
      .then((res) => { if (!cancelled) setAbsences(res.data ?? []) })
      .catch(() => { if (!cancelled) setAbsences([]) })
    return () => { cancelled = true }
  }, [bId, view, cursor, reloadFlag])

  // Stats del rango activo
  const rangeStats = useMemo(() => {
    const considered = filtered.filter((a) => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
    const revenue = considered.reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0)
    const pendingCount = filtered.filter((a) => a.statusName === 'PENDING').length
    const inProgressCount = filtered.filter((a) =>
      a.statusName === 'IN_PROGRESS' &&
      new Date(a.startDateTime) <= now && now <= new Date(a.endDateTime),
    ).length
    return { count: filtered.length, revenue, pendingCount, inProgressCount }
  }, [filtered, now])

  const goPrev  = useCallback(() => {
    if (view === 'Mes')         setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
    else if (view === 'Semana') setCursor((c) => { const d = new Date(c); d.setDate(c.getDate() - 7); return d })
    else                        setCursor((c) => { const d = new Date(c); d.setDate(c.getDate() - 1); return d })
  }, [view])
  const goNext = useCallback(() => {
    if (view === 'Mes')         setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
    else if (view === 'Semana') setCursor((c) => { const d = new Date(c); d.setDate(c.getDate() + 7); return d })
    else                        setCursor((c) => { const d = new Date(c); d.setDate(c.getDate() + 1); return d })
  }, [view])
  const goToday = useCallback(() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), d.getDate())) }, [])

  // Wizard cubre crear y editar; detalle delega al wizard en "Editar cita"
  const [wizard, setWizard] = useState({ open: false, date: null, time: null, appt: null })
  const [detailAppt, setDetailAppt] = useState(null)
  // arrastre: pre-vista del cambio; el ventana pide confirmacion antes del PUT
  const [pendingDrop, setPendingDrop] = useState(null)
  const [droppingSaving, setDroppingSaving] = useState(false)
  const openWizard = useCallback((date = null, time = null) => setWizard({ open: true, date, time, appt: null }), [])
  const closeWizard = useCallback(() => setWizard({ open: false, date: null, time: null, appt: null }), [])

  // Bloqueo y ausencia aplicables a la cita del detalle, para los avisos del ventana
  const detailApptBlock = useMemo(
    () => blockForAppointment(blocksInRange, detailAppt),
    [blocksInRange, detailAppt],
  )
  const detailApptAbsence = useMemo(
    () => absenceForAppointment(absences, detailAppt),
    [absences, detailAppt],
  )

  // Arma pendingDrop con el cambio; si nada cambia (mismo slot y recurso) no se hace nada
  const handleDropAppointment = useCallback(({ appt, newStartDateTime, newResourceType, newResourceId }) => {
    if (!appt) return
    const newMembershipId = newResourceType === 'employee'
      ? (newResourceId ?? appt.membershipId)
      : appt.membershipId
    const newBoothId = newResourceType === 'booth'
      ? newResourceId
      : appt.boothId
    if (newStartDateTime === appt.startDateTime?.slice(0, 19)
        && newMembershipId === appt.membershipId
        && (newBoothId ?? null) === (appt.boothId ?? null)) {
      return
    }
    setPendingDrop({ appt, newStartDateTime, newMembershipId, newBoothId })
  }, [])

  const confirmDrop = useCallback(async () => {
    if (!pendingDrop) return
    const { appt, newStartDateTime, newMembershipId, newBoothId } = pendingDrop
    setDroppingSaving(true)
    try {
      await api.put(`/api/businesses/${bId}/appointments/${appt.id}`, {
        membershipId: newMembershipId,
        boothId: newBoothId ?? null,
        startDateTime: newStartDateTime,
        serviceIds: (appt.bookedServices ?? []).map((b) => b.serviceId),
        notes: appt.notes ?? null,
      })
      toast({ type: 'success', message: 'Cita reagendada.' })
      setPendingDrop(null)
      refetch()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo reagendar la cita.') })
    } finally {
      setDroppingSaving(false)
    }
  }, [pendingDrop, bId, toast, refetch])

  const openEditWizard = useCallback((appt) => {
    const block = blockForAppointment(blocksInRange, appt)
    if (block) {
      const motivo = (block.reason && block.reason.trim())
        || (block.membershipId != null ? 'empleado bloqueado'
          : block.boothId != null ? 'cabina bloqueada'
          : 'día bloqueado')
      toast({
        type: 'info',
        message: `Esta cita cae en un bloqueo (${motivo}). Cambia la fecha al guardar.`,
      })
    }
    const absence = absenceForAppointment(absences, appt)
    if (absence) {
      const motivo = (absence.reason && absence.reason.trim()) || 'ausencia del empleado'
      toast({
        type: 'info',
        message: `Esta cita coincide con una ausencia (${motivo}). Cambia hora o empleado al guardar.`,
      })
    }
    setDetailAppt(null)
    setWizard({ open: true, date: null, time: null, appt })
  }, [blocksInRange, absences, toast])

  const onSlotClick = useCallback((dayKey, hour) => openWizard(dayKey, `${pad2(hour)}:00`), [openWizard])
  const onCellClick = useCallback((dayKey) => openWizard(dayKey, null), [openWizard])
  const onOpenDay   = useCallback((date) => { setCursor(date); setView('Día') }, [])

  useEffect(() => {
    const handler = (e) => {
      // No interceptes si el foco esta en un input o si hay un ventana abierto
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return
      if (wizard.open || detailAppt) return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToday() }
      else if (e.key === 'm' || e.key === 'M') { setView('Mes') }
      else if (e.key === 'w' || e.key === 'W') { setView('Semana') }
      else if (e.key === 'd' || e.key === 'D') { setView('Día') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, goToday, wizard.open, detailAppt])

  let headerText = `${MONTHS_ES[cursor.getMonth()]} ${cursor.getFullYear()}`
  if (view === 'Semana') {
    const ws = startOfWeek(cursor); const we = new Date(ws); we.setDate(ws.getDate() + 6)
    headerText = ws.getMonth() === we.getMonth()
      ? `${ws.getDate()} – ${we.getDate()} ${MONTHS_ES[ws.getMonth()]} ${ws.getFullYear()}`
      : `${ws.getDate()} ${MONTHS_ES[ws.getMonth()].slice(0,3)} – ${we.getDate()} ${MONTHS_ES[we.getMonth()].slice(0,3)} ${we.getFullYear()}`
  } else if (view === 'Día') {
    headerText = cursor.toLocaleDateString('es-ES', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
  }

  const boothResources = useMemo(
    () => booths.map((b) => ({
      id: b.id,
      name: b.name,
      short: b.short || boothShort(b.name),
      accent: b.id,
      color: b.color,  // [L] permite que paletteByName decida la cabecera
    })),
    [booths],
  )
  const employeeResources = useMemo(
    () => employees.map((e) => ({
      id: e.id,
      name: e.fullName,
      short: (e.fullName || '').trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join(''),
      accent: e.id,
      color: e.color,
    })),
    [employees],
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8 print:p-0 print:max-w-none">

      <style>{`
        @media print {
          @page { margin: 12mm; }
          body, html { background: white !important; }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside.sidebar, .no-print { display: none !important; }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .sticky { position: static !important; }
        }
      `}</style>

      <div className="hidden print:block mb-3">
        <div className="flex items-baseline justify-between border-b-2 border-slate-300 pb-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Calendario</p>
            <h2 className="text-2xl font-bold text-[#1e3a5f] capitalize">{headerText}</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Impreso {new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Calendario</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Pulsa una cita para ver el detalle, o un hueco libre para crear una nueva.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            title="Refrescar"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimir agenda"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
          >
            <Printer size={16} />
          </button>
          <Button onClick={() => openWizard(keyOf(cursor), null)} className="gap-2">
            <Plus size={16} /> Nueva cita
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <StatTile label={`Citas (${view.toLowerCase()})`} value={rangeStats.count} />
        <StatTile label="€ previstos" value={`${rangeStats.revenue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`} />
        <StatTile label="Pendientes de confirmar" value={rangeStats.pendingCount} tone="warning" />
        <StatTile label="En curso ahora" value={rangeStats.inProgressCount} tone="cyan" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] print-area">

        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <button onClick={goPrev} title="Anterior (←)" aria-label="Anterior" className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-[#1e3a5f] hover:border-blue-300 hover:bg-blue-50 transition flex items-center justify-center"><ChevronLeft size={16} /></button>
            <button onClick={goNext} title="Siguiente (→)" aria-label="Siguiente" className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-[#1e3a5f] hover:border-blue-300 hover:bg-blue-50 transition flex items-center justify-center"><ChevronRight size={16} /></button>
            <button onClick={goToday} title="Hoy (T)" className="ml-1 px-3 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-[#1e3a5f] hover:border-blue-300 hover:bg-blue-50 transition">Hoy</button>
            <MiniCalendarPopover cursor={cursor} today={today} onPick={setCursor} />
          </div>
          <div className="flex-1 min-w-[180px] text-center">
            <span className="text-xl md:text-2xl font-bold text-[#1e3a5f] capitalize">{headerText}</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {VIEW_MODES.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  view === v ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 hidden md:inline">←/→ navegar · T hoy · M/W/D vista</span>
        </div>

        <FiltersBar
          employees={employees}
          booths={booths}
          employeeFilter={employeeFilter}    setEmployeeFilter={setEmployeeFilter}
          boothFilter={boothFilter}          setBoothFilter={setBoothFilter}
          statusFilter={statusFilter}        setStatusFilter={setStatusFilter}
          colorBy={colorBy}                  setColorBy={setColorBy}
          view={view}
          groupBy={groupBy}                  setGroupBy={setGroupBy}
          statusLabel={statusLabel}
        />

        <div className="overflow-hidden rounded-b-2xl">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">Cargando agenda…</div>
          ) : view === 'Mes' ? (
            <MonthGrid
              cursor={cursor} today={today} eventsByDay={eventsByDay} colorBy={colorBy}
              onCellClick={onCellClick} onSelectEvent={setDetailAppt} onOpenDay={onOpenDay}
              blocks={blocksInRange}
            />
          ) : view === 'Semana' && groupBy === 'booth' ? (
            <WeekResourceGrid
              cursor={cursor} today={today} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              resources={boothResources}
              resourceFor={(a) => a.boothId}
              unassignedShort="S/C"
              blocks={blocksInRange}
              resourceType="booth"
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          ) : view === 'Semana' && groupBy === 'employee' ? (
            <WeekResourceGrid
              cursor={cursor} today={today} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              resources={employeeResources}
              resourceFor={(a) => a.membershipId}
              unassignedShort="S/E"
              blocks={blocksInRange}
              resourceType="employee"
              absences={absences}
              schedulesByMembership={schedulesByMembership}
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          ) : view === 'Semana' ? (
            <WeekGrid
              cursor={cursor} today={today} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              blocks={blocksInRange}
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          ) : groupBy === 'booth' ? (
            <ResourceDayGrid
              cursor={cursor} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              resources={boothResources}
              resourceFor={(a) => a.boothId}
              unassignedLabel="Sin cabina"
              blocks={blocksInRange}
              resourceType="booth"
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          ) : groupBy === 'employee' ? (
            <ResourceDayGrid
              cursor={cursor} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              resources={employeeResources}
              resourceFor={(a) => a.membershipId}
              unassignedLabel="Sin empleado"
              blocks={blocksInRange}
              resourceType="employee"
              absences={absences}
              schedulesByMembership={schedulesByMembership}
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          ) : (
            <DayGrid
              cursor={cursor} eventsByDay={eventsByDay} colorBy={colorBy}
              onSelectEvent={setDetailAppt} onSlotClick={onSlotClick}
              statusLabel={statusLabel} dayStart={dayStart} dayEnd={dayEnd} hourPx={hourPx}
              businessHours={businessHours} now={now}
              blocks={blocksInRange}
              onDropAppointment={handleDropAppointment}
              appointmentInterval={appointmentInterval}
            />
          )}
        </div>
      </div>

      <AppointmentWizard
        open={wizard.open}
        onClose={closeWizard}
        onCreated={refetch}
        bId={bId}
        prefillDate={wizard.date}
        prefillTime={wizard.time}
        appointmentToEdit={wizard.appt}
      />
      <AppointmentDetailModal
        appointment={detailAppt}
        bId={bId}
        onClose={() => setDetailAppt(null)}
        onChanged={refetch}
        onEdit={openEditWizard}
        appliedBlock={detailApptBlock}
        appliedAbsence={detailApptAbsence}
        employeeColor={detailAppt?.employeeColor}
      />

      <ConfirmDropModal
        pending={pendingDrop}
        employeeResources={employeeResources}
        boothResources={boothResources}
        saving={droppingSaving}
        onCancel={() => setPendingDrop(null)}
        onConfirm={confirmDrop}
      />
    </div>
  )
}
