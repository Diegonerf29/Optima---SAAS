import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { errorMessage } from '@/api/client'
import { useAuth } from '@/auth/context'
import { Field } from '@/components/common/Field'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { email, password, requerido, slugUnico, telefonoOpcional } from '@/lib/validation'

const schema = z.object({
  businessName: requerido('El nombre del negocio'),
  businessEmail: email,
  fullName: requerido('Tu nombre'),
  email,
  password,
  phone: telefonoOpcional,
  acepto: z.literal(true, { message: 'Debes aceptar las condiciones y la política de privacidad' }),
})
type Values = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: registrar } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { businessName: '', businessEmail: '', fullName: '', email: '', password: '', phone: '' },
  })
  const errors = form.formState.errors

  async function onSubmit(v: Values) {
    setError(null)
    try {
      await registrar({
        business: { name: v.businessName, slug: slugUnico(v.businessName), email: v.businessEmail, appointmentInterval: 30 },
        admin: { fullName: v.fullName, email: v.email, password: v.password, phone: v.phone || undefined },
      })
      toast.success('¡Negocio creado! Te hemos enviado un email para confirmar tu dirección.')
      navigate('/app/settings?bienvenida=1', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <AuthLayout
      title="Crea tu negocio"
      description="Empieza a organizar tu agenda en un minuto"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field label="Nombre del negocio" htmlFor="businessName" error={errors.businessName?.message}>
          <Input id="businessName" placeholder="Peluquería Ana" {...form.register('businessName')} />
        </Field>
        <Field
          label="Email del negocio"
          htmlFor="businessEmail"
          error={errors.businessEmail?.message}
          hint="Lo verán tus clientes en los avisos"
        >
          <Input id="businessEmail" type="email" {...form.register('businessEmail')} />
        </Field>
        <Separator />
        <Field label="Tu nombre" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...form.register('fullName')} />
        </Field>
        <Field label="Tu email (para entrar)" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números">
          <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register('acepto')} />
          <span>
            Acepto las{' '}
            <Link to="/legal/condiciones" target="_blank" className="text-primary hover:underline">
              condiciones de uso
            </Link>{' '}
            y la{' '}
            <Link to="/legal/privacidad" target="_blank" className="text-primary hover:underline">
              política de privacidad
            </Link>
          </span>
        </label>
        {errors.acepto && <p className="-mt-2 text-xs text-destructive">{errors.acepto.message}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creando…' : 'Crear negocio'}
        </Button>
      </form>
    </AuthLayout>
  )
}
