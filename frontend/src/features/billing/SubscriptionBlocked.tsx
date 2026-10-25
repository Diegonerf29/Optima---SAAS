import { CreditCard, Download, Lock } from 'lucide-react'

import { useTenant } from '@/auth/context'
import { Button } from '@/components/ui/button'
import { useBusinessExport } from '@/features/privacy/useBusinessExport'

import { useStripeRedirect } from './useStripeRedirect'

/** pantalla cuando la suscripcion no esta activa: el ADMIN puede pagar, el resto ve el aviso */
export function SubscriptionBlocked({ trialEnded }: { trialEnded: boolean }) {
  const { isAdmin } = useTenant()
  const pagar = useStripeRedirect('checkout')
  const exportar = useBusinessExport()
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Lock className="mx-auto size-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">{trialEnded ? 'La prueba gratis ha terminado' : 'La suscripción no está activa'}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tus citas y clientes siguen guardados. En cuanto se active la suscripción, todo vuelve a estar como lo dejaste.
      </p>
      {isAdmin ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button disabled={pagar.isPending} onClick={() => pagar.mutate()}>
            <CreditCard /> {pagar.isPending ? 'Abriendo Stripe…' : 'Suscribirme'}
          </Button>
          <Button variant="link" size="sm" disabled={exportar.isPending} onClick={() => exportar.mutate()}>
            <Download /> Descargar todos los datos
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm font-medium">Avisa a la persona que administra el negocio para que la renueve.</p>
      )}
    </div>
  )
}
