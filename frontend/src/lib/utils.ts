import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** junta clases de Tailwind y resuelve conflictos: cn('p-2', condicion && 'p-4') */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
