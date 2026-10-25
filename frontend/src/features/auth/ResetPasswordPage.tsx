import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { Field } from '@/components/common/Field'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTokenFromUrl } from '@/features/auth/useTokenFromUrl'
import { password } from '@/lib/validation'

const schema = z
  .object({ password, repetir: z.string() })
  .refine((v) => v.password === v.repetir, { message: 'Las contraseñas no coinciden', path: ['repetir'] })
type Values = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const token = useTokenFromUrl()
  const [hecho, setHecho] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', repetir: '' } })

  async function onSubmit(v: Values) {
    setError(null)
    try {
      await unwrap(api.POST('/api/auth/reset-password', { body: { token: token!, newPassword: v.password } }))
      setHecho(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Enlace no válido">
        <p className="mb-4 text-sm text-muted-foreground">Abre el enlace completo que te enviamos por email o pide uno nuevo.</p>
        <Button asChild className="w-full">
          <Link to="/forgot-password">Pedir otro enlace</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nueva contraseña">
      {hecho ? (
        <div className="grid gap-4 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="text-sm text-muted-foreground">Contraseña cambiada. Por seguridad se han cerrado tus sesiones abiertas.</p>
          <Button asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}{' '}
                <Link to="/forgot-password" className="underline">
                  Pedir otro enlace
                </Link>
              </AlertDescription>
            </Alert>
          )}
          <Field
            label="Nueva contraseña"
            htmlFor="password"
            error={form.formState.errors.password?.message}
            hint="Mínimo 8 caracteres, con letras y números"
          >
            <Input id="password" type="password" autoComplete="new-password" autoFocus {...form.register('password')} />
          </Field>
          <Field label="Repítela" htmlFor="repetir" error={form.formState.errors.repetir?.message}>
            <Input id="repetir" type="password" autoComplete="new-password" {...form.register('repetir')} />
          </Field>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
