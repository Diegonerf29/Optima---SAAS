// Paleta de avatares e iniciales compartida por los listados de personas (clientes, citas, agenda)

// gradientes estables para el fondo del avatar
const AVATAR_GRADIENTS = [
  'from-cyan-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-400 to-violet-500',
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
]

/** Gradiente determinista por id (modulo sobre la paleta) */
export const avatarColor = (id) => AVATAR_GRADIENTS[(id ?? 0) % AVATAR_GRADIENTS.length]

/** Iniciales (hasta dos) a partir de un nombre completo; filtra espacios sobrantes */
export const initials = (name) =>
  name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?'
