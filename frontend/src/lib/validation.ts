import { z } from 'zod'

/*
 * reglas de los formularios, las mismas que aplica el backend
 * (asi el error se ve antes de enviar; el backend vuelve a comprobarlo)
 */

export const requerido = (campo: string, max = 150) =>
  z.string().trim().min(1, `${campo} es obligatorio`).max(max, `${campo} no puede superar los ${max} caracteres`)

export const email = z.string().trim().min(1, 'El email es obligatorio').email('El email no tiene un formato válido').max(150)

/** igual que @Password del backend: 8+ caracteres, letras y números, como mucho 72 bytes */
export const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), 'Debe tener letras y números')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'Demasiado larga (máximo 72 bytes)')

export const emailOpcional = z.string().trim().email('El email no tiene un formato válido').max(150).optional().or(z.literal(''))

export const telefonoOpcional = z
  .string()
  .trim()
  .regex(/^$|^[0-9+\s()-]{6,20}$/, 'Solo dígitos y + - ( ) y espacios (6-20 caracteres)')
  .optional()
  .or(z.literal(''))

export const codigoPostalOpcional = z
  .string()
  .trim()
  .regex(/^$|^[0-9]{4,10}$/, 'Solo dígitos (4-10)')
  .optional()
  .or(z.literal(''))

/** convierte "" en undefined para no enviar campos opcionales vacios */
export function vacioANull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = typeof v === 'string' && v.trim() === '' ? undefined : v
  }
  return out as T
}

/** "Peluquería Ana López" -> "peluqueria-ana-lopez" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

/** slug para el registro: el del nombre con un sufijo aleatorio para que no choque con otro negocio */
export function slugUnico(nombre: string): string {
  return `${slugify(nombre).slice(0, 140)}-${Math.random().toString(36).slice(2, 6)}`
}
