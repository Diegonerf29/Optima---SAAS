import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useEmployees } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { ArchivedToggle } from '@/components/common/ArchivedToggle'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fecha, ROLE_LABEL } from '@/lib/format'

import { AddEmployeeDialog } from './AddEmployeeDialog'
import { EmployeeAvatar } from './EmployeeAvatar'

export default function TeamPage() {
  const { isAdmin, userId } = useTenant()
  const [activos, setActivos] = useState(true)
  const [alta, setAlta] = useState(false)
  const empleados = useEmployees(activos)
  const lista = empleados.data ?? []

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Quién trabaja en el local. Cada uno tiene su color en la agenda."
        actions={
          isAdmin && (
            <Button onClick={() => setAlta(true)}>
              <Plus /> Añadir empleado
            </Button>
          )
        }
      />
      {isAdmin && (
        <div className="mb-4">
          <ArchivedToggle active={activos} onChange={setActivos} />
        </div>
      )}

      {empleados.isPending ? (
        <Loading />
      ) : empleados.isError ? (
        <ErrorState error={empleados.error} onRetry={() => empleados.refetch()} />
      ) : lista.length === 0 ? (
        <EmptyState title={activos ? 'No hay empleados' : 'No hay empleados archivados'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((e, i) => (
            <Link key={e.id} to={`/app/team/${e.id}`}>
              <Card className="h-full py-4 transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-3 px-4">
                  <EmployeeAvatar name={e.fullName} color={e.color} index={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {e.fullName} {e.userId === userId && <span className="text-xs text-muted-foreground">(tú)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{e.email ?? ROLE_LABEL[e.roleName ?? '']}</p>
                  </div>
                  {e.roleName === 'ADMIN' && <Badge variant="secondary">Admin</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {isAdmin && activos && <Invitaciones />}
      <AddEmployeeDialog open={alta} onClose={() => setAlta(false)} />
    </>
  )
}

/** invitaciones enviadas a personas que ya tenian cuenta y aun no han contestado */
function Invitaciones() {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const invitaciones = useQuery({
    queryKey: keys.all(businessId, 'invitations'),
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/users/invitations', { params: { path: { businessId }, query: { size: 50 } } })),
    select: (p) => p.content ?? [],
  })
  const cancelar = useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/api/businesses/{businessId}/users/{id}', { params: { path: { businessId, id } } })),
    onSuccess: () => {
      toast.success('Invitación cancelada')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'invitations') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (!invitaciones.data?.length) return null
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4" /> Invitaciones pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {invitaciones.data.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1">
                {inv.email}
                {inv.invitedAt && <span className="block text-xs text-muted-foreground">Enviada el {fecha(inv.invitedAt)}</span>}
              </span>
              <ConfirmButton
                trigger={
                  <Button variant="ghost" size="sm">
                    <X /> Cancelar
                  </Button>
                }
                title="¿Cancelar la invitación?"
                confirmLabel="Cancelar invitación"
                destructive
                onConfirm={() => cancelar.mutate(inv.id!)}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
