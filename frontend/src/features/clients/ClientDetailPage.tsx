import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, ArrowLeft, Mail, Pencil, Phone, Plus, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useAppointments } from '@/api/queries'
import type { AppointmentStatus } from '@/api/types'
import { useTenant } from '@/auth/context'
import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppointmentDialog, type AppointmentDraft } from '@/features/agenda/AppointmentDialog'
import { AppointmentSheet } from '@/features/agenda/AppointmentSheet'
import { ClientPrivacyCard } from '@/features/privacy/ClientPrivacyCard'
import { dinero, fecha, hora, STATUS_LABEL, STATUS_VARIANT, toApiDate } from '@/lib/format'

import { ClientFormDialog } from './ClientFormDialog'

/** ficha del cliente: sus datos y el historial de citas */
export default function ClientDetailPage() {
  const id = Number(useParams().clientId)
  const { businessId, isAdmin } = useTenant()
  const queryClient = useQueryClient()
  const [editar, setEditar] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [draft, setDraft] = useState<AppointmentDraft | null>(null)
  const [abierta, setAbierta] = useState<number | null>(null)

  const cliente = useQuery({
    queryKey: [...keys.all(businessId, 'clients'), 'detalle', id],
    queryFn: () => unwrap(api.GET('/api/businesses/{businessId}/clients/{id}', { params: { path: { businessId, id } } })),
    enabled: Number.isInteger(id) && id > 0,
  })
  const citas = useAppointments({ clientId: id, page: pagina, size: 10, sort: ['startDateTime,desc'] })

  const archivar = useMutation({
    mutationFn: (archivo: boolean) =>
      archivo
        ? unwrap(api.DELETE('/api/businesses/{businessId}/clients/{id}', { params: { path: { businessId, id } } }))
        : unwrap(api.PATCH('/api/businesses/{businessId}/clients/{id}/reactivate', { params: { path: { businessId, id } } })),
    onSuccess: (_, archivo) => {
      toast.success(archivo ? 'Cliente archivado' : 'Cliente reactivado')
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'clients') })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (cliente.isPending) return <Loading />
  if (cliente.isError) return <ErrorState error={cliente.error} onRetry={() => cliente.refetch()} />
  const c = cliente.data
  const lista = citas.data?.content ?? []

  return (
    <>
      <Link to="/app/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {c.fullName} {!c.isActive && <Badge variant="outline">Archivado</Badge>}
          </h1>
          {c.createdAt && <p className="mt-1 text-sm text-muted-foreground">Cliente desde {fecha(c.createdAt, "MMMM 'de' yyyy")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {c.isActive && (
            <Button onClick={() => setDraft({ date: toApiDate(new Date()), client: c })}>
              <Plus /> Nueva cita
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditar(true)}>
            <Pencil /> Editar
          </Button>
          {isAdmin &&
            (c.isActive ? (
              <ConfirmButton
                trigger={
                  <Button variant="outline">
                    <Archive /> Archivar
                  </Button>
                }
                title="¿Archivar este cliente?"
                description="Dejará de salir en las búsquedas, pero se conserva su historial. Solo se puede archivar si no tiene citas pendientes."
                confirmLabel="Archivar"
                onConfirm={() => archivar.mutate(true)}
              />
            ) : (
              <Button variant="outline" onClick={() => archivar.mutate(false)}>
                <ArchiveRestore /> Reactivar
              </Button>
            ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="grid h-fit gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {c.phone ? (
                  <a href={`tel:${c.phone}`} className="hover:underline">
                    {c.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Sin teléfono</span>
                )}
              </p>
              <p className="flex items-center gap-2 break-all">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                {c.email ? (
                  <a href={`mailto:${c.email}`} className="hover:underline">
                    {c.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Sin email (no recibirá avisos)</span>
                )}
              </p>
              {c.notes && (
                <p className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="whitespace-pre-line">{c.notes}</span>
                </p>
              )}
            </CardContent>
          </Card>
          {isAdmin && c.fullName !== 'Cliente borrado' && <ClientPrivacyCard client={c} />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Citas{citas.data?.page?.totalElements ? ` (${citas.data.page.totalElements})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {citas.isPending ? (
              <Loading />
            ) : citas.isError ? (
              <ErrorState error={citas.error} onRetry={() => citas.refetch()} />
            ) : lista.length === 0 ? (
              <EmptyState title="Todavía no tiene citas" />
            ) : (
              <ul className="divide-y">
                {lista.map((a) => {
                  const estado = a.statusName as AppointmentStatus
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setAbierta(a.id!)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-accent/50"
                      >
                        <span className="w-24 shrink-0 text-sm">
                          <span className="block font-medium">{fecha(a.startDateTime!, 'd MMM yyyy')}</span>
                          <span className="text-xs text-muted-foreground">{hora(a.startDateTime!)}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{a.bookedServices?.map((s) => s.serviceName).join(', ')}</span>
                          <span className="block truncate text-xs text-muted-foreground">con {a.userFullName}</span>
                        </span>
                        <span className="hidden text-sm tabular-nums sm:block">{dinero(a.total)}</span>
                        {a.isPaid && <Badge variant="success">Cobrada</Badge>}
                        <Badge variant={STATUS_VARIANT[estado]}>{STATUS_LABEL[estado]}</Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Pagination page={citas.data} onChange={setPagina} />
          </CardContent>
        </Card>
      </div>

      <ClientFormDialog open={editar} client={c} onClose={() => setEditar(false)} />
      <AppointmentDialog draft={draft} onClose={() => setDraft(null)} />
      <AppointmentSheet
        appointmentId={abierta}
        onClose={() => setAbierta(null)}
        onEdit={(a) => {
          setAbierta(null)
          setDraft({ date: a.startDateTime!.slice(0, 10), appointment: a })
        }}
      />
    </>
  )
}
