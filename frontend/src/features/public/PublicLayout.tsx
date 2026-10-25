import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useAuth } from '@/auth/context'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'

const ANIO = new Date().getFullYear()
export function PublicLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="Optima, inicio">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <Button asChild>
                <Link to="/app">Ir a mi agenda</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Probar gratis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:justify-between">
          <span>© {ANIO} Optima</span>
          <nav className="flex flex-wrap gap-4">
            <Link to="/legal/aviso-legal" className="hover:underline">
              Aviso legal
            </Link>
            <Link to="/legal/privacidad" className="hover:underline">
              Privacidad
            </Link>
            <Link to="/legal/condiciones" className="hover:underline">
              Condiciones
            </Link>
            <Link to="/legal/cookies" className="hover:underline">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
