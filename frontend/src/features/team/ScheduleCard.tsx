import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DAY_NAMES } from '@/lib/format'

/** horario semanal de un empleado (puede tener turno partido: varios tramos el mismo dia) */
export function ScheduleCard({ membershipId, editable }: { membershipId: number; editable: boolean }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const [nuevo, setNuevo] = useState({ dayOfWeek: '1', startTime: '10:00', endTime: '14:00' })
  const queryKey = [...keys.all(businessId, 'schedules'), membershipId]

  const horario = useQuery({
    queryKey,
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/users/{membershipId}/schedules', { params: { path: { businessId, membershipId } } })),
  })
  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'availability') })
  }

  const anadir = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/businesses/{businessId}/users/{membershipId}/schedules', {
          params: { path: { businessId, membershipId } },
          body: { dayOfWeek: Number(nuevo.dayOfWeek), startTime: nuevo.startTime, endTime: nuevo.endTime },
        }),
      ),
    onSuccess: () => {
      toast.success('Tramo añadido')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/businesses/{businessId}/users/{membershipId}/schedules/{id}', {
          params: { path: { businessId, membershipId, id } },
        }),
      ),
    onSuccess: refrescar,
    onError: (e) => toast.error(errorMessage(e)),
  })

  const tramos = horario.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario semanal</CardTitle>
        <CardDescription>
          Sin horario propio trabaja todo el horario del local. Si le pones tramos, solo se le dan citas en ellos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {horario.isPending ? (
          <Loading />
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {tramos.length === 0 && (
              <li className="mb-1 rounded-md bg-muted px-3 py-2 text-muted-foreground">Sigue el horario del local.</li>
            )}
            {tramos.length > 0 &&
              DAY_NAMES.map((nombre, i) => {
                const delDia = tramos.filter((t) => t.dayOfWeek === i + 1)
                return (
                  <li key={nombre} className="flex min-h-8 items-center gap-3">
                    <span className="w-24 text-muted-foreground">{nombre}</span>
                    {delDia.length === 0 ? (
                      <span className="text-muted-foreground">Libre</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {delDia.map((t) => (
                          <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 tabular-nums">
                            {t.startTime?.slice(0, 5)}–{t.endTime?.slice(0, 5)}
                            {editable && (
                              <button
                                type="button"
                                aria-label="Quitar tramo"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => borrar.mutate(t.id!)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                )
              })}
          </ul>
        )}

        {editable && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <Select value={nuevo.dayOfWeek} onValueChange={(v) => setNuevo({ ...nuevo, dayOfWeek: v })}>
              <SelectTrigger className="w-32" aria-label="Día">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((d, i) => (
                  <SelectItem key={d} value={String(i + 1)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              aria-label="Desde"
              className="w-28"
              value={nuevo.startTime}
              onChange={(e) => setNuevo({ ...nuevo, startTime: e.target.value })}
            />
            <Input
              type="time"
              aria-label="Hasta"
              className="w-28"
              value={nuevo.endTime}
              onChange={(e) => setNuevo({ ...nuevo, endTime: e.target.value })}
            />
            <Button variant="outline" disabled={anadir.isPending} onClick={() => anadir.mutate()}>
              <Plus /> Añadir tramo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
