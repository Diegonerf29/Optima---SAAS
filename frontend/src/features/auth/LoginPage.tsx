import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { errorMessage } from '@/api/client'
import { useAuth } from '@/auth/context'
import { Field } from '@/components/common/Field'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { destinoTrasLogin } from '@/features/auth/postLogin'
import { email } from '@/lib/validation'

const schema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const { login, expiredNotice, clearExpiredNotice } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: Values) {
    setError(null)
    try {
      const session = await login(values.email, values.password)
      clearExpiredNotice()
      navigate(destinoTrasLogin(session, params.get('next')), { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      description="Entra en la agenda de tu negocio"
      footer={
        <>
          ¿Tu negocio aún no usa Optima?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Créalo gratis
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {expiredNotice && (
          <Alert>
            <Info />
            <AlertDescription>Tu sesión se ha cerrado. Vuelve a entrar para continuar.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus {...form.register('email')} />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link to="/forgot-password" className="text-center text-sm text-muted-foreground hover:underline">
          He olvidado mi contraseña
        </Link>
      </form>
    </AuthLayout>
  )
}
