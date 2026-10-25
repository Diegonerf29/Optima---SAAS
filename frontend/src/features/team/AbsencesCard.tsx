import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Field } from '@/components/common/Field'
import { Pagination } from '@/components/common/Pagination'
import { Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fecha } from '@/lib/format'

/** vacaciones, medicos, etc.: en esas horas no se le pueden dar citas */
export function AbsencesCard({ membershipId, editable }: { membershipId: number; editable: boolean }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const [pagina, setPagina] = useState(0)
  const [nueva, setNueva] = useState({ desde: '', hasta: '', motivo: '' })

  const ausencias = useQuery({
    queryKey: [...keys.all(businessId, 'absences'), membershipId, pagina],
    queryFn: () =>
      unwrap(
        api.GET('/api/businesses/{businessId}/users/{membershipId}/absences', {
          params: { path: { businessId, membershipId }, query: { page: pagina, size: 5, sort: ['startDateTime,desc'] } },
        }),
      ),
  })
  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'absences') })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'availability') })
  }

  const anadir = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/api/businesses/{businessId}/users/{membershipId}/absences', {
          params: { path: { businessId, membershipId } },
          body: { startDateTime: `${nueva.desde}:00`, endDateTime: `${nueva.hasta}:00`, reason: nueva.motivo.trim() || undefined },
        }),
      ),
    onSuccess: () => {
      toast.success('Ausencia guardada')
      setNueva({ desde: '', hasta: '', motivo: '' })
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const borrar = useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE('/api/businesses/{businessId}/users/{membershipId}/absences/{id}', {
          params: { path: { businessId, membershipId, id } },
        }),
      ),
    onSuccess: () => {
      toast.success('Ausencia borrada')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = ausencias.data?.content ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ausencias</CardTitle>
        <CardDescription>Vacaciones, médico… En esas horas la agenda no le da citas.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {ausencias.isPending ? (
          <Loading />
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ausencias.</p>
        ) : (
          <ul className="divide-y text-sm">
            {lista.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <span className="flex-1">
                  {fecha(a.startDateTime!, 'd MMM yyyy HH:mm')} – {fecha(a.endDateTime!, 'd MMM yyyy HH:mm')}
                  {a.reason && <span className="block text-xs text-muted-foreground">{a.reason}</span>}
                </span>
                {editable && (
                  <ConfirmButton
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Borrar ausencia">
                        <Trash2 />
                      </Button>
                    }
                    title="¿Borrar la ausencia?"
                    confirmLabel="Borrar"
                    destructive
                    onConfirm={() => borrar.mutate(a.id!)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination page={ausencias.data} onChange={setPagina} />

        {editable && (
          <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <Field label="Desde" htmlFor="aus-desde">
              <Input
                id="aus-desde"
                type="datetime-local"
                value={nueva.desde}
                onChange={(e) => setNueva({ ...nueva, desde: e.target.value })}
              />
            </Field>
            <Field label="Hasta" htmlFor="aus-hasta">
              <Input
                id="aus-hasta"
                type="datetime-local"
                value={nueva.hasta}
                onChange={(e) => setNueva({ ...nueva, hasta: e.target.value })}
              />
            </Field>
            <Field label="Motivo (opcional)" htmlFor="aus-motivo">
              <Input
                id="aus-motivo"
                maxLength={255}
                value={nueva.motivo}
                onChange={(e) => setNueva({ ...nueva, motivo: e.target.value })}
              />
            </Field>
            <Button
              className="self-end"
              variant="outline"
              disabled={!nueva.desde || !nueva.hasta || anadir.isPending}
              onClick={() => anadir.mutate()}
            >
              <Plus /> Añadir ausencia
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
