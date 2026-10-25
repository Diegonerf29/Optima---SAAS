import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import type { AppointmentStatus, PaymentMethod } from '@/api/types'

/** fecha con formato en español: fecha(new Date(), "EEEE d 'de' MMMM") -> "lunes 7 de enero" */
export function fecha(value: Date | string, pattern = 'dd/MM/yyyy'): string {
  const date = typeof value === 'string' ? parseApiDateTime(value) : value
  return format(date, pattern, { locale: es })
}

export function hora(value: Date | string): string {
  return fecha(value, 'HH:mm')
}

/**
 * la API trabaja con fechas sin zona horaria (hora local del negocio): "2030-01-07T10:00:00"
 * se leen y escriben tal cual, sin convertir a UTC
 */
export function parseApiDateTime(value: string): Date {
  return parseISO(value)
}

export function toApiDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

export function toApiDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export function dinero(value: number | string | undefined | null): string {
  return euros.format(Number(value ?? 0))
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No vino',
}

/** variante de Badge para cada estado */
export const STATUS_VARIANT: Record<AppointmentStatus, 'secondary' | 'default' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'success',
  CANCELLED: 'outline',
  NO_SHOW: 'destructive',
}

/** a que estados se puede pasar desde cada uno (igual que el backend) */
export const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  BIZUM: 'Bizum',
  OTHER: 'Otro',
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** colores de empleados y cabinas (los mismos que acepta el backend) */
export const COLORS = ['cyan', 'amber', 'emerald', 'indigo', 'pink', 'sky', 'violet', 'teal'] as const
export type ColorName = (typeof COLORS)[number]

export const COLOR_HEX: Record<ColorName, string> = {
  cyan: '#0891b2',
  amber: '#d97706',
  emerald: '#059669',
  indigo: '#4f46e5',
  pink: '#db2777',
  sky: '#0284c7',
  violet: '#7c3aed',
  teal: '#0d9488',
}

export function colorOf(name?: string | null, fallbackIndex = 0): string {
  if (name && name in COLOR_HEX) return COLOR_HEX[name as ColorName]
  return Object.values(COLOR_HEX)[fallbackIndex % COLORS.length]
}

export function iniciales(nombre?: string | null): string {
  if (!nombre) return '?'
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
