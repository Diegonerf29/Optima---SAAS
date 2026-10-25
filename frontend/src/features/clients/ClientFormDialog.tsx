import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys } from '@/api/queries'
import type { Client } from '@/api/types'
import { useTenant } from '@/auth/context'
import { Field } from '@/components/common/Field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { emailOpcional, requerido, telefonoOpcional, vacioANull } from '@/lib/validation'

const schema = z.object({
  fullName: requerido('El nombre'),
  phone: telefonoOpcional,
  email: emailOpcional,
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
})
type Values = z.infer<typeof schema>

/** alta y edicion de un cliente (client = null -> nuevo) */
export function ClientFormDialog({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean
  client?: Client | null
  onClose: () => void
  onSaved?: (c: Client) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{open && <Formulario client={client} onClose={onClose} onSaved={onSaved} />}</DialogContent>
    </Dialog>
  )
}

function Formulario({ client, onClose, onSaved }: { client?: Client | null; onClose: () => void; onSaved?: (c: Client) => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: client?.fullName ?? '', phone: client?.phone ?? '', email: client?.email ?? '', notes: client?.notes ?? '' },
  })
  const errors = form.formState.errors

  const guardar = useMutation({
    mutationFn: (v: Values) => {
      const body = { ...vacioANull(v), fullName: v.fullName }
      return client
        ? unwrap(api.PUT('/api/businesses/{businessId}/clients/{id}', { params: { path: { businessId, id: client.id! } }, body }))
        : unwrap(api.POST('/api/businesses/{businessId}/clients', { params: { path: { businessId } }, body }))
    },
    onSuccess: (c) => {
      toast.success(client ? 'Cliente actualizado' : 'Cliente creado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'clients') })
      // el nombre sale tambien en las citas
      if (client) void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'appointments') })
      onSaved?.(c)
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{client ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogDescription>Con el email le llegarán la confirmación y el recordatorio de sus citas.</DialogDescription>
      </DialogHeader>
      <Field label="Nombre y apellidos" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoFocus {...form.register('fullName')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...form.register('phone')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...form.register('email')} />
        </Field>
      </div>
      <Field label="Notas" htmlFor="notes" error={errors.notes?.message} hint="Alergias, preferencias… Solo las ve tu equipo.">
        <Textarea id="notes" rows={3} {...form.register('notes')} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
