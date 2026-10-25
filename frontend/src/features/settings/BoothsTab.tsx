import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useBooths } from '@/api/queries'
import type { Booth } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ArchivedToggle } from '@/components/common/ArchivedToggle'
import { Field } from '@/components/common/Field'
import { RowActions } from '@/components/common/RowActions'
import { Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { COLOR_HEX, COLORS, colorOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/** cabinas o puestos: la agenda asigna una libre a cada cita (opcional, muchos locales no las usan) */
export function BoothsTab() {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const [activas, setActivas] = useState(true)
  const [editando, setEditando] = useState<Booth | null | undefined>(undefined)
  const cabinas = useBooths(activas)

  const archivar = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: boolean }) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/booths/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/booths/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, { archivo }) => {
      toast.success(archivo ? 'Cabina archivada' : 'Cabina reactivada')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'booths') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = cabinas.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cabinas</CardTitle>
        <CardDescription>Si las tienes, cada cita ocupa una cabina libre y no se solapan. Si no, déjalo vacío.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <ArchivedToggle active={activas} onChange={setActivas} />
          <Button className="ml-auto" onClick={() => setEditando(null)}>
            <Plus /> Nueva cabina
          </Button>
        </div>
        {cabinas.isPending ? (
          <Loading />
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">{activas ? 'No hay cabinas.' : 'No hay cabinas archivadas.'}</p>
        ) : (
          <ul className="divide-y">
            {lista.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 py-2">
                <span className="size-4 rounded-full" style={{ backgroundColor: colorOf(b.color, i) }} />
                <span className="flex-1 text-sm font-medium">{b.name}</span>
                <RowActions
                  active={activas}
                  what="la cabina"
                  onEdit={() => setEditando(b)}
                  onArchive={() => archivar.mutate({ id: b.id!, archivo: true })}
                  onReactivate={() => archivar.mutate({ id: b.id!, archivo: false })}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editando !== undefined} onOpenChange={(o) => !o && setEditando(undefined)}>
        <DialogContent className="sm:max-w-sm">
          {editando !== undefined && <BoothForm cabina={editando} onClose={() => setEditando(undefined)} />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function BoothForm({ cabina, onClose }: { cabina: Booth | null; onClose: () => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const [name, setName] = useState(cabina?.name ?? '')
  const [color, setColor] = useState(cabina?.color ?? '')

  const guardar = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), color: color || undefined }
      return cabina
        ? unwrap(api.PUT('/api/businesses/{businessId}/booths/{id}', { params: { path: { businessId, id: cabina.id! } }, body }))
        : unwrap(api.POST('/api/businesses/{businessId}/booths', { params: { path: { businessId } }, body }))
    },
    onSuccess: () => {
      toast.success(cabina ? 'Cabina actualizada' : 'Cabina creada')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'booths') })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        guardar.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{cabina ? 'Editar cabina' : 'Nueva cabina'}</DialogTitle>
      </DialogHeader>
      <Field label="Nombre" htmlFor="booth-name">
        <Input id="booth-name" autoFocus required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn('size-7 rounded-full ring-offset-2 ring-offset-background', color === c && 'ring-2 ring-ring')}
              style={{ backgroundColor: COLOR_HEX[c] }}
            />
          ))}
        </div>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name.trim() || guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
