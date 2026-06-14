// constantes y helpers compartidos por la pagina de clientes, sus vistas y su panel
// avatarColor vive en lib compartido; se reexporta para que las vistas importen de un solo sitio
export { avatarColor } from '@/lib/avatar'

// formulario vacio de cliente
export const empty = { fullName: '', email: '', phone: '', notes: '' }

// "ago 2025" corto, para la columna de la tabla
export const fmtSince = (iso) => {
  if (!iso) return '—'
  return new Date(iso)
    .toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

// "12 de agosto de 2025 - hace 9 meses" largo, para el panel
export const fmtSinceLong = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  const rel =
    months >= 12
      ? `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) === 1 ? '' : 's'}`
      : months <= 1
      ? 'recién registrado'
      : `hace ${months} meses`
  const fmt = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  return `${fmt} · ${rel}`
}

export const telHref = (phone) => 'tel:' + String(phone || '').replace(/\s/g, '')
