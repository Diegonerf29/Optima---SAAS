import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { useBilling } from '@/api/queries'
import { ErrorState, Loading } from '@/components/common/States'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fecha } from '@/lib/format'
import { PLAN } from '@/lib/plan'

import { diasDePrueba, SUBSCRIPTION_LABEL } from './billing'
import { useStripeRedirect } from './useStripeRedirect'

/** pestaña "Suscripción" de la configuracion (solo ADMIN) */
export function SubscriptionCard() {
  const [params, setParams] = useSearchParams()
  // al volver de pagar, el aviso de Stripe puede tardar unos segundos: se pregunta cada 2 s hasta 30 s
  const [esperando, setEsperando] = useState(params.get('pago') === 'ok')
  const billing = useBilling(esperando ? (b) => (b?.hasSubscription ? false : 2_000) : undefined)
  const suscrito = billing.data?.hasSubscription === true

  useEffect(() => {
    if (params.get('pago') !== 'ok') return
    toast.success('¡Gracias! Estamos activando tu suscripción')
    setParams({ tab: 'suscripcion' }, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    if (!esperando) return
    const fin = setTimeout(() => setEsperando(false), 30_000)
    return () => clearTimeout(fin)
  }, [esperando])

  const pagar = useStripeRedirect('checkout')
  const portal = useStripeRedirect('portal')

  if (billing.isPending) return <Loading />
  if (billing.isError) return <ErrorState error={billing.error} onRetry={() => billing.refetch()} />
  const b = billing.data
  const estado = b.status ?? 'TRIALING'
  const dias = diasDePrueba(b)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Plan {PLAN.nombre}
          <Badge variant={b.hasAccess ? (estado === 'PAST_DUE' ? 'warning' : 'success') : 'destructive'}>
            {SUBSCRIPTION_LABEL[estado] ?? estado}
          </Badge>
        </CardTitle>
        <CardDescription>
          {PLAN.precio} {PLAN.periodo}. Todo incluido: agenda, clientes, equipo y avisos por email.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {esperando && !suscrito && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Confirmando el pago con Stripe…
          </p>
        )}

        <Estado estado={estado} dias={dias} suscrito={suscrito} trialEndsAt={b.trialEndsAt} currentPeriodEnd={b.currentPeriodEnd} />

        <div className="flex flex-wrap gap-2">
          {!suscrito && (
            <Button disabled={pagar.isPending} onClick={() => pagar.mutate()}>
              <CreditCard /> {pagar.isPending ? 'Abriendo Stripe…' : 'Suscribirme'}
            </Button>
          )}
          {b.hasPaymentAccount && (
            <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>
              <ExternalLink /> Pagos y facturas
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          El pago se hace en la página segura de Stripe: Optima nunca ve los datos de tu tarjeta. Desde "Pagos y facturas" puedes cambiar la
          tarjeta, descargar las facturas o cancelar.
        </p>
      </CardContent>
    </Card>
  )
}

function Estado({
  estado,
  dias,
  suscrito,
  trialEndsAt,
  currentPeriodEnd,
}: {
  estado: string
  dias: number
  suscrito: boolean
  trialEndsAt?: string
  currentPeriodEnd?: string
}) {
  const dia = (iso?: string) => (iso ? fecha(new Date(iso), "d 'de' MMMM 'de' yyyy") : '')

  if (estado === 'TRIALING' && suscrito) {
    return <p className="text-sm">Ya estás suscrito. El primer cobro será el {dia(trialEndsAt)}, al acabar la prueba gratis.</p>
  }
  if (estado === 'TRIALING' && dias > 0) {
    return (
      <p className="text-sm">
        Te {dias === 1 ? 'queda 1 día' : `quedan ${dias} días`} de prueba gratis (hasta el {dia(trialEndsAt)}). Si te suscribes ahora, no se
        cobra nada hasta que termine.
      </p>
    )
  }
  if (estado === 'ACTIVE') {
    return <p className="text-sm">Suscripción activa. {currentPeriodEnd && `Se renueva el ${dia(currentPeriodEnd)}.`}</p>
  }
  if (estado === 'PAST_DUE') {
    return (
      <Alert variant="warning">
        <AlertDescription className="text-foreground">
          No se ha podido cobrar la última cuota. Stripe lo volverá a intentar; actualiza la tarjeta en "Pagos y facturas" para no perder el
          acceso.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {estado === 'TRIALING' ? 'La prueba gratis ha terminado.' : 'La suscripción no está activa.'} Suscríbete para seguir usando la
        agenda: tus datos siguen guardados.
      </AlertDescription>
    </Alert>
  )
}
