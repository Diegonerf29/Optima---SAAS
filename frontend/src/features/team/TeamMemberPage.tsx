import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, ArrowLeft, Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useRoles } from '@/api/queries'
import type { Employee } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Field } from '@/components/common/Field'
import { ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COLOR_HEX, COLORS, ROLE_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

import { AbsencesCard } from './AbsencesCard'
import { EmployeeAvatar } from './EmployeeAvatar'
import { ScheduleCard } from './ScheduleCard'

/** ficha de un empleado: rol, color, horario semanal y ausencias */
export default function TeamMemberPage() {
  const id = Number(useParams().membershipId)
  const { businessId, isAdmin, userId } = useTenant()
  const queryClient = useQueryClient()

  const empleado = useQuery({
    queryKey: [...keys.all(businessId, 'employees'), 'detalle', id],
    queryFn: () => unwrap(api.GET('/api/businesses/{businessId}/users/{id}', { params: { path: { businessId, id } } })),
    enabled: Number.isInteger(id) && id > 0,
  })

  const archivar = useMutation({
    mutationFn: (archivo: boolean) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/users/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/users/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, archivo) => {
      toast.success(archivo ? 'Empleado archivado' : 'Empleado reactivado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'employees') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (empleado.isPending) return <Loading />
  if (empleado.isError) return <ErrorState error={empleado.error} onRetry={() => empleado.refetch()} />
  const e = empleado.data
  const soyYo = e.userId === userId
  const editable = isAdmin && e.isActive === true

  return (
    <>
      <Link to="/app/team" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Equipo
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <EmployeeAvatar name={e.fullName} color={e.color} className="size-14" />
        <div className="flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {e.fullName}
            <Badge variant="secondary">{ROLE_LABEL[e.roleName ?? ''] ?? e.roleName}</Badge>
            {!e.isActive && <Badge variant="outline">Archivado</Badge>}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {e.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" /> {e.email}
              </span>
            )}
            {e.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {e.phone}
              </span>
            )}
          </div>
        </div>
        {isAdmin &&
          !soyYo &&
          (e.isActive ? (
            <ConfirmButton
              trigger={
                <Button variant="outline">
                  <Archive /> Archivar
                </Button>
              }
              title={`¿Archivar a ${e.fullName}?`}
              description="Dejará de poder entrar en este negocio y no saldrá en la agenda. Antes hay que cancelar o mover sus citas pendientes."
              confirmLabel="Archivar"
              onConfirm={() => archivar.mutate(true)}
            />
          ) : (
            <Button variant="outline" onClick={() => archivar.mutate(false)}>
              <ArchiveRestore /> Reactivar
            </Button>
          ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {editable && <RolYColor empleado={e} />}
        <ScheduleCard membershipId={id} editable={editable} />
        <AbsencesCard membershipId={id} editable={editable} />
      </div>
    </>
  )
}

function RolYColor({ empleado }: { empleado: Employee }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const roles = useRoles()
  const [roleId, setRoleId] = useState(String(empleado.roleId))
  const [color, setColor] = useState(empleado.color ?? '')

  const guardar = useMutation({
    mutationFn: () =>
      unwrap(
        api.PUT('/api/businesses/{businessId}/users/{id}', {
          params: { path: { businessId, id: empleado.id! } },
          body: { roleId: Number(roleId), color: color || undefined },
        }),
      ),
    onSuccess: () => {
      toast.success('Cambios guardados')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'employees') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cambiado = roleId !== String(empleado.roleId) || color !== (empleado.color ?? '')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rol y color</CardTitle>
        <CardDescription>
          El administrador gestiona el equipo, el catálogo y la configuración; el empleado lleva la agenda, los clientes y los cobros.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field label="Rol">
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(roles.data ?? []).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {ROLE_LABEL[r.name ?? ''] ?? r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Color en la agenda">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn('size-8 rounded-full ring-offset-2 ring-offset-background transition', color === c && 'ring-2 ring-ring')}
                style={{ backgroundColor: COLOR_HEX[c] }}
              />
            ))}
          </div>
        </Field>
        <Button className="w-fit" disabled={!cambiado || guardar.isPending} onClick={() => guardar.mutate()}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </CardContent>
    </Card>
  )
}
