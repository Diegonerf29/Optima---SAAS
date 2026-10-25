import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { z } from 'zod'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useBusiness } from '@/api/queries'
import type { Business } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Field } from '@/components/common/Field'
import { ErrorState, Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useBusinessExport } from '@/features/privacy/useBusinessExport'
import { codigoPostalOpcional, email, requerido, telefonoOpcional, vacioANull } from '@/lib/validation'

const ZONAS = [
  ['Europe/Madrid', 'España peninsular y Baleares'],
  ['Atlantic/Canary', 'Canarias'],
  ['Europe/Lisbon', 'Portugal'],
  ['Europe/London', 'Reino Unido'],
  ['Europe/Paris', 'Francia'],
  ['America/Mexico_City', 'México (centro)'],
  ['America/Bogota', 'Colombia'],
  ['America/Lima', 'Perú'],
  ['America/Santiago', 'Chile'],
  ['America/Argentina/Buenos_Aires', 'Argentina'],
] as const

const texto = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).optional()

const schema = z.object({
  name: requerido('El nombre'),
  email,
  phone: telefonoOpcional,
  address: texto(255),
  city: texto(100),
  state: texto(100),
  country: texto(100),
  postalCode: codigoPostalOpcional,
  appointmentInterval: z.string(),
  timezone: z.string().min(1),
  sendClientEmails: z.boolean(),
})
type Values = z.infer<typeof schema>

export function BusinessTab() {
  const negocio = useBusiness()
  if (negocio.isPending) return <Loading />
  if (negocio.isError) return <ErrorState error={negocio.error} onRetry={() => negocio.refetch()} />
  return <Formulario negocio={negocio.data} />
}

function Formulario({ negocio }: { negocio: Business }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: negocio.name ?? '',
      email: negocio.email ?? '',
      phone: negocio.phone ?? '',
      address: negocio.address ?? '',
      city: negocio.city ?? '',
      state: negocio.state ?? '',
      country: negocio.country ?? 'España',
      postalCode: negocio.postalCode ?? '',
      appointmentInterval: String(negocio.appointmentInterval ?? 30),
      timezone: negocio.timezone ?? 'Europe/Madrid',
      sendClientEmails: negocio.sendClientEmails ?? true,
    },
  })
  const errors = form.formState.errors

  const guardar = useMutation({
    mutationFn: (v: Values) =>
      unwrap(
        api.PUT('/api/businesses/{id}', {
          params: { path: { id: businessId } },
          body: { ...vacioANull(v), name: v.name, email: v.email, appointmentInterval: Number(v.appointmentInterval) },
        }),
      ),
    onSuccess: (b) => {
      toast.success('Datos guardados')
      queryClient.setQueryData(keys.business(businessId), b)
      void queryClient.invalidateQueries({ queryKey: keys.myBusinesses })
      form.reset(form.getValues())
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const exportar = useBusinessExport()

  const desactivar = useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/businesses/{id}', { params: { path: { id: businessId } } })),
    onSuccess: () => {
      toast.success('Negocio desactivado')
      void queryClient.invalidateQueries({ queryKey: keys.business(businessId) })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const zonas: readonly (readonly [string, string])[] = ZONAS.some(([z]) => z === negocio.timezone)
    ? ZONAS
    : [...ZONAS, [negocio.timezone ?? 'Europe/Madrid', negocio.timezone ?? 'Europe/Madrid']]

  return (
    <div className="grid gap-6">
      <form onSubmit={form.handleSubmit((v) => guardar.mutate(v))} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Datos del negocio</CardTitle>
            <CardDescription>Salen en los emails que reciben tus clientes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...form.register('name')} />
            </Field>
            <Field label="Email de contacto" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...form.register('email')} />
            </Field>
            <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" type="tel" {...form.register('phone')} />
            </Field>
            <Field label="Dirección" htmlFor="address" error={errors.address?.message}>
              <Input id="address" {...form.register('address')} />
            </Field>
            <Field label="Ciudad" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...form.register('city')} />
            </Field>
            <Field label="Provincia" htmlFor="state" error={errors.state?.message}>
              <Input id="state" {...form.register('state')} />
            </Field>
            <Field label="Código postal" htmlFor="postalCode" error={errors.postalCode?.message}>
              <Input id="postalCode" inputMode="numeric" {...form.register('postalCode')} />
            </Field>
            <Field label="País" htmlFor="country" error={errors.country?.message}>
              <Input id="country" {...form.register('country')} />
            </Field>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Agenda y avisos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Huecos de la agenda cada" hint="Las citas empiezan a estas horas desde que abre el local.">
              <Controller
                control={form.control}
                name="appointmentInterval"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['15', '30', '45', '60'].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m} minutos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Zona horaria" hint="Las horas de las citas son siempre las del local.">
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas.map(([valor, nombre]) => (
                        <SelectItem key={valor} value={valor}>
                          {nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Controller
              control={form.control}
              name="sendClientEmails"
              render={({ field }) => (
                <label className="flex items-start gap-3 sm:col-span-2">
                  <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium">Enviar emails a los clientes</span>
                    <span className="block text-muted-foreground">
                      Confirmación, cambios, cancelación y recordatorio el día antes (solo a clientes con email).
                    </span>
                  </span>
                </label>
              )}
            />
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!form.formState.isDirty || guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
          <CardDescription>
            Descarga en un fichero todo lo que Optima guarda de tu negocio: equipo, catálogo, clientes y citas. Es tuyo y te lo puedes
            llevar cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled={exportar.isPending} onClick={() => exportar.mutate()}>
            <Download /> {exportar.isPending ? 'Preparando…' : 'Descargar todos los datos'}
          </Button>
        </CardContent>
      </Card>

      {negocio.isActive && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Desactivar el negocio</CardTitle>
            <CardDescription>
              Nadie del equipo podrá usarlo hasta que lo reactives. No se borra nada: tus datos se conservan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmButton
              trigger={
                <Button variant="outline" className="text-destructive">
                  Desactivar negocio
                </Button>
              }
              title="¿Desactivar el negocio?"
              description="El equipo dejará de tener acceso. Solo un administrador puede reactivarlo."
              confirmLabel="Desactivar"
              destructive
              onConfirm={() => desactivar.mutate()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
