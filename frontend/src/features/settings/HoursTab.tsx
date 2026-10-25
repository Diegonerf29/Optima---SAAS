import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useBusinessHours } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DAY_NAMES } from '@/lib/format'

/** horario del local; con turno partido se añaden dos tramos el mismo dia (10-14 y 17-20) */
export function HoursTab() {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const horario = useBusinessHours()
  const [nuevo, setNuevo] = useState({ dias: 'L-V', startTime: '10:00', endTime: '14:00' })

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'hours') })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'availability') })
  }

  // se puede añadir el mismo tramo a varios dias de golpe
  const anadir = useMutation({
    mutationFn: async () => {
      const dias = nuevo.dias === 'L-V' ? [1, 2, 3, 4, 5] : nuevo.dias === 'L-S' ? [1, 2, 3, 4, 5, 6] : [Number(nuevo.dias)]
      for (const dayOfWeek of dias) {
        await unwrap(
          api.POST('/api/businesses/{businessId}/hours', {
            params: { path: { businessId } },
            body: { dayOfWeek, startTime: nuevo.startTime, endTime: nuevo.endTime, isClosed: false },
          }),
        )
      }
    },
    onSuccess: () => toast.success('Horario guardado'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refrescar,
  })
  const borrar = useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/api/businesses/{businessId}/hours/{id}', { params: { path: { businessId, id } } })),
    onSuccess: refrescar,
    onError: (e) => toast.error(errorMessage(e)),
  })

  const tramos = horario.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario del local</CardTitle>
        <CardDescription>Los días sin tramos el local está cerrado. Para turno partido, añade dos tramos el mismo día.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {horario.isPending ? (
          <Loading />
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {DAY_NAMES.map((nombre, i) => {
              const delDia = tramos
                .filter((t) => t.dayOfWeek === i + 1)
                .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
              const abiertos = delDia.filter((t) => !t.isClosed)
              return (
                <li key={nombre} className="flex min-h-8 items-center gap-3">
                  <span className="w-24 text-muted-foreground">{nombre}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {abiertos.length === 0 && <span className="text-muted-foreground">Cerrado</span>}
                    {delDia.map((t) => (
                      <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 tabular-nums">
                        {t.isClosed ? 'Cerrado' : `${t.startTime?.slice(0, 5)}–${t.endTime?.slice(0, 5)}`}
                        <button
                          type="button"
                          aria-label="Quitar tramo"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => borrar.mutate(t.id!)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <Select value={nuevo.dias} onValueChange={(v) => setNuevo({ ...nuevo, dias: v })}>
            <SelectTrigger className="w-44" aria-label="Días">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L-V">De lunes a viernes</SelectItem>
              <SelectItem value="L-S">De lunes a sábado</SelectItem>
              {DAY_NAMES.map((d, i) => (
                <SelectItem key={d} value={String(i + 1)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            aria-label="Abre"
            className="w-28"
            value={nuevo.startTime}
            onChange={(e) => setNuevo({ ...nuevo, startTime: e.target.value })}
          />
          <Input
            type="time"
            aria-label="Cierra"
            className="w-28"
            value={nuevo.endTime}
            onChange={(e) => setNuevo({ ...nuevo, endTime: e.target.value })}
          />
          <Button variant="outline" disabled={anadir.isPending} onClick={() => anadir.mutate()}>
            <Plus /> Añadir tramo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
