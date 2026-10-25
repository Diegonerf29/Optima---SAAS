import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useClients } from '@/api/queries'
import { useTenant } from '@/auth/context'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState, ErrorState, Loading } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/useDebounce'
import { fecha } from '@/lib/format'

import { ClientFormDialog } from './ClientFormDialog'

export default function ClientsPage() {
  const { isAdmin } = useTenant()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [activos, setActivos] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [nuevo, setNuevo] = useState(false)
  const search = useDebounce(texto)
  const clientes = useClients({ search, active: activos, page: pagina, size: 20 })
  const lista = clientes.data?.content ?? []

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Busca por nombre, teléfono o email."
        actions={
          <Button onClick={() => setNuevo(true)}>
            <Plus /> Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar cliente…"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setPagina(0)
            }}
            aria-label="Buscar cliente"
          />
        </div>
        {isAdmin && (
          <Tabs
            value={activos ? 'activos' : 'archivados'}
            onValueChange={(v) => {
              setActivos(v === 'activos')
              setPagina(0)
            }}
          >
            <TabsList>
              <TabsTrigger value="activos">Activos</TabsTrigger>
              <TabsTrigger value="archivados">Archivados</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {clientes.isPending ? (
            <Loading />
          ) : clientes.isError ? (
            <ErrorState error={clientes.error} onRetry={() => clientes.refetch()} />
          ) : lista.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={search ? 'No hay clientes con esa búsqueda' : activos ? 'Aún no hay clientes' : 'No hay clientes archivados'}
                description={!search && activos ? 'También puedes darlos de alta al crear una cita.' : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Cliente desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/app/clients/${c.id}`)}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.email ?? '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{c.createdAt ? fecha(c.createdAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pagination page={clientes.data} onChange={setPagina} />

      <ClientFormDialog open={nuevo} onClose={() => setNuevo(false)} onSaved={(c) => navigate(`/app/clients/${c.id}`)} />
    </>
  )
}
