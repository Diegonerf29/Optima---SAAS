// constantes y helpers compartidos por el catalogo de servicios, categorias e impuestos
// fmtEur vive en lib compartido; se reexporta para conservar el API del modulo
export { fmtEur } from '@/lib/format'

export const emptyService = { name: '', description: '', price: '', durationMinutes: '', categoryId: '', taxId: '' }
export const emptyCategory = { name: '' }

export const fmtSince = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : '—'

// Colores deterministas por categoryId Hash simple: (id - 1) % N
export const CAT_PALETTE = [
  { grad: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)', dot: '#06b6d4' },
  { grad: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)', dot: '#a855f7' },
  { grad: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 100%)', dot: '#ec4899' },
  { grad: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)', dot: '#f59e0b' },
  { grad: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)', dot: '#10b981' },
  { grad: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)', dot: '#3b82f6' },
]
export const catColor = (id) => CAT_PALETTE[((id ?? 1) - 1) % CAT_PALETTE.length]

// Si el impuesto del servicio no esta en la lista (p ej fue archivado, y
// GET /taxes solo devuelve los activos) devolvemos null en vez de asumir 0 %
// asi la interfaz muestra "IVA no disponible" / " - " en lugar de un total inventado
export const taxPercentage = (taxes, id) => {
  const pct = taxes.find((t) => t.id === id)?.percentage
  return pct == null ? null : Number(pct)
}
export const priceWithVat = (service, taxes) => {
  const pct = taxPercentage(taxes, service.taxId)
  return pct == null ? null : Number(service.price) * (1 + pct / 100)
}
