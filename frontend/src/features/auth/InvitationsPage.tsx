import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import { useAuth } from '@/auth/context'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { fecha } from '@/lib/format'

/** invitaciones de otros negocios para unirse a su equipo */
export default function InvitationsPage() {
  const { session, logout } = useAuth()
  const queryClient = useQueryClient()
  const invitaciones = useQuery({ queryKey: keys.myInvitations, queryFn: () => unwrap(api.GET('/api/me/invitations')) })

  const refrescar = () => {
    void queryClient.invalidateQueries({ queryKey: ['me'] })
  }
  const aceptar = useMutation({
    mutationFn: (id: number) => unwrap(api.POST('/api/me/invitations/{membershipId}/accept', { params: { path: { membershipId: id } } })),
    onSuccess: (m) => {
      toast.success(`Ya formas parte de ${m.businessName}`)
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const rechazar = useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/api/me/invitations/{membershipId}', { params: { path: { membershipId: id } } })),
    onSuccess: () => {
      toast.success('Invitación rechazada')
      refrescar()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const volver = session?.tokenType === 'tenant' ? '/app' : '/select-business'

  return (
    <AuthLayout
      title="Invitaciones"
      description="Negocios que te han invitado a su equipo"
      footer={
        <button type="button" onClick={logout} className="hover:underline">
          Cerrar sesión
        </button>
      }
    >
      {invitaciones.isPending ? (
        <Loading />
      ) : invitaciones.isError ? (
        <ErrorState error={invitaciones.error} onRetry={() => invitaciones.refetch()} />
      ) : invitaciones.data.length === 0 ? (
        <EmptyState
          title="No tienes invitaciones pendientes"
          action={
            <Button asChild variant="outline">
              <Link to={volver}>Continuar</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {invitaciones.data.map((inv) => (
            <li key={inv.membershipId} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{inv.businessName}</p>
                  <p className="text-xs text-muted-foreground">
                    Como {inv.role === 'ADMIN' ? 'administración' : 'empleado'}
                    {inv.invitedAt && ` · ${fecha(inv.invitedAt)}`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={rechazar.isPending} onClick={() => rechazar.mutate(inv.membershipId!)}>
                  Rechazar
                </Button>
                <Button size="sm" disabled={aceptar.isPending} onClick={() => aceptar.mutate(inv.membershipId!)}>
                  Aceptar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {invitaciones.data && invitaciones.data.length > 0 && (
        <Button asChild variant="ghost" className="mt-4 w-full">
          <Link to={volver}>Seguir sin decidir</Link>
        </Button>
      )}
    </AuthLayout>
  )
}
