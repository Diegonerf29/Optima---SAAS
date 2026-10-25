import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Download, Home, LogOut, Mail, Menu, Scissors, Settings, ShieldOff, UserCog, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useBilling, useBusiness, useMe } from '@/api/queries'
import { useAuth, useTenant } from '@/auth/context'
import { Loading } from '@/components/common/States'
import { Logo } from '@/components/layout/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SubscriptionBlocked } from '@/features/billing/SubscriptionBlocked'
import { EraseBusinessDialog } from '@/features/privacy/EraseBusinessDialog'
import { useBusinessExport } from '@/features/privacy/useBusinessExport'
import { TrialBanner } from '@/features/billing/TrialBanner'
import { iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; adminOnly?: boolean }

const NAV: NavItem[] = [
  { to: '/app', label: 'Inicio', icon: Home, end: true },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/clients', label: 'Clientes', icon: Users },
  { to: '/app/catalog', label: 'Catálogo', icon: Scissors },
  { to: '/app/team', label: 'Equipo', icon: UserCog },
  { to: '/app/settings', label: 'Configuración', icon: Settings, adminOnly: true },
]

function Navegacion({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useTenant()
  return (
    <nav className="grid gap-1" aria-label="Principal">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function MenuUsuario() {
  const { session, logout, logoutEverywhere } = useAuth()
  const me = useMe()
  const navigate = useNavigate()
  const varios = (session?.businesses.length ?? 0) > 1
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Menú de usuario">
          <Avatar>
            <AvatarFallback>{iniciales(me.data?.fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:inline">{me.data?.fullName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.data?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/app/profile')}>
          <UserRound /> Mi perfil
        </DropdownMenuItem>
        {varios && (
          <DropdownMenuItem onSelect={() => navigate('/select-business')}>
            <CalendarDays /> Cambiar de negocio
          </DropdownMenuItem>
        )}
        {(session?.pendingInvitations ?? 0) > 0 && (
          <DropdownMenuItem onSelect={() => navigate('/invitations')}>
            <Mail /> Invitaciones
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => void logoutEverywhere()}>
          <ShieldOff /> Cerrar sesión en todos los dispositivos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** aviso mientras el email no este confirmado */
function AvisoEmail() {
  const me = useMe()
  const reenviar = useMutation({
    mutationFn: () => unwrap(api.POST('/api/auth/verify-email/resend')),
    onSuccess: () => toast.success('Te hemos enviado otro enlace'),
    onError: (e) => toast.error(errorMessage(e)),
  })
  if (me.data?.emailVerified !== false) return null
  return (
    <Alert variant="warning" className="mb-4">
      <Mail />
      <AlertDescription className="flex flex-wrap items-center gap-x-2 text-foreground">
        Confirma tu email con el enlace que te enviamos.
        <button type="button" className="font-medium underline" disabled={reenviar.isPending} onClick={() => reenviar.mutate()}>
          Reenviar enlace
        </button>
      </AlertDescription>
    </Alert>
  )
}

/** negocio desactivado: solo un ADMIN llega aqui y puede reactivarlo, descargar sus datos o borrarlo */
function NegocioDesactivado({ nombre }: { nombre?: string }) {
  const { businessId } = useTenant()
  const exportar = useBusinessExport()
  const queryClient = useQueryClient()
  const reactivar = useMutation({
    mutationFn: () => unwrap(api.PATCH('/api/businesses/{id}/reactivate', { params: { path: { id: businessId } } })),
    onSuccess: () => {
      toast.success('Negocio reactivado')
      void queryClient.invalidateQueries({ queryKey: keys.business(businessId) })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <ShieldOff className="mx-auto size-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Este negocio está desactivado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mientras esté desactivado nadie del equipo puede usar la agenda. Puedes reactivarlo cuando quieras.
      </p>
      <Button className="mt-6" disabled={reactivar.isPending} onClick={() => reactivar.mutate()}>
        Reactivar negocio
      </Button>
      <div className="mt-10 grid justify-center gap-2 border-t pt-6">
        <p className="text-sm text-muted-foreground">¿Te vas de Optima?</p>
        <Button variant="outline" disabled={exportar.isPending} onClick={() => exportar.mutate()}>
          <Download /> Descargar todos los datos
        </Button>
        <EraseBusinessDialog businessName={nombre} />
      </div>
    </div>
  )
}

/** contenido de la pagina segun el estado del negocio y de su suscripcion */
function Contenido() {
  const business = useBusiness()
  const billing = useBilling()
  if (business.isPending || billing.isPending) return <Loading />
  if (business.data?.isActive === false) return <NegocioDesactivado nombre={business.data.name} />
  const b = billing.data
  if (b?.enabled && !b.hasAccess) return <SubscriptionBlocked trialEnded={b.status === 'TRIALING'} />
  return (
    <>
      {b && <TrialBanner billing={b} />}
      <Outlet />
    </>
  )
}

export default function AppLayout() {
  const business = useBusiness()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* menu lateral en escritorio */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Logo />
        <Navegacion />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          {/* menu en movil */}
          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <Logo className="mb-6" />
              <Navegacion onNavigate={() => setMenuAbierto(false)} />
            </SheetContent>
          </Sheet>
          <span className="truncate font-medium">{business.data?.name}</span>
          <div className="ml-auto">
            <MenuUsuario />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <AvisoEmail />
          <Contenido />
        </main>
      </div>
    </div>
  )
}
