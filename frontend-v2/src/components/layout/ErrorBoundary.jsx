// Limite de error reutilizable: evita la pantalla en blanco ante cualquier error de
// render de sus descendientes (incluido el fallo de import() de un chunk diferido,
// p ej tras un redeploy que cambia los hashes, o un corte de red)
// Ofrece recargar la pagina como recuperacion fiable
import { Component } from 'react'

const DEFAULT_TITLE = 'No se pudo cargar esta sección'
const DEFAULT_DESCRIPTION =
  'Puede deberse a una actualización reciente de la aplicación o a un problema de conexión. Recarga para continuar.'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  // Marca el fallo para pintar la alternativa en el siguiente render
  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Deja rastro en consola para depurar; el usuario solo ve la opcion de recargar
  componentDidCatch(error) {
    console.error('Error capturado por ErrorBoundary', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const title = this.props.title ?? DEFAULT_TITLE
    const description = this.props.description ?? DEFAULT_DESCRIPTION
    return (
      <div className="min-h-[60dvh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-base font-bold text-[#1e3a5f]">{title}</div>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm px-5 h-11 shadow-[0_12px_30px_-10px_rgba(14,165,233,0.6)] hover:brightness-105 transition"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
