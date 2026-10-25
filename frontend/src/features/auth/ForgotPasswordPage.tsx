import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
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
import { email } from '@/lib/validation'

const schema = z.object({ email })
type Values = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  async function onSubmit(v: Values) {
    setError(null)
    try {
      await unwrap(api.POST('/api/auth/forgot-password', { body: { email: v.email } }))
      setEnviado(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <AuthLayout title="Recupera tu contraseña" description="Te enviaremos un enlace para crear una nueva">
      {enviado ? (
        <div className="grid gap-4 text-center">
          <MailCheck className="mx-auto size-10 text-success" />
          {/* el mismo mensaje exista o no la cuenta, para no revelar que emails estan registrados */}
          <p className="text-sm text-muted-foreground">
            Si hay una cuenta con ese email, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Volver a iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" autoFocus {...form.register('email')} />
          </Field>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Enviar enlace
          </Button>
          <Link to="/login" className="text-center text-sm text-muted-foreground hover:underline">
            Volver
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
