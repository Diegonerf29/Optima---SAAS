import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, LogOut, MailWarning } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useMe } from '@/api/queries'
import type { Me } from '@/api/types'
import { useAuth } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Field } from '@/components/common/Field'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { email, password, requerido, telefonoOpcional } from '@/lib/validation'

/** datos de la propia cuenta: nombre, email, contraseña y sesiones abiertas */
export default function ProfilePage() {
  const me = useMe()
  const { logoutEverywhere } = useAuth()

  if (me.isPending) return <Loading />
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />

  return (
    <>
      <PageHeader title="Mi perfil" description="Tu cuenta es personal y sirve para todos los negocios en los que trabajas." />
      <div className="grid max-w-2xl gap-6">
        <DatosPersonales me={me.data} />
        <CambiarContrasena />
        <Card>
          <CardHeader>
            <CardTitle>Sesiones</CardTitle>
            <CardDescription>
              Si has entrado en un ordenador que no es tuyo o has perdido el móvil, cierra todas las sesiones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmButton
              trigger={
                <Button variant="outline">
                  <LogOut /> Cerrar sesión en todos los dispositivos
                </Button>
              }
              title="¿Cerrar todas las sesiones?"
              description="Tendrás que volver a entrar en todos los dispositivos, también en este."
              confirmLabel="Cerrar sesiones"
              onConfirm={() => logoutEverywhere()}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

const datosSchema = z.object({
  fullName: requerido('El nombre'),
  email,
  phone: telefonoOpcional,
  currentPassword: z.string().max(200).optional(),
})
type Datos = z.infer<typeof datosSchema>

function DatosPersonales({ me }: { me: Me }) {
  const queryClient = useQueryClient()
  const form = useForm<Datos>({
    resolver: zodResolver(datosSchema),
    defaultValues: { fullName: me.fullName ?? '', email: me.email ?? '', phone: me.phone ?? '', currentPassword: '' },
  })
  const errors = form.formState.errors
  const emailEscrito = useWatch({ control: form.control, name: 'email' })
  const cambiaEmail = emailEscrito.trim().toLowerCase() !== (me.email ?? '').toLowerCase()

  const guardar = useMutation({
    mutationFn: (v: Datos) =>
      unwrap(
        api.PUT('/api/me', {
          body: {
            fullName: v.fullName,
            email: v.email,
            phone: v.phone || undefined,
            currentPassword: cambiaEmail ? v.currentPassword : undefined,
          },
        }),
      ),
    onSuccess: (nuevo) => {
      toast.success(cambiaEmail ? 'Datos guardados. Te hemos enviado un email para confirmar la nueva dirección.' : 'Datos guardados')
      queryClient.setQueryData(keys.me, nuevo)
      form.reset({ fullName: nuevo.fullName ?? '', email: nuevo.email ?? '', phone: nuevo.phone ?? '', currentPassword: '' })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const reenviar = useMutation({
    mutationFn: () => unwrap(api.POST('/api/auth/verify-email/resend')),
    onSuccess: () => toast.success('Te hemos enviado el email de confirmación'),
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus datos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate className="grid gap-4">
          <Field label="Nombre y apellidos" htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" {...form.register('fullName')} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          </Field>
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm">
            {me.emailVerified ? (
              <Badge variant="success">
                <BadgeCheck /> Email confirmado
              </Badge>
            ) : (
              <>
                <Badge variant="warning">
                  <MailWarning /> Sin confirmar
                </Badge>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  disabled={reenviar.isPending}
                  onClick={() => reenviar.mutate()}
                >
                  Reenviar email de confirmación
                </Button>
              </>
            )}
          </div>
          {cambiaEmail && (
            <Field
              label="Contraseña actual"
              htmlFor="currentPassword"
              error={errors.currentPassword?.message}
              hint="Por seguridad, para cambiar el email hace falta tu contraseña."
            >
              <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register('currentPassword')} />
            </Field>
          )}
          <Field label="Teléfono (opcional)" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
          </Field>
          <Button type="submit" className="w-fit" disabled={!form.formState.isDirty || guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const passSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
    newPassword: password,
    repeat: z.string(),
  })
  .refine((v) => v.newPassword === v.repeat, { message: 'Las contraseñas no coinciden', path: ['repeat'] })
type Pass = z.infer<typeof passSchema>

function CambiarContrasena() {
  const { logout } = useAuth()
  const form = useForm<Pass>({ resolver: zodResolver(passSchema), defaultValues: { currentPassword: '', newPassword: '', repeat: '' } })
  const errors = form.formState.errors

  const cambiar = useMutation({
    mutationFn: (v: Pass) =>
      unwrap(api.PUT('/api/me/password', { body: { currentPassword: v.currentPassword, newPassword: v.newPassword } })),
    onSuccess: () => {
      // el backend cierra todas las sesiones al cambiar la contraseña, tambien esta
      toast.success('Contraseña cambiada. Entra de nuevo con la nueva.')
      logout()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña</CardTitle>
        <CardDescription>Al cambiarla se cierran todas tus sesiones y tendrás que volver a entrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => cambiar.mutate(v))} noValidate className="grid gap-4">
          <Field label="Contraseña actual" htmlFor="pass-actual" error={errors.currentPassword?.message}>
            <Input id="pass-actual" type="password" autoComplete="current-password" {...form.register('currentPassword')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nueva contraseña"
              htmlFor="pass-nueva"
              error={errors.newPassword?.message}
              hint="8+ caracteres con letras y números"
            >
              <Input id="pass-nueva" type="password" autoComplete="new-password" {...form.register('newPassword')} />
            </Field>
            <Field label="Repítela" htmlFor="pass-repetir" error={errors.repeat?.message}>
              <Input id="pass-repetir" type="password" autoComplete="new-password" {...form.register('repeat')} />
            </Field>
          </div>
          <Button type="submit" className="w-fit" disabled={cambiar.isPending}>
            {cambiar.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
