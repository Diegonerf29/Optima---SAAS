import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CreditCard, DoorOpen, Pencil, StickyNote, Undo2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import type { Appointment, AppointmentStatus, PaymentMethod } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { dinero, fecha, hora, NEXT_STATUSES, PAYMENT_LABEL, STATUS_LABEL, STATUS_VARIANT } from '@/lib/format'

/** texto del boton para pasar a cada estado */
const ACCION: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmar',
  IN_PROGRESS: 'Empezar',
  COMPLETED: 'Completar',
  CANCELLED: 'Cancelar cita',
  NO_SHOW: 'No vino',
}

/** panel lateral con el detalle de una cita y lo que se puede hacer con ella */
export function AppointmentSheet({
  appointmentId,
  onClose,
  onEdit,
}: {
  appointmentId: number | null
  onClose: () => void
  onEdit: (a: Appointment) => void
}) {
  return (
    <Sheet open={appointmentId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>{appointmentId !== null && <Detalle id={appointmentId} onEdit={onEdit} />}</SheetContent>
    </Sheet>
  )
}

function Detalle({ id, onEdit }: { id: number; onEdit: (a: Appointment) => void }) {
  const { businessId, isAdmin } = useTenant()
  const queryClient = useQueryClient()
  const [forma, setForma] = useState<PaymentMethod>('CARD')

  const cita = useQuery({
    queryKey: [...keys.all(businessId, 'appointments'), 'detalle', id],
    queryFn: () => unwrap(api.GET('/api/businesses/{businessId}/appointments/{id}', { params: { path: { businessId, id } } })),
  })

  const refrescar = () => void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'appointments') })

  const cambiarEstado = useMutation({
    mutationFn: (statusName: AppointmentStatus) =>
      unwrap(
        api.PATCH('/api/businesses/{businessId}/appointments/{id}/status', { params: { path: { businessId, id } }, body: { statusName } }),
      ),
    onSuccess: (a) => {
      toast.success(`Cita: ${STATUS_LABEL[a.statusName as AppointmentStatus]}`)
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cobrar = useMutation({
    mutationFn: (isPaid: boolean) =>
      unwrap(
        api.PATCH('/api/businesses/{businessId}/appointments/{id}/payment', {
          params: { path: { businessId, id } },
          body: { isPaid, paymentMethod: isPaid ? forma : undefined },
        }),
      ),
    onSuccess: (a) => {
      toast.success(a.isPaid ? 'Cobro registrado' : 'Cobro deshecho')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (cita.isPending) return <Loading />
  if (cita.isError) return <ErrorState error={cita.error} onRetry={() => cita.refetch()} />
  const a = cita.data
  const estado = a.statusName as AppointmentStatus
  const siguientes = NEXT_STATUSES[estado]
  const cobrable = estado !== 'CANCELLED' && estado !== 'NO_SHOW'

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[estado]}>{STATUS_LABEL[estado]}</Badge>
          {a.isPaid && <Badge variant="success">Cobrada</Badge>}
        </div>
        <SheetTitle className="text-xl">
          <Link to={`/app/clients/${a.clientId}`} className="hover:underline">
            {a.clientName}
          </Link>
        </SheetTitle>
        <SheetDescription className="first-letter:uppercase">{fecha(a.startDateTime!, "EEEE d 'de' MMMM")}</SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 px-4 pb-6">
        <ul className="grid gap-2 text-sm">
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" /> {hora(a.startDateTime!)} – {hora(a.endDateTime!)}
          </li>
          <li className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" /> {a.userFullName}
          </li>
          {a.boothName && (
            <li className="flex items-center gap-2">
              <DoorOpen className="size-4 text-muted-foreground" /> {a.boothName}
            </li>
          )}
          {a.notes && (
            <li className="flex items-start gap-2">
              <StickyNote className="mt-0.5 size-4 text-muted-foreground" /> <span className="whitespace-pre-line">{a.notes}</span>
            </li>
          )}
        </ul>

        <Separator />

        <div className="grid gap-1 text-sm">
          {a.bookedServices?.map((s) => (
            <div key={s.id} className="flex justify-between">
              <span>{s.serviceName}</span>
              <span className="tabular-nums">{dinero(s.appliedPrice)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Base imponible · IVA incluido</span>
            <span className="tabular-nums">
              {dinero(a.subtotal)} · {dinero(a.taxAmount)}
            </span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{dinero(a.total)}</span>
          </div>
        </div>

        {a.isPaid && (
          <p className="rounded-md bg-success/10 p-3 text-sm">
            Cobrada {a.paymentMethod && `con ${PAYMENT_LABEL[a.paymentMethod as PaymentMethod].toLowerCase()}`}
            {a.paidByName && ` por ${a.paidByName}`}
            {a.paidAt && ` el ${fecha(a.paidAt, "d/MM 'a las' HH:mm")}`}
          </p>
        )}

        <Separator />

        {/* acciones */}
        {siguientes.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Estado</p>
            <div className="flex flex-wrap gap-2">
              {siguientes
                .filter((s) => s !== 'CANCELLED')
                .map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'NO_SHOW' ? 'outline' : 'default'}
                    disabled={cambiarEstado.isPending}
                    onClick={() => cambiarEstado.mutate(s)}
                  >
                    {ACCION[s]}
                  </Button>
                ))}
              {siguientes.includes('CANCELLED') && (
                <ConfirmButton
                  trigger={
                    <Button size="sm" variant="outline" className="text-destructive">
                      Cancelar cita
                    </Button>
                  }
                  title="¿Cancelar la cita?"
                  description="El hueco quedará libre. Si el cliente tiene email, le avisaremos."
                  confirmLabel="Cancelar cita"
                  destructive
                  onConfirm={() => cambiarEstado.mutate('CANCELLED')}
                />
              )}
            </div>
          </div>
        )}

        {cobrable && !a.isPaid && (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Cobro</p>
            <div className="flex gap-2">
              <Select value={forma} onValueChange={(v) => setForma(v as PaymentMethod)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="flex-1" disabled={cobrar.isPending} onClick={() => cobrar.mutate(true)}>
                <CreditCard /> Cobrar {dinero(a.total)}
              </Button>
            </div>
          </div>
        )}
        {a.isPaid && isAdmin && (
          <ConfirmButton
            trigger={
              <Button variant="outline" size="sm" className="w-fit">
                <Undo2 /> Deshacer cobro
              </Button>
            }
            title="¿Deshacer el cobro?"
            description="La cita volverá a quedar pendiente de cobro."
            confirmLabel="Deshacer cobro"
            destructive
            onConfirm={() => cobrar.mutate(false)}
          />
        )}

        {estado !== 'COMPLETED' && (
          <Button variant="outline" onClick={() => onEdit(a)}>
            <Pencil /> {estado === 'IN_PROGRESS' ? 'Editar notas' : 'Editar o mover la cita'}
          </Button>
        )}
      </div>
    </>
  )
}
