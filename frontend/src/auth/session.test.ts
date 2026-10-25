import { describe, expect, it } from 'vitest'

import { decodeClaims, isExpired, sessionFrom } from './session'

/** token falso con la forma de un JWT (la firma no importa: el frontend no la comprueba) */
function token(payload: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const base64url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `cabecera.${base64url}.firma`
}

describe('sesion a partir del token', () => {
  const dentroDeUnaHora = Math.floor(Date.now() / 1000) + 3600

  it('lee los datos del token, tambien con tildes y eñes', () => {
    const claims = decodeClaims(token({ sub: 'begoña@ejemplo.com', userId: 7, businessId: 3, role: 'ADMIN', exp: dentroDeUnaHora }))
    expect(claims).toMatchObject({ sub: 'begoña@ejemplo.com', userId: 7, businessId: 3, role: 'ADMIN' })
  })

  it('un token roto no rompe la aplicacion', () => {
    expect(decodeClaims('esto-no-es-un-token')).toBeNull()
  })

  it('distingue token de negocio y de identidad', () => {
    const s = sessionFrom({ token: token({ sub: 'a@b.c', userId: 1, exp: dentroDeUnaHora }), tokenType: 'identity', businesses: [] })
    expect(s?.tokenType).toBe('identity')
    expect(s?.pendingInvitations).toBe(0)
  })

  it('detecta cuando ha caducado', () => {
    const viejo = sessionFrom({ token: token({ sub: 'a@b.c', userId: 1, exp: 1 }), tokenType: 'tenant' })!
    const nuevo = sessionFrom({ token: token({ sub: 'a@b.c', userId: 1, exp: dentroDeUnaHora }), tokenType: 'tenant' })!
    expect(isExpired(viejo)).toBe(true)
    expect(isExpired(nuevo)).toBe(false)
  })
})
