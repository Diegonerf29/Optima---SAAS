import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronRight, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import { useAuth } from '@/auth/context'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/** si la persona trabaja en varios negocios, elige en cual entrar */
export default function SelectBusinessPage() {
  const { selectBusiness, logout, session } = useAuth()
  const navigate = useNavigate()
  const [entrando, setEntrando] = useState<number | null>(null)
  const negocios = useQuery({ queryKey: keys.myBusinesses, queryFn: () => unwrap(api.GET('/api/me/businesses')) })

  async function entrar(businessId: number) {
    setEntrando(businessId)
    try {
      await selectBusiness(businessId)
      navigate('/app', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
      setEntrando(null)
    }
  }

  return (
    <AuthLayout
      title="Elige un negocio"
      description="Trabajas en más de un negocio con esta cuenta"
      footer={
        <button type="button" onClick={logout} className="hover:underline">
          Cerrar sesión
        </button>
      }
    >
      {negocios.isPending ? (
        <Loading />
      ) : negocios.isError ? (
        <ErrorState error={negocios.error} onRetry={() => negocios.refetch()} />
      ) : negocios.data.length === 0 ? (
        <EmptyState title="No tienes ningún negocio activo" description="Si alguien te ha invitado, acepta la invitación." />
      ) : (
        <ul className="grid gap-2">
          {negocios.data.map((n) => (
            <li key={n.membershipId}>
              <button
                type="button"
                disabled={entrando !== null}
                onClick={() => entrar(n.businessId!)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
              >
                <Building2 className="size-5 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium">{n.businessName}</span>
                  <span className="flex gap-1.5 pt-1">
                    <Badge variant="secondary">{n.role === 'ADMIN' ? 'Administración' : 'Empleado'}</Badge>
                    {n.businessActive === false && <Badge variant="destructive">Desactivado</Badge>}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(session?.pendingInvitations ?? 0) > 0 && (
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/invitations">
            <Mail /> Tienes invitaciones pendientes
          </Link>
        </Button>
      )}
    </AuthLayout>
  )
}
