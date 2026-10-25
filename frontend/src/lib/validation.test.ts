import { describe, expect, it } from 'vitest'

import { emailOpcional, password, slugify, slugUnico, telefonoOpcional, vacioANull } from './validation'

describe('contraseña (las mismas reglas que @Password del backend)', () => {
  it('acepta 8+ caracteres con letras y numeros', () => {
    expect(password.safeParse('clave-segura-1').success).toBe(true)
  })

  it.each([
    ['corta1', 'Mínimo 8 caracteres'],
    ['solo-letras', 'Debe tener letras y números'],
    ['12345678', 'Debe tener letras y números'],
  ])('rechaza "%s"', (valor, mensaje) => {
    const r = password.safeParse(valor)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe(mensaje)
  })

  it('cuenta bytes y no letras (bcrypt solo usa 72 bytes)', () => {
    // 40 "ñ" son 40 letras pero 80 bytes
    expect(password.safeParse('ñ'.repeat(40) + '1').success).toBe(false)
  })
})

describe('campos opcionales', () => {
  it('telefono vacio o valido', () => {
    expect(telefonoOpcional.safeParse('').success).toBe(true)
    expect(telefonoOpcional.safeParse('+34 600 123 456').success).toBe(true)
    expect(telefonoOpcional.safeParse('llamame').success).toBe(false)
  })

  it('email vacio o valido', () => {
    expect(emailOpcional.safeParse('').success).toBe(true)
    expect(emailOpcional.safeParse('ana@ejemplo.com').success).toBe(true)
    expect(emailOpcional.safeParse('ana@').success).toBe(false)
  })

  it('no envia los textos vacios', () => {
    expect(vacioANull({ nombre: 'Ana', email: '', telefono: '  ' })).toEqual({ nombre: 'Ana', email: undefined, telefono: undefined })
  })
})

describe('slug del negocio', () => {
  it('quita tildes, espacios y simbolos', () => {
    expect(slugify('Peluquería Ana López')).toBe('peluqueria-ana-lopez')
    expect(slugify('  ¡Barber & Co!  ')).toBe('barber-co')
  })

  it('añade un sufijo para que no choque con otro negocio', () => {
    expect(slugUnico('Peluquería Ana')).toMatch(/^peluqueria-ana-[a-z0-9]{4}$/)
  })
})
