import { describe, expect, it } from 'vitest'

import type { Session } from '@/auth/session'

import { destinoTrasLogin } from './postLogin'

const base: Session = {
  token: 't',
  tokenType: 'tenant',
  claims: { sub: 'a@b.c', userId: 1, exp: 0 },
  businesses: [],
  pendingInvitations: 0,
}

describe('a donde ir despues de entrar', () => {
  it('con negocio elegido va a la agenda o a la pagina que se pidio', () => {
    expect(destinoTrasLogin(base)).toBe('/app')
    expect(destinoTrasLogin(base, '/app/clients/5')).toBe('/app/clients/5')
  })

  it('no sigue un "next" que saque de la aplicacion', () => {
    expect(destinoTrasLogin(base, 'https://malo.example')).toBe('/app')
    expect(destinoTrasLogin(base, '/login')).toBe('/app')
  })

  it('con varios negocios hay que elegir; sin negocios pero con invitaciones, ver las invitaciones', () => {
    expect(destinoTrasLogin({ ...base, tokenType: 'identity', businesses: [{}, {}] })).toBe('/select-business')
    expect(destinoTrasLogin({ ...base, tokenType: 'identity', pendingInvitations: 1 })).toBe('/invitations')
  })
})
