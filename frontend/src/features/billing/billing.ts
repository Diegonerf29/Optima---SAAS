import { differenceInCalendarDays } from 'date-fns'

import type { Billing } from '@/api/types'

export const SUBSCRIPTION_LABEL: Record<string, string> = {
  TRIALING: 'Prueba gratis',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  CANCELED: 'Cancelada',
  UNPAID: 'Sin pagar',
  INCOMPLETE: 'Pago sin completar',
  INCOMPLETE_EXPIRED: 'Pago caducado',
  PAUSED: 'En pausa',
}

/** dias de prueba que quedan (0 si ya ha terminado o no hay prueba) */
export function diasDePrueba(billing: Billing, hoy = new Date()): number {
  if (billing.status !== 'TRIALING' || !billing.trialEndsAt) return 0
  return Math.max(0, differenceInCalendarDays(new Date(billing.trialEndsAt), hoy))
}

/** si hay que avisar de que la prueba se acaba (quedan pocos dias y aun no se ha suscrito) */
export function avisarFinDePrueba(billing: Billing, hoy = new Date()): boolean {
  return (
    billing.enabled === true &&
    billing.hasAccess === true &&
    !billing.hasSubscription &&
    billing.status === 'TRIALING' &&
    diasDePrueba(billing, hoy) <= 5
  )
}
