import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link } from 'react-router'

import { api, errorMessage, unwrap } from '@/api/client'
import { useAuth } from '@/auth/context'
import { Loading } from '@/components/common/States'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { useTokenFromUrl } from '@/features/auth/useTokenFromUrl'

export default function VerifyEmailPage() {
  const token = useTokenFromUrl()
  const { session } = useAuth()
  const verificacion = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => unwrap(api.POST('/api/auth/verify-email', { body: { token: token! } })).then(() => true),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })
  const siguiente = session ? '/app' : '/login'

  return (
    <AuthLayout title="Confirmar email">
      {!token ? (
        <p className="text-sm text-muted-foreground">El enlace no está completo. Ábrelo desde el email que te enviamos.</p>
      ) : verificacion.isPending ? (
        <Loading label="Confirmando…" />
      ) : verificacion.isError ? (
        <div className="grid gap-4 text-center">
          <XCircle className="mx-auto size-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{errorMessage(verificacion.error)}</p>
          <p className="text-sm text-muted-foreground">Desde tu perfil puedes pedir que te enviemos otro enlace.</p>
          <Button asChild variant="outline">
            <Link to={siguiente}>Continuar</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="text-sm text-muted-foreground">¡Listo! Tu email está confirmado.</p>
          <Button asChild>
            <Link to={siguiente}>Continuar</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
