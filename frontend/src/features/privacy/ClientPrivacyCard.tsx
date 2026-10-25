import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, UserX } from 'lucide-react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import type { Client } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { descargarJson } from '@/lib/download'
import { toApiDate } from '@/lib/format'

/** derechos del cliente (RGPD): llevarse sus datos o que se borren (solo ADMIN) */
export function ClientPrivacyCard({ client }: { client: Client }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const id = client.id!

  const exportar = useMutation({
    mutationFn: () => unwrap(api.GET('/api/businesses/{businessId}/clients/{id}/export', { params: { path: { businessId, id } } })),
    onSuccess: (datos) => descargarJson(`cliente-${id}-${toApiDate(new Date())}.json`, datos),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const borrar = useMutation({
    mutationFn: () => unwrap(api.POST('/api/businesses/{businessId}/clients/{id}/anonymize', { params: { path: { businessId, id } } })),
    onSuccess: () => {
      toast.success('Datos personales borrados')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'clients') })
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'appointments') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Privacidad</CardTitle>
        <CardDescription>Si el cliente lo pide, puedes darle una copia de sus datos o borrarlos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={exportar.isPending} onClick={() => exportar.mutate()}>
          <Download /> Descargar sus datos
        </Button>
        <ConfirmButton
          trigger={
            <Button variant="outline" size="sm" className="text-destructive">
              <UserX /> Borrar sus datos
            </Button>
          }
          title={`¿Borrar los datos de ${client.fullName}?`}
          description="Se borran su nombre, teléfono, email y notas, también las notas de sus citas. Las citas se conservan como «Cliente borrado» para la caja. No se puede deshacer."
          confirmLabel="Borrar sus datos"
          destructive
          onConfirm={() => borrar.mutate()}
        />
      </CardContent>
    </Card>
  )
}
