import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { useTenant } from '@/auth/context'
import { descargarJson } from '@/lib/download'
import { toApiDate } from '@/lib/format'

/** descarga todos los datos del negocio en un fichero (RGPD; tambien sirve como copia propia) */
export function useBusinessExport() {
  const { businessId } = useTenant()
  return useMutation({
    mutationFn: () => unwrap(api.GET('/api/businesses/{businessId}/export', { params: { path: { businessId } } })),
    onSuccess: (datos) => {
      descargarJson(`optima-negocio-${businessId}-${toApiDate(new Date())}.json`, datos)
      toast.success('Datos descargados')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
