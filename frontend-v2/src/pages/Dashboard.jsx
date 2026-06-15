// Dashboard principal con KPIs del dia, agenda, donut mensual y rankings
import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users, CalendarCheck, Banknote, AlertCircle, Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { AppointmentDetailModal } from '@/components/appointments/AppointmentDetailModal'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { StatCard } from '@/components/dashboard/StatCard'
import { NextAppointmentHero } from '@/components/dashboard/NextAppointmentHero'
import { StatusDonut } from '@/components/dashboard/StatusDonut'
import { TopList } from '@/components/dashboard/TopList'
import { TodayAgenda } from '@/components/dashboard/TodayAgenda'
import { ACTIVE_STATUSES, greeting, fullDate } from '@/components/dashboard/dashboardShared'
import api, { getErrorMessage } from '@/lib/api'
import { totalBooked, ymd, fmtEur } from '@/lib/format'

/** Dashboard principal con KPIs, agenda del dia, distribucion mensual y rankings */
export default function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const bId = user?.businessId

  // Tick cada minuto para el countdown de "proxima cita" y la linea "ahora"
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Rangos
  const today      = ymd(new Date())
  const monthStart = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const monthEnd   = ymd(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))

  // Estado
  const [counts, setCounts]       = useState({ clients: 0, services: 0 })
  const [todayList, setTodayList] = useState([])
  const [monthList, setMonthList] = useState([])
  const [hours, setHours]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('Todas')   // estado
  const [selected, setSelected]   = useState(null)      // cita abierta en el ventana

  // Carga inicial - paralelo, igual que el Dashboard original
  const fetchAll = useCallback(() => {
    if (!bId) return
    setLoading(true)
    Promise.all([
      api.get(`/api/businesses/${bId}/clients?size=1`),
      api.get(`/api/businesses/${bId}/services?size=1`),
      // size 100 = tope de Pageable del servidor
      api.get(`/api/businesses/${bId}/appointments`, { params: { from: today, to: today, size: 100 } }),
      api.get(`/api/businesses/${bId}/appointments`, { params: { from: monthStart, to: monthEnd, size: 100 } }),
      api.get(`/api/businesses/${bId}/hours`),
    ])
      .then(([c, s, t, m, h]) => {
        setCounts({ clients: c.data.totalElements, services: s.data.totalElements })
        setTodayList(t.data.content)
        setMonthList(m.data.content)
        setHours(Array.isArray(h.data) ? h.data : (h.data?.content ?? []))
      })
      .catch((err) => {
        toast({ type: 'error', message: getErrorMessage(err, 'Error al cargar el dashboard.') })
      })
      .finally(() => setLoading(false))
  }, [bId, toast, today, monthStart, monthEnd])

  useEffect(() => { fetchAll() }, [fetchAll])


  const activeToday   = useMemo(() => todayList.filter(a => ACTIVE_STATUSES.includes(a.statusName)), [todayList])
  const todayRevenue  = useMemo(
    () => activeToday.reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0),
    [activeToday],
  )
  // PENDING en las proximas 24h; se filtra sobre monthList para cubrir las de manana de noche
  const pendingAttention = useMemo(() => {
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return monthList.filter(a => a.statusName === 'PENDING' && new Date(a.startDateTime) <= limit).length
  }, [monthList, now])

  // Rango horario derivado de business_hours; 9-21 como alternativa
  const timelineRange = useMemo(() => {
    const open = hours.filter((h) => !h.isClosed && h.startTime && h.endTime)
    if (open.length === 0) return { start: 9, end: 21 }
    let s = 24, e = 0
    open.forEach((h) => {
      s = Math.min(s, parseInt(h.startTime.slice(0, 2), 10))
      const [eh, em] = h.endTime.slice(0, 5).split(':').map(Number)
      e = Math.max(e, em > 0 ? eh + 1 : eh)
    })
    return { start: s, end: e }
  }, [hours])

  // Proxima cita
  const upcoming = useMemo(
    () => activeToday.filter(a => new Date(a.startDateTime) > now)
                     .sort((x, y) => new Date(x.startDateTime) - new Date(y.startDateTime)),
    [activeToday, now],
  )
  const next       = upcoming[0]
  const nextInMin  = next ? Math.max(0, Math.round((new Date(next.startDateTime) - now) / 60000)) : null

  // Donut (este mes, todos los estados)
  const monthBuckets = useMemo(() => {
    const b = { PENDING: 0, CONFIRMED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0 }
    monthList.forEach(a => { b[a.statusName] = (b[a.statusName] ?? 0) + 1 })
    return b
  }, [monthList])

  // Top servicios (este mes, excluyendo canceladas y no presentado)
  const topServices = useMemo(() => {
    const m = new Map()
    monthList
      .filter(a => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
      .forEach(a => {
        a.bookedServices?.forEach(bs => {
          const cur = m.get(bs.serviceName) ?? { name: bs.serviceName, count: 0, revenue: 0 }
          cur.count   += 1
          cur.revenue += Number(bs.appliedPrice || 0)
          m.set(bs.serviceName, cur)
        })
      })
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 4)
  }, [monthList])

  // Top empleados del mes, excluyendo canceladas y no presentado
  const topEmployees = useMemo(() => {
    const m = new Map()
    monthList
      .filter(a => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
      .forEach(a => {
        const cur = m.get(a.userFullName) ?? { name: a.userFullName, count: 0 }
        cur.count += 1
        m.set(a.userFullName, cur)
      })
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 3)
  }, [monthList])

  // Tabla "agenda de hoy" - filtrada y ordenada por hora
  const visibleToday = useMemo(() => {
    const list = filter === 'Todas' ? todayList : todayList.filter(a => a.statusName === filter)
    return [...list].sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
  }, [todayList, filter])


  const firstName = user?.fullName?.split(/\s+/)[0] || ''

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">
            {greeting(now)}{firstName && `, ${firstName}`}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            <span className="text-slate-700 font-semibold">{fullDate(now)}</span>
            {' · '}Tienes <strong className="text-[#1e3a5f]">{todayList.length} citas</strong> programadas hoy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            title="Buscar (Ctrl+K)"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#1e3a5f] bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition"
          >
            <Search size={16} /> Buscar
          </button>
          <Link
            to="/citas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 rounded-xl px-4 py-2.5 shadow-[0_8px_20px_-6px_rgba(14,165,233,0.5)] transition"
          >
            <Plus size={16} /> Nueva cita
          </Link>
        </div>
      </div>

      <OnboardingChecklist businessId={bId} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Citas hoy"
          icon={CalendarCheck}
          tint="cyan-blue"
          value={loading ? '…' : todayList.length}
          sub={<span>{activeToday.length} activa{activeToday.length === 1 ? '' : 's'}</span>}
        />
        <StatCard
          label="Ingresos previstos"
          icon={Banknote}
          tint="blue-indigo"
          value={loading ? '…' : fmtEur(todayRevenue)}
          sub="Solo citas pendientes, confirmadas o en curso"
        />
        <StatCard
          label="Clientes activos"
          icon={Users}
          tint="teal-cyan"
          value={loading ? '…' : counts.clients}
          sub="Sin contar archivados"
        />
        <StatCard
          label="Necesita tu atención"
          icon={AlertCircle}
          tint="amber"
          attention
          value={loading ? '…' : pendingAttention}
          sub="Citas pendientes en las próximas 24 h"
        />
      </div>

      <div className="grid lg:grid-cols-10 gap-6">

        <div className="lg:col-span-7 min-w-0">
          <TodayAgenda
            todayList={todayList}
            visibleToday={visibleToday}
            loading={loading}
            filter={filter}
            onFilter={setFilter}
            timelineRange={timelineRange}
            now={now}
            onSelect={setSelected}
          />
        </div>

        <div className="lg:col-span-3 space-y-5 min-w-0">

          {next && <NextAppointmentHero appt={next} mins={nextInMin} onOpen={() => setSelected(next)} />}

          <StatusDonut buckets={monthBuckets} total={monthList.length} />

          <TopList
            title="Servicios más solicitados"
            sub="Este mes"
            items={topServices}
            renderMeta={(it) => `${it.count} citas · ${fmtEur(it.revenue)}`}
          />

          <TopList
            title="Mejores empleados"
            sub="Por citas atendidas"
            items={topEmployees}
            renderMeta={(it) => `${it.count} citas`}
          />

        </div>
      </div>

      <AppointmentDetailModal
        appointment={selected}
        bId={bId}
        onClose={() => setSelected(null)}
        onChanged={() => { setSelected(null); fetchAll() }}
      />
    </div>
  )
}
