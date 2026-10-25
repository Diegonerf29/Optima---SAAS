import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useCategories, useOfferings, useTaxes } from '@/api/queries'
import type { Offering } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ArchivedToggle } from '@/components/common/ArchivedToggle'
import { Field } from '@/components/common/Field'
import { RowActions } from '@/components/common/RowActions'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { dinero } from '@/lib/format'
import { requerido, vacioANull } from '@/lib/validation'

export function ServicesTab() {
  const { businessId, isAdmin } = useTenant()
  const queryClient = useQueryClient()
  const [activos, setActivos] = useState(true)
  const [categoria, setCategoria] = useState('all')
  const [editando, setEditando] = useState<Offering | null | undefined>(undefined) // undefined = cerrado, null = nuevo
  const servicios = useOfferings(activos)
  const categorias = useCategories()

  const archivar = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: boolean }) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/services/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/services/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, { archivo }) => {
      toast.success(archivo ? 'Servicio archivado' : 'Servicio reactivado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'offerings') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = (servicios.data ?? []).filter((s) => categoria === 'all' || String(s.categoryId) === categoria)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-48" aria-label="Categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {(categorias.data ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && <ArchivedToggle active={activos} onChange={setActivos} />}
        {isAdmin && (
          <Button className="ml-auto" onClick={() => setEditando(null)}>
            <Plus /> Nuevo servicio
          </Button>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {servicios.isPending ? (
            <Loading />
          ) : servicios.isError ? (
            <ErrorState error={servicios.error} onRetry={() => servicios.refetch()} />
          ) : lista.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={activos ? 'Aún no hay servicios' : 'No hay servicios archivados'}
                description={activos ? 'Crea los servicios que ofreces con su duración y precio.' : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  {isAdmin && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <span className="font-medium">{s.name}</span>
                      {s.description && <span className="block max-w-xs truncate text-xs text-muted-foreground">{s.description}</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{s.categoryName}</TableCell>
                    <TableCell>{s.durationMinutes} min</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {dinero(s.price)}
                      <span className="block text-xs text-muted-foreground">{s.taxName}</span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <RowActions
                          active={activos}
                          what="el servicio"
                          onEdit={() => setEditando(s)}
                          onArchive={() => archivar.mutate({ id: s.id!, archivo: true })}
                          onReactivate={() => archivar.mutate({ id: s.id!, archivo: false })}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editando !== undefined} onOpenChange={(o) => !o && setEditando(undefined)}>
        <DialogContent>
          {editando !== undefined && <ServiceForm servicio={editando} onClose={() => setEditando(undefined)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

const schema = z.object({
  name: requerido('El nombre'),
  categoryId: z.string().min(1, 'Elige una categoría'),
  taxId: z.string().min(1, 'Elige el impuesto'),
  price: z.number({ error: 'Pon el precio' }).min(0, 'No puede ser negativo').max(99999),
  durationMinutes: z.number({ error: 'Pon la duración' }).int('Minutos enteros').min(5, 'Mínimo 5 minutos').max(720, 'Máximo 12 horas'),
  description: z.string().max(2000).optional(),
})
type Values = z.infer<typeof schema>

function ServiceForm({ servicio, onClose }: { servicio: Offering | null; onClose: () => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const categorias = useCategories()
  const impuestos = useTaxes()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: servicio?.name ?? '',
      categoryId: servicio?.categoryId ? String(servicio.categoryId) : '',
      taxId: servicio?.taxId ? String(servicio.taxId) : '',
      price: servicio?.price ?? undefined,
      durationMinutes: servicio?.durationMinutes ?? 30,
      description: servicio?.description ?? '',
    },
  })
  const errors = form.formState.errors

  // al crear, se preseleccionan la primera categoria y el primer impuesto
  const categoriaInicial = categorias.data?.[0]?.id
  const impuestoInicial = impuestos.data?.[0]?.id
  useEffect(() => {
    if (servicio) return
    if (categoriaInicial && !form.getValues('categoryId')) form.setValue('categoryId', String(categoriaInicial))
    if (impuestoInicial && !form.getValues('taxId')) form.setValue('taxId', String(impuestoInicial))
  }, [servicio, categoriaInicial, impuestoInicial, form])

  const guardar = useMutation({
    mutationFn: (v: Values) => {
      const body = { ...vacioANull(v), name: v.name, categoryId: Number(v.categoryId), taxId: Number(v.taxId) }
      return servicio
        ? unwrap(api.PUT('/api/businesses/{businessId}/services/{id}', { params: { path: { businessId, id: servicio.id! } }, body }))
        : unwrap(api.POST('/api/businesses/{businessId}/services', { params: { path: { businessId } }, body }))
    },
    onSuccess: () => {
      toast.success(servicio ? 'Servicio actualizado' : 'Servicio creado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'offerings') })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{servicio ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
        <DialogDescription>El precio es el final, con el IVA incluido. Cambiarlo no afecta a las citas ya creadas.</DialogDescription>
      </DialogHeader>
      <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoFocus placeholder="Ej.: Corte y peinado" {...form.register('name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duración (minutos)" htmlFor="durationMinutes" error={errors.durationMinutes?.message}>
          <Input id="durationMinutes" type="number" min={5} step={5} {...form.register('durationMinutes', { valueAsNumber: true })} />
        </Field>
        <Field label="Precio (€, IVA incluido)" htmlFor="price" error={errors.price?.message}>
          <Input id="price" type="number" min={0} step={0.01} inputMode="decimal" {...form.register('price', { valueAsNumber: true })} />
        </Field>
        <Field label="Categoría" error={errors.categoryId?.message}>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige…" />
                </SelectTrigger>
                <SelectContent>
                  {(categorias.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Impuesto" error={errors.taxId?.message}>
          <Controller
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige…" />
                </SelectTrigger>
                <SelectContent>
                  {(impuestos.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.percentage} %)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <Field label="Descripción (opcional)" htmlFor="description" error={errors.description?.message}>
        <Textarea id="description" rows={2} {...form.register('description')} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
