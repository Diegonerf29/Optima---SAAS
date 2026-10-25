import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useTaxes } from '@/api/queries'
import type { Tax } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ArchivedToggle } from '@/components/common/ArchivedToggle'
import { RowActions } from '@/components/common/RowActions'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { NameDialog } from './NameDialog'

export function TaxesTab() {
  const { businessId, isAdmin } = useTenant()
  const queryClient = useQueryClient()
  const [activos, setActivos] = useState(true)
  const [editando, setEditando] = useState<Tax | null | undefined>(undefined)
  const impuestos = useTaxes(activos)

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'taxes') })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'offerings') })
  }

  const guardar = useMutation({
    mutationFn: (body: { name: string; percentage: number }) =>
      editando
        ? unwrap(api.PUT('/api/businesses/{businessId}/taxes/{id}', { params: { path: { businessId, id: editando.id! } }, body }))
        : unwrap(api.POST('/api/businesses/{businessId}/taxes', { params: { path: { businessId } }, body })),
    onSuccess: () => {
      toast.success(editando ? 'Impuesto actualizado' : 'Impuesto creado')
      refrescar()
      setEditando(undefined)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const archivar = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: boolean }) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/taxes/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/taxes/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, { archivo }) => {
      toast.success(archivo ? 'Impuesto archivado' : 'Impuesto reactivado')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = impuestos.data ?? []

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">El IVA de cada servicio. Los precios ya lo llevan incluido.</p>
        {isAdmin && <ArchivedToggle active={activos} onChange={setActivos} />}
        {isAdmin && (
          <Button onClick={() => setEditando(null)}>
            <Plus /> Nuevo impuesto
          </Button>
        )}
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {impuestos.isPending ? (
            <Loading />
          ) : impuestos.isError ? (
            <ErrorState error={impuestos.error} onRetry={() => impuestos.refetch()} />
          ) : lista.length === 0 ? (
            <div className="p-4">
              <EmptyState title={activos ? 'No hay impuestos' : 'No hay impuestos archivados'} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Porcentaje</TableHead>
                  {isAdmin && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.percentage} %</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <RowActions
                          active={activos}
                          what="el impuesto"
                          onEdit={() => setEditando(c)}
                          onArchive={() => archivar.mutate({ id: c.id!, archivo: true })}
                          onReactivate={() => archivar.mutate({ id: c.id!, archivo: false })}
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

      <NameDialog
        open={editando !== undefined}
        title={editando ? 'Editar impuesto' : 'Nuevo impuesto'}
        initial={{ name: editando?.name ?? '', percentage: editando?.percentage }}
        maxLength={50}
        withPercentage
        saving={guardar.isPending}
        onClose={() => setEditando(undefined)}
        onSave={(v) => guardar.mutate({ name: v.name, percentage: v.percentage ?? 0 })}
      />
    </>
  )
}
