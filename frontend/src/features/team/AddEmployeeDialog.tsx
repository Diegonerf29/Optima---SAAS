import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useRoles } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { Field } from '@/components/common/Field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLE_LABEL } from '@/lib/format'
import { email, password, requerido, telefonoOpcional } from '@/lib/validation'

const schema = z.object({
  fullName: requerido('El nombre'),
  email,
  password,
  phone: telefonoOpcional,
  roleId: z.string().min(1, 'Elige un rol'),
})
type Values = z.infer<typeof schema>

/** alta de empleado; si el email ya tiene cuenta en Optima, el backend le manda una invitacion */
export function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{open && <Formulario onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function Formulario({ onClose }: { onClose: () => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const roles = useRoles()
  const empleado = roles.data?.find((r) => r.name === 'EMPLOYEE')
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { fullName: '', email: '', password: '', phone: '', roleId: empleado ? String(empleado.id) : '' },
    resetOptions: { keepDirtyValues: true },
  })
  const errors = form.formState.errors

  const crear = useMutation({
    mutationFn: (v: Values) =>
      unwrap(
        api.POST('/api/businesses/{businessId}/users', {
          params: { path: { businessId } },
          body: { ...v, phone: v.phone || undefined, roleId: Number(v.roleId) },
        }),
      ),
    onSuccess: (u) => {
      toast.success(u.status === 'INVITED' ? 'Ese email ya tenía cuenta: le hemos enviado una invitación' : 'Empleado creado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'employees') })
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'invitations') })
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <form onSubmit={form.handleSubmit((v) => crear.mutate(v))} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Añadir al equipo</DialogTitle>
        <DialogDescription>Podrá entrar con su email y la contraseña que pongas aquí (y cambiarla después).</DialogDescription>
      </DialogHeader>
      <Field label="Nombre y apellidos" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoFocus {...form.register('fullName')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="off" {...form.register('email')} />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...form.register('phone')} />
        </Field>
        <Field label="Contraseña inicial" htmlFor="password" error={errors.password?.message} hint="8+ caracteres con letras y números">
          <Input id="password" type="text" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Rol" error={errors.roleId?.message}>
          <Controller
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige…" />
                </SelectTrigger>
                <SelectContent>
                  {(roles.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {ROLE_LABEL[r.name ?? ''] ?? r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <Alert>
        <Info />
        <AlertDescription>
          Si ese email ya usa Optima (por ejemplo, trabaja también en otro local), no se crea otra cuenta: le llega una invitación y entra
          con su contraseña de siempre.
        </AlertDescription>
      </Alert>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Guardando…' : 'Añadir'}
        </Button>
      </DialogFooter>
    </form>
  )
}
