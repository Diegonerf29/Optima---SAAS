import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { Button } from '@/components/ui/button'

/**
 * error al cargar una pantalla (por ejemplo, tras desplegar una version nueva
 * el navegador pide un fichero que ya no existe): se ofrece recargar
 */
export function RouteError() {
  const error = useRouteError()
  const noEncontrada = isRouteErrorResponse(error) && error.status === 404
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{noEncontrada ? 'Página no encontrada' : 'Algo ha fallado al cargar la página'}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {noEncontrada ? 'La dirección no existe.' : 'Puede que haya una versión nueva de Optima. Recarga para continuar.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Recargar</Button>
        <Button asChild variant="outline">
          <Link to="/app">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
