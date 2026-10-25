import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Clock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useEmployees, useOfferings } from '@/api/queries'
import type { Appointment, AvailabilitySlot, Client } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ClientPicker } from '@/components/common/ClientPicker'
import { Field } from '@/components/common/Field'
import { Loading } from '@/components/common/States'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dinero, fecha } from '@/lib/format'
import { cn } from '@/lib/utils'

/** valores iniciales al abrir: desde un hueco del calendario o desde una cita existente */
export type AppointmentDraft = {
  date: string // yyyy-MM-dd
  time?: string // HH:mm
  membershipId?: number
  client?: Client // cliente ya elegido (desde su ficha)
  appointment?: Appointment // si viene, se edita
}

type Seleccion = { startTime: string; membershipId: number; boothId?: number | null }

export function AppointmentDialog({ draft, onClose }: { draft: AppointmentDraft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {draft && <Formulario key={JSON.stringify(draft)} draft={draft} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ draft, onClose }: { draft: AppointmentDraft; onClose: () => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const editando = draft.appointment
  const servicios = useOfferings()
  const empleados = useEmployees()

  const [cliente, setCliente] = useState<Client | null>(
    editando ? ({ id: editando.clientId, fullName: editando.clientName } as Client) : (draft.client ?? null),
  )
  const [serviceIds, setServiceIds] = useState<number[]>(editando?.bookedServices?.map((b) => b.serviceId!) ?? [])
  const [dia, setDia] = useState(draft.date)
  const [profesional, setProfesional] = useState<string>(String(draft.membershipId ?? editando?.membershipId ?? 'any'))
  const [notas, setNotas] = useState(editando?.notes ?? '')
  const horaInicial = draft.time ?? editando?.startDateTime?.slice(11, 16)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)

  const disponibilidad = useQuery({
    queryKey: [...keys.all(businessId, 'availability'), dia, serviceIds, profesional, editando?.id],
    queryFn: () =>
      unwrap(
        api.GET('/api/businesses/{businessId}/availability', {
          params: {
            path: { businessId },
            query: {
              date: dia,
              serviceIds,
              membershipId: profesional === 'any' ? undefined : Number(profesional),
              excludeAppointmentId: editando?.id,
            },
          },
        }),
      ),
    enabled: serviceIds.length > 0 && !!dia,
  })

  // si se abrio desde un hueco del calendario, se marca ese hueco si esta libre
  const slots = disponibilidad.data?.slots ?? []
  const elegido: Seleccion | null =
    seleccion ??
    (horaInicial
      ? ((slots.find((s) => s.startTime?.startsWith(horaInicial) && (profesional === 'any' || s.membershipId === Number(profesional))) as
          Seleccion | undefined) ?? null)
      : null)

  // huecos agrupados por empleado
  const grupos = new Map<string, AvailabilitySlot[]>()
  for (const s of slots) {
    const nombre = s.userFullName ?? ''
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), s])
  }
  const porEmpleado = [...grupos.entries()]

  const elegidos = (servicios.data ?? []).filter((s) => serviceIds.includes(s.id!))
  const duracion = elegidos.reduce((t, s) => t + (s.durationMinutes ?? 0), 0)
  const precio = elegidos.reduce((t, s) => t + Number(s.price ?? 0), 0)

  const guardar = useMutation({
    mutationFn: async () => {
      if (!cliente || !elegido) throw new Error('Elige cliente y hueco')
      const comun = {
        membershipId: elegido.membershipId,
        boothId: elegido.boothId ?? undefined,
        startDateTime: `${dia}T${elegido.startTime!.slice(0, 5)}:00`,
        notes: notas.trim() || undefined,
        serviceIds,
      }
      if (editando) {
        return unwrap(
          api.PUT('/api/businesses/{businessId}/appointments/{id}', { params: { path: { businessId, id: editando.id! } }, body: comun }),
        )
      }
      return unwrap(
        api.POST('/api/businesses/{businessId}/appointments', {
          params: { path: { businessId } },
          body: { ...comun, clientId: cliente.id! },
        }),
      )
    },
    onSuccess: () => {
      toast.success(editando ? 'Cita actualizada' : 'Cita creada')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'appointments') })
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'availability') })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggleServicio = (id: number) => {
    setSeleccion(null)
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editando ? 'Editar cita' : 'Nueva cita'}</DialogTitle>
        <DialogDescription>Elige los servicios y la agenda te enseña los huecos libres.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field label="Cliente">
          {editando ? <Input value={editando.clientName} disabled /> : <ClientPicker value={cliente} onChange={setCliente} />}
        </Field>

        <Field label="Servicios">
          {servicios.isPending ? (
            <Loading />
          ) : (servicios.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay servicios. Créalos en Catálogo.</p>
          ) : (
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {servicios.data!.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <Checkbox checked={serviceIds.includes(s.id!)} onCheckedChange={() => toggleServicio(s.id!)} />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.durationMinutes} min · {dinero(s.price)}
                  </span>
                </label>
              ))}
            </div>
          )}
          {serviceIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Total: {duracion} minutos · {dinero(precio)} (IVA incluido)
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Día" htmlFor="dia">
            <Input
              id="dia"
              type="date"
              value={dia}
              onChange={(e) => {
                setDia(e.target.value)
                setSeleccion(null)
              }}
            />
          </Field>
          <Field label="Profesional">
            <Select
              value={profesional}
              onValueChange={(v) => {
                setProfesional(v)
                setSeleccion(null)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                {(empleados.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label={`Huecos libres${dia ? ` el ${fecha(dia, "EEEE d 'de' MMMM")}` : ''}`}>
          {serviceIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Elige al menos un servicio.</p>
          ) : disponibilidad.isPending ? (
            <Loading label="Buscando huecos…" />
          ) : disponibilidad.isError ? (
            <p className="text-sm text-destructive">{errorMessage(disponibilidad.error)}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay huecos libres ese día. Prueba otro día u otro profesional.</p>
          ) : (
            <div className="grid max-h-56 gap-3 overflow-y-auto rounded-md border p-3">
              {porEmpleado.map(([nombre, lista]) => (
                <div key={nombre}>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{nombre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lista.map((s) => {
                      const activo = elegido?.startTime === s.startTime && elegido?.membershipId === s.membershipId
                      return (
                        <button
                          key={`${s.membershipId}-${s.startTime}`}
                          type="button"
                          onClick={() => setSeleccion({ startTime: s.startTime!, membershipId: s.membershipId!, boothId: s.boothId })}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-sm tabular-nums transition-colors',
                            activo ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                          )}
                          title={s.boothName ? `Cabina: ${s.boothName}` : undefined}
                        >
                          {s.startTime?.slice(0, 5)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {horaInicial && !elegido && slots.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertDescription className="text-foreground">
                Las {horaInicial} no está libre con estos servicios. Elige otro hueco.
              </AlertDescription>
            </Alert>
          )}
        </Field>

        <Field label="Notas (opcional)" htmlFor="notas">
          <Textarea
            id="notas"
            maxLength={2000}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej.: prefiere champú sin sulfatos"
          />
        </Field>
      </div>

      <DialogFooter className="items-center">
        {elegido && (
          <span className="mr-auto flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" /> {elegido.startTime?.slice(0, 5)} ·{' '}
            {(empleados.data ?? []).find((e) => e.id === elegido.membershipId)?.fullName}
          </span>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!cliente || !elegido || guardar.isPending} onClick={() => guardar.mutate()}>
          {guardar.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cita'}
        </Button>
      </DialogFooter>
    </>
  )
}
