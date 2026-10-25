import { CalendarDays, CheckCircle2, Circle, Clock, Plus, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { useAppointmentsInRange, useBusinessHours, useEmployees, useMe, useOfferings } from '@/api/queries'
import type { AppointmentStatus } from '@/api/types'
import { useTenant } from '@/auth/context'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppointmentDialog, type AppointmentDraft } from '@/features/agenda/AppointmentDialog'
import { AppointmentSheet } from '@/features/agenda/AppointmentSheet'
import { useNow } from '@/hooks/useNow'
import { colorOf, dinero, fecha, hora, parseApiDateTime, STATUS_LABEL, STATUS_VARIANT, toApiDate } from '@/lib/format'

const INACTIVAS: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW']

/** pantalla de inicio: las citas de hoy y, al empezar, los pasos para dejar el negocio listo */
export default function DashboardPage() {
  const { isAdmin } = useTenant()
  const ahora = useNow()
  const hoy = toApiDate(ahora)
  const me = useMe()
  const citas = useAppointmentsInRange(hoy, hoy)
  const empleados = useEmployees()
  const [draft, setDraft] = useState<AppointmentDraft | null>(null)
  const [abierta, setAbierta] = useState<number | null>(null)

  const todas = citas.data ?? []
  const activas = todas.filter((a) => !INACTIVAS.includes(a.statusName as AppointmentStatus))
  const cobrado = todas.filter((a) => a.isPaid).reduce((t, a) => t + Number(a.total ?? 0), 0)
  const porCobrar = activas.filter((a) => !a.isPaid && a.statusName === 'COMPLETED')
  const siguiente = activas.find((a) => parseApiDateTime(a.startDateTime!) > ahora)
  const colores = new Map((empleados.data ?? []).map((e, i) => [e.id, colorOf(e.color, i)]))
  const nombre = me.data?.fullName?.split(' ')[0]

  return (
    <>
      <PageHeader
        title={nombre ? `Hola, ${nombre}` : 'Inicio'}
        description={fecha(ahora, "EEEE d 'de' MMMM")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/app/agenda">
                <CalendarDays /> Ver agenda
              </Link>
            </Button>
            <Button onClick={() => setDraft({ date: hoy })}>
              <Plus /> Nueva cita
            </Button>
          </>
        }
      />

      {isAdmin && <PrimerosPasos />}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Dato icono={<CalendarDays />} titulo="Citas hoy" valor={String(activas.length)} />
        <Dato
          icono={<Clock />}
          titulo="Siguiente"
          valor={siguiente ? `${hora(siguiente.startDateTime!)} · ${siguiente.clientName}` : '—'}
        />
        <Dato
          icono={<Wallet />}
          titulo="Cobrado hoy"
          valor={dinero(cobrado)}
          nota={porCobrar.length > 0 ? `${porCobrar.length} completada${porCobrar.length > 1 ? 's' : ''} sin cobrar` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Citas de hoy</CardTitle>
          <CardDescription>Pulsa una cita para confirmarla, cobrarla o cambiarla.</CardDescription>
        </CardHeader>
        <CardContent>
          {citas.isPending ? (
            <Loading />
          ) : citas.isError ? (
            <ErrorState error={citas.error} onRetry={() => citas.refetch()} />
          ) : todas.length === 0 ? (
            <EmptyState title="No hay citas hoy" description="Las citas que crees para hoy aparecerán aquí." />
          ) : (
            <ul className="divide-y">
              {todas.map((a) => {
                const estado = a.statusName as AppointmentStatus
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setAbierta(a.id!)}
                      className={`flex w-full items-center gap-3 py-3 text-left hover:bg-accent/50 ${INACTIVAS.includes(estado) ? 'opacity-60' : ''}`}
                    >
                      <span className="w-12 text-sm font-medium tabular-nums">{hora(a.startDateTime!)}</span>
                      <span className="h-8 w-1 rounded-full" style={{ backgroundColor: colores.get(a.membershipId) ?? colorOf(null) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a.clientName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.bookedServices?.map((s) => s.serviceName).join(', ')} · {a.userFullName}
                        </span>
                      </span>
                      {a.isPaid && <Badge variant="success">Cobrada</Badge>}
                      <Badge variant={STATUS_VARIANT[estado]}>{STATUS_LABEL[estado]}</Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AppointmentDialog draft={draft} onClose={() => setDraft(null)} />
      <AppointmentSheet
        appointmentId={abierta}
        onClose={() => setAbierta(null)}
        onEdit={(a) => {
          setAbierta(null)
          setDraft({ date: a.startDateTime!.slice(0, 10), appointment: a })
        }}
      />
    </>
  )
}

function Dato({ icono, titulo, valor, nota }: { icono: ReactNode; titulo: string; valor: string; nota?: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className="rounded-md bg-primary/10 p-2 text-primary [&_svg]:size-5">{icono}</span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className="truncate text-lg font-semibold">{valor}</p>
          {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/** lista de lo que falta configurar; desaparece cuando esta todo hecho */
function PrimerosPasos() {
  const horario = useBusinessHours()
  const servicios = useOfferings()
  const empleados = useEmployees()
  if (horario.isPending || servicios.isPending || empleados.isPending) return null

  const pasos = [
    { hecho: (horario.data ?? []).length > 0, texto: 'Pon el horario del local', to: '/app/settings?tab=horario' },
    { hecho: (servicios.data ?? []).length > 0, texto: 'Crea tus servicios con su precio y duración', to: '/app/catalog' },
    { hecho: (empleados.data ?? []).length > 1, texto: 'Añade a tu equipo (opcional si trabajas solo)', to: '/app/team' },
  ]
  // el equipo es opcional (muchos locales son de una sola persona): con horario y servicios ya esta listo
  if (pasos[0].hecho && pasos[1].hecho) return null

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Deja tu negocio listo</CardTitle>
        <CardDescription>Con esto ya puedes dar citas. Solo se hace una vez.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {pasos.map((p) => (
            <li key={p.to} className="flex items-center gap-2 text-sm">
              {p.hecho ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
              {p.hecho ? (
                <span className="text-muted-foreground line-through">{p.texto}</span>
              ) : (
                <Link to={p.to} className="font-medium text-primary hover:underline">
                  {p.texto}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
