import { describe, expect, it } from 'vitest'

import type { Billing } from '@/api/types'

import { avisarFinDePrueba, diasDePrueba } from './billing'

const HOY = new Date(2030, 0, 7, 12, 0)
const prueba = (dias: number, extra: Partial<Billing> = {}): Billing => ({
  enabled: true,
  status: 'TRIALING',
  trialEndsAt: new Date(2030, 0, 7 + dias, 12, 0).toISOString(),
  hasAccess: true,
  hasPaymentAccount: false,
  hasSubscription: false,
  ...extra,
})

describe('prueba gratis', () => {
  it('cuenta los dias que quedan', () => {
    expect(diasDePrueba(prueba(14), HOY)).toBe(14)
    expect(diasDePrueba(prueba(-3), HOY)).toBe(0)
    expect(diasDePrueba({ ...prueba(5), status: 'ACTIVE' }, HOY)).toBe(0)
  })

  it('avisa solo en los ultimos dias y si aun no se ha suscrito', () => {
    expect(avisarFinDePrueba(prueba(14), HOY)).toBe(false)
    expect(avisarFinDePrueba(prueba(5), HOY)).toBe(true)
    expect(avisarFinDePrueba(prueba(2, { hasSubscription: true }), HOY)).toBe(false)
    // con los pagos apagados (desarrollo, demo) nunca
    expect(avisarFinDePrueba(prueba(2, { enabled: false }), HOY)).toBe(false)
  })
})
