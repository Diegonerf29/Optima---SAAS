import 'react-big-calendar/lib/css/react-big-calendar.css'
import './agenda.css'

import { addDays, addWeeks, endOfWeek, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Calendar, type SlotInfo } from 'react-big-calendar'

import { useAppointmentsInRange, useBusinessAbsences, useBusinessHours, useEmployees, useScheduleBlocks } from '@/api/queries'
import type { Appointment, AppointmentStatus, BusinessHour } from '@/api/types'
import { ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { colorOf, fecha, parseApiDateTime, toApiDate } from '@/lib/format'

import { AppointmentDialog, type AppointmentDraft } from './AppointmentDialog'
import { AppointmentSheet } from './AppointmentSheet'
import { localizer, MESSAGES } from './calendar'

type Vista = 'day' | 'week'

/** lo que pinta el calendario: una cita o un hueco no disponible (ausencia o bloqueo) */
type Evento = {
  id: string
  title: string
  start: Date
  end: Date
  resourceId?: number
  cita?: Appointment
}

/** "10:30:00" -> minutos desde medianoche */
const minutos = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : 0)

/** dia de la semana como lo guarda el backend: 1 lunes ... 7 domingo */
const diaSemana = (d: Date) => ((d.getDay() + 6) % 7) + 1

const INACTIVAS: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW']

export default function AgendaPage() {
  const [dia, setDia] = useState(() => new Date())
  // al abrir, el calendario se coloca una hora antes de la hora actual
  const [scrollInicial] = useState(() => new Date(1970, 0, 1, Math.max(new Date().getHours() - 1, 0)))
  const [vista, setVista] = useState<Vista>('day')
  const [filtro, setFiltro] = useState('all')
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [draft, setDraft] = useState<AppointmentDraft | null>(null)
  const [abierta, setAbierta] = useState<number | null>(null)

  // rango visible (fechas incluidas)
  const desde = vista === 'day' ? dia : startOfWeek(dia, { weekStartsOn: 1 })
  const hasta = vista === 'day' ? dia : endOfWeek(dia, { weekStartsOn: 1 })
  const from = toApiDate(desde)
  const to = toApiDate(hasta)

  const empleados = useEmployees()
  const horario = useBusinessHours()
  const citas = useAppointmentsInRange(from, to)
  const ausencias = useBusinessAbsences(from, to)
  const bloqueos = useScheduleBlocks()

  const lista = empleados.data ?? []
  const colores = new Map(lista.map((e, i) => [e.id, colorOf(e.color, i)]))
  const colorDe = (membershipId?: number) => colores.get(membershipId) ?? colorOf(null)

  // en la vista de dia cada empleado es una columna; en la de semana se filtra por empleado
  const visibles = filtro === 'all' ? lista : lista.filter((e) => String(e.id) === filtro)
  const recursos = vista === 'day' ? visibles.map((e) => ({ id: e.id!, title: e.fullName ?? '' })) : undefined
  const delFiltro = (membershipId?: number) => filtro === 'all' || String(membershipId) === filtro

  const eventos: Evento[] = (citas.data ?? [])
    .filter((a) => delFiltro(a.membershipId))
    .filter((a) => verCanceladas || !INACTIVAS.includes(a.statusName as AppointmentStatus))
    .map((a) => ({
      id: `cita-${a.id}`,
      title: a.bookedServices?.length ? `${a.clientName} · ${a.bookedServices.map((s) => s.serviceName).join(', ')}` : (a.clientName ?? ''),
      start: parseApiDateTime(a.startDateTime!),
      end: parseApiDateTime(a.endDateTime!),
      resourceId: a.membershipId,
      cita: a,
    }))

  // ausencias de empleados y bloqueos de dias completos, como fondo rayado
  const fondo: Evento[] = []
  for (const a of ausencias.data ?? []) {
    if (!delFiltro(a.membershipId)) continue
    fondo.push({
      id: `aus-${a.id}`,
      title: `Ausencia${a.reason ? `: ${a.reason}` : ''}`,
      start: parseApiDateTime(a.startDateTime!),
      end: parseApiDateTime(a.endDateTime!),
      resourceId: a.membershipId,
    })
  }
  for (const b of bloqueos.data ?? []) {
    if (b.boothId && !b.membershipId) continue // un bloqueo de cabina no quita huecos a nadie en concreto
    if (b.endDate! < from || b.startDate! > to) continue
    // un bloqueo sin empleado cierra el negocio: se pinta en la columna de cada uno
    const afectados = b.membershipId ? [b.membershipId] : visibles.map((e) => e.id!)
    for (const membershipId of afectados) {
      if (!delFiltro(membershipId)) continue
      fondo.push({
        id: `blo-${b.id}-${membershipId}`,
        title: `Bloqueado${b.reason ? `: ${b.reason}` : ''}`,
        start: parseApiDateTime(`${b.startDate}T00:00:00`),
        end: parseApiDateTime(`${b.endDate}T23:59:59`),
        resourceId: membershipId,
      })
      if (vista === 'week') break // en la semana no hay columnas por empleado: basta con uno
    }
  }

  // horas que se ven: de la primera apertura a la ultima cierre del horario del negocio
  const tramos = (horario.data ?? []).filter((h) => !h.isClosed)
  const abre = tramos.length ? Math.min(...tramos.map((h) => minutos(h.startTime))) : 8 * 60
  const cierra = tramos.length ? Math.max(...tramos.map((h) => minutos(h.endTime))) : 21 * 60
  const min = new Date(1970, 0, 1, Math.floor(abre / 60), 0)
  const max = new Date(1970, 0, 1, Math.min(23, Math.ceil(cierra / 60)), cierra >= 23 * 60 ? 59 : 0)

  const abierto = (fechaHora: Date, h: BusinessHour[]) => {
    const m = fechaHora.getHours() * 60 + fechaHora.getMinutes()
    return h.some((t) => !t.isClosed && t.dayOfWeek === diaSemana(fechaHora) && m >= minutos(t.startTime) && m < minutos(t.endTime))
  }

  const mover = (paso: number) => setDia((d) => (vista === 'day' ? addDays(d, paso) : addWeeks(d, paso)))
  const titulo =
    vista === 'day' ? fecha(dia, "EEEE d 'de' MMMM yyyy") : `${fecha(desde, "d 'de' MMM")} – ${fecha(hasta, "d 'de' MMM yyyy")}`

  const nuevaCita = (slot?: SlotInfo) => {
    const inicio = slot?.start ?? dia
    const membershipId = typeof slot?.resourceId === 'number' ? slot.resourceId : filtro !== 'all' ? Number(filtro) : undefined
    setDraft({ date: toApiDate(inicio), time: slot ? format(inicio, 'HH:mm') : undefined, membershipId })
  }

  if (empleados.isError) return <ErrorState error={empleados.error} onRetry={() => empleados.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      {/* barra de herramientas propia (la del calendario no se adapta bien al movil) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setDia(new Date())}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" aria-label="Anterior" onClick={() => mover(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Siguiente" onClick={() => mover(1)}>
            <ChevronRight />
          </Button>
        </div>
        <h1 className="mr-auto text-lg font-semibold first-letter:uppercase">{titulo}</h1>

        <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)}>
          <TabsList>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44" aria-label="Profesional">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el equipo</SelectItem>
            {lista.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="canceladas" checked={verCanceladas} onCheckedChange={setVerCanceladas} />
          <Label htmlFor="canceladas" className="text-sm font-normal">
            Canceladas
          </Label>
        </div>
        <Button onClick={() => nuevaCita()}>
          <Plus /> Nueva cita
        </Button>
      </div>

      {citas.isError && <ErrorState error={citas.error} onRetry={() => citas.refetch()} />}

      {/* alto de la pantalla menos la cabecera: el calendario hace scroll por dentro */}
      <div className="h-[calc(100svh-10rem)] min-h-[520px]">
        <Calendar<Evento, { id: number; title: string }>
          localizer={localizer}
          culture="es"
          messages={MESSAGES}
          toolbar={false}
          date={dia}
          onNavigate={setDia}
          view={vista}
          views={['day', 'week']}
          onView={(v) => setVista(v as Vista)}
          events={eventos}
          backgroundEvents={fondo}
          resources={recursos}
          resourceIdAccessor="id"
          resourceTitleAccessor="title"
          min={min}
          max={max}
          scrollToTime={scrollInicial}
          step={15}
          timeslots={4}
          selectable
          longPressThreshold={250}
          onSelectSlot={nuevaCita}
          onSelectEvent={(e) => e.cita && setAbierta(e.cita.id!)}
          onDrillDown={(d) => {
            setDia(d)
            setVista('day')
          }}
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }) => `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
            dayFormat: (d) => fecha(d, 'EEE d'),
          }}
          slotPropGetter={(d) => (horario.data && !abierto(d, horario.data) ? { className: 'rbc-fuera-horario' } : {})}
          eventPropGetter={(e) => {
            const estado = e.cita?.statusName as AppointmentStatus | undefined
            return {
              className: estado && INACTIVAS.includes(estado) ? 'cita-inactiva' : undefined,
              style: { backgroundColor: colorDe(e.cita?.membershipId), color: 'white' },
            }
          }}
          tooltipAccessor={(e) => e.title}
          style={{ height: '100%' }}
        />
      </div>

      <AppointmentDialog draft={draft} onClose={() => setDraft(null)} />
      <AppointmentSheet
        appointmentId={abierta}
        onClose={() => setAbierta(null)}
        onEdit={(a) => {
          setAbierta(null)
          setDraft({ date: a.startDateTime!.slice(0, 10), appointment: a })
        }}
      />
    </div>
  )
}
