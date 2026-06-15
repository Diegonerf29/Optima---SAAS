// Limite de error para fallos al cargar un chunk diferido (React.lazy): por ejemplo
// tras un redeploy que cambia los hashes de los ficheros, o un corte de red
// En vez de dejar el area de contenido en blanco, ofrece recargar la pagina
import { Component } from 'react'

export class ChunkErrorBoundary extends Component {
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
    console.error('No se pudo cargar la vista diferida', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-[60dvh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-base font-bold text-[#1e3a5f]">No se pudo cargar esta sección</div>
          <p className="mt-1.5 text-sm text-slate-500">
            Puede deberse a una actualización reciente de la aplicación o a un problema de conexión. Recarga para continuar.
          </p>
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
