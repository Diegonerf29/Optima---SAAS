import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Field } from '@/components/common/Field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { requerido } from '@/lib/validation'

type Values = { name: string; percentage?: number }

/**
 * dialogo pequeño para lo que solo tiene nombre (categorias) o nombre y porcentaje (impuestos)
 * withPercentage muestra el campo del porcentaje
 */
export function NameDialog({
  open,
  title,
  initial,
  maxLength,
  withPercentage,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  initial: Values
  maxLength: number
  withPercentage?: boolean
  saving: boolean
  onClose: () => void
  onSave: (v: Values) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {open && (
          <Formulario
            title={title}
            initial={initial}
            maxLength={maxLength}
            withPercentage={withPercentage}
            saving={saving}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  title,
  initial,
  maxLength,
  withPercentage,
  saving,
  onClose,
  onSave,
}: Omit<Parameters<typeof NameDialog>[0], 'open'>) {
  const schema = z
    .object({
      name: requerido('El nombre', maxLength),
      percentage: z.number({ error: 'Pon el porcentaje' }).min(0, 'No puede ser negativo').max(100, 'Como mucho 100').optional(),
    })
    .refine((v) => !withPercentage || v.percentage !== undefined, { message: 'Pon el porcentaje', path: ['percentage'] })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial })
  const errors = form.formState.errors

  return (
    <form onSubmit={form.handleSubmit(onSave)} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoFocus maxLength={maxLength} {...form.register('name')} />
      </Field>
      {withPercentage && (
        <Field label="Porcentaje (%)" htmlFor="percentage" error={errors.percentage?.message}>
          <Input id="percentage" type="number" min={0} max={100} step={0.01} {...form.register('percentage', { valueAsNumber: true })} />
        </Field>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
