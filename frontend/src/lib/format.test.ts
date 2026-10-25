import { describe, expect, it } from 'vitest'

import { colorOf, COLOR_HEX, dinero, hora, iniciales, NEXT_STATUSES, parseApiDateTime, toApiDate, toApiDateTime } from './format'

describe('fechas de la API (hora local del negocio, sin zona horaria)', () => {
  it('lee y vuelve a escribir la misma fecha sin moverla de hora', () => {
    const texto = '2030-01-07T10:30:00'
    const fecha = parseApiDateTime(texto)
    expect(fecha.getHours()).toBe(10)
    expect(fecha.getMinutes()).toBe(30)
    expect(toApiDateTime(fecha)).toBe(texto)
  })

  it('formatea el dia y la hora', () => {
    expect(toApiDate(new Date(2030, 0, 7, 23, 59))).toBe('2030-01-07')
    expect(hora('2030-01-07T09:05:00')).toBe('09:05')
  })
})

describe('dinero', () => {
  it('usa euros con formato español', () => {
    // Intl separa el simbolo con un espacio duro; se normaliza para comparar
    expect(dinero(18.5).replace(/\s/g, ' ')).toBe('18,50 €')
    expect(dinero(undefined).replace(/\s/g, ' ')).toBe('0,00 €')
  })
})

describe('estados de las citas', () => {
  it('las citas terminadas no pueden cambiar de estado (igual que el backend)', () => {
    expect(NEXT_STATUSES.COMPLETED).toEqual([])
    expect(NEXT_STATUSES.CANCELLED).toEqual([])
    expect(NEXT_STATUSES.NO_SHOW).toEqual([])
    expect(NEXT_STATUSES.PENDING).toContain('CONFIRMED')
  })
})

describe('colores e iniciales', () => {
  it('usa el color guardado o uno por posicion', () => {
    expect(colorOf('pink')).toBe(COLOR_HEX.pink)
    expect(colorOf(null, 1)).toBe(COLOR_HEX.amber)
    expect(colorOf('desconocido', 0)).toBe(COLOR_HEX.cyan)
  })

  it('saca las iniciales del nombre', () => {
    expect(iniciales('Laura Gómez Ruiz')).toBe('LG')
    expect(iniciales('ana')).toBe('A')
    expect(iniciales(undefined)).toBe('?')
  })
})
