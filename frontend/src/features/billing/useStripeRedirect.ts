import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { useTenant } from '@/auth/context'

/**
 * lleva al usuario a una pagina de Stripe: el pago (checkout) o el portal de facturas
 * los datos de la tarjeta se escriben en la pagina de Stripe, nunca pasan por Optima
 */
export function useStripeRedirect(destino: 'checkout' | 'portal') {
  const { businessId } = useTenant()
  return useMutation({
    mutationFn: () =>
      destino === 'checkout'
        ? unwrap(api.POST('/api/businesses/{businessId}/billing/checkout', { params: { path: { businessId } } }))
        : unwrap(api.POST('/api/businesses/{businessId}/billing/portal', { params: { path: { businessId } } })),
    onSuccess: (r) => window.location.assign(r.url!),
    onError: (e) => toast.error(errorMessage(e)),
  })
}
