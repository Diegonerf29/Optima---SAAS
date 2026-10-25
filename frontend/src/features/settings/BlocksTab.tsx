import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useBooths, useEmployees, useScheduleBlocks } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Field } from '@/components/common/Field'
import { Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fecha } from '@/lib/format'

/** dias completos sin citas: festivos, vacaciones del local, una cabina en obras... */
export function BlocksTab() {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const bloqueos = useScheduleBlocks()
  const empleados = useEmployees()
  const cabinas = useBooths()
  const [nuevo, setNuevo] = useState({ desde: '', hasta: '', quien: 'todos', motivo: '' })

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'blocks') })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'availability') })
  }

  const crear = useMutation({
    mutationFn: () => {
      const [tipo, id] = nuevo.quien.split(':')
      return unwrap(
        api.POST('/api/businesses/{businessId}/schedule-blocks', {
          params: { path: { businessId } },
          body: {
            startDate: nuevo.desde,
            endDate: nuevo.hasta || nuevo.desde,
            membershipId: tipo === 'emp' ? Number(id) : undefined,
            boothId: tipo === 'cab' ? Number(id) : undefined,
            reason: nuevo.motivo.trim() || undefined,
          },
        }),
      )
    },
    onSuccess: () => {
      toast.success('Bloqueo guardado')
      setNuevo({ desde: '', hasta: '', quien: 'todos', motivo: '' })
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE('/api/businesses/{businessId}/schedule-blocks/{id}', { params: { path: { businessId, id } } })),
    onSuccess: () => {
      toast.success('Bloqueo borrado')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = [...(bloqueos.data ?? [])].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Días bloqueados</CardTitle>
        <CardDescription>
          Festivos o cierres: esos días no se pueden dar citas. Puede ser para todo el local, un empleado o una cabina.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {bloqueos.isPending ? (
          <Loading />
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay días bloqueados.</p>
        ) : (
          <ul className="divide-y text-sm">
            {lista.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2">
                <span className="flex-1">
                  {b.startDate === b.endDate
                    ? fecha(b.startDate!, 'd MMM yyyy')
                    : `${fecha(b.startDate!, 'd MMM')} – ${fecha(b.endDate!, 'd MMM yyyy')}`}
                  <span className="block text-xs text-muted-foreground">
                    {b.userFullName ?? b.boothName ?? 'Todo el local'}
                    {b.reason && ` · ${b.reason}`}
                  </span>
                </span>
                <ConfirmButton
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Borrar bloqueo">
                      <Trash2 />
                    </Button>
                  }
                  title="¿Borrar el bloqueo?"
                  description="Esos días volverán a tener huecos libres."
                  confirmLabel="Borrar"
                  destructive
                  onConfirm={() => borrar.mutate(b.id!)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          <Field label="Desde" htmlFor="blo-desde">
            <Input id="blo-desde" type="date" value={nuevo.desde} onChange={(e) => setNuevo({ ...nuevo, desde: e.target.value })} />
          </Field>
          <Field label="Hasta (incluido)" htmlFor="blo-hasta" hint="Vacío si es un solo día">
            <Input
              id="blo-hasta"
              type="date"
              min={nuevo.desde}
              value={nuevo.hasta}
              onChange={(e) => setNuevo({ ...nuevo, hasta: e.target.value })}
            />
          </Field>
          <Field label="Afecta a">
            <Select value={nuevo.quien} onValueChange={(v) => setNuevo({ ...nuevo, quien: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el local</SelectItem>
                {(empleados.data ?? []).map((e) => (
                  <SelectItem key={`emp-${e.id}`} value={`emp:${e.id}`}>
                    {e.fullName}
                  </SelectItem>
                ))}
                {(cabinas.data ?? []).map((c) => (
                  <SelectItem key={`cab-${c.id}`} value={`cab:${c.id}`}>
                    Cabina: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Motivo (opcional)" htmlFor="blo-motivo">
            <Input
              id="blo-motivo"
              maxLength={255}
              placeholder="Ej.: Festivo local"
              value={nuevo.motivo}
              onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })}
            />
          </Field>
          <Button className="w-fit" variant="outline" disabled={!nuevo.desde || crear.isPending} onClick={() => crear.mutate()}>
            <Plus /> Bloquear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
