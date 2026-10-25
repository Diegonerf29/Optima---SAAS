import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useCategories } from '@/api/queries'
import type { Category } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ArchivedToggle } from '@/components/common/ArchivedToggle'
import { RowActions } from '@/components/common/RowActions'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { NameDialog } from './NameDialog'

export function CategoriesTab() {
  const { businessId, isAdmin } = useTenant()
  const queryClient = useQueryClient()
  const [activos, setActivos] = useState(true)
  const [editando, setEditando] = useState<Category | null | undefined>(undefined)
  const categorias = useCategories(activos)

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'categories') })
    void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'offerings') })
  }

  const guardar = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      editando
        ? unwrap(
            api.PUT('/api/businesses/{businessId}/categories/{id}', { params: { path: { businessId, id: editando.id! } }, body: { name } }),
          )
        : unwrap(api.POST('/api/businesses/{businessId}/categories', { params: { path: { businessId } }, body: { name } })),
    onSuccess: () => {
      toast.success(editando ? 'Categoría actualizada' : 'Categoría creada')
      refrescar()
      setEditando(undefined)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const archivar = useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: boolean }) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/categories/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/categories/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, { archivo }) => {
      toast.success(archivo ? 'Categoría archivada' : 'Categoría reactivada')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const lista = categorias.data ?? []

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">Agrupan los servicios (cortes, color, tratamientos…).</p>
        {isAdmin && <ArchivedToggle active={activos} onChange={setActivos} />}
        {isAdmin && (
          <Button onClick={() => setEditando(null)}>
            <Plus /> Nueva categoría
          </Button>
        )}
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          {categorias.isPending ? (
            <Loading />
          ) : categorias.isError ? (
            <ErrorState error={categorias.error} onRetry={() => categorias.refetch()} />
          ) : lista.length === 0 ? (
            <div className="p-4">
              <EmptyState title={activos ? 'No hay categorías' : 'No hay categorías archivadas'} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  {isAdmin && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <RowActions
                          active={activos}
                          what="la categoría"
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
        title={editando ? 'Editar categoría' : 'Nueva categoría'}
        initial={{ name: editando?.name ?? '' }}
        maxLength={100}
        saving={guardar.isPending}
        onClose={() => setEditando(undefined)}
        onSave={(v) => guardar.mutate(v)}
      />
    </>
  )
}
