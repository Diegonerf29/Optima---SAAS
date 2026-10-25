import { Clock } from 'lucide-react'
import { Link } from 'react-router'

import type { Billing } from '@/api/types'
import { useTenant } from '@/auth/context'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { avisarFinDePrueba, diasDePrueba } from './billing'

/** aviso de que la prueba gratis se acaba en pocos dias */
export function TrialBanner({ billing }: { billing: Billing }) {
  const { isAdmin } = useTenant()
  if (!avisarFinDePrueba(billing)) return null
  const dias = diasDePrueba(billing)
  const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`
  return (
    <Alert className="mb-4">
      <Clock />
      <AlertDescription className="flex flex-wrap items-center gap-x-2 text-foreground">
        La prueba gratis termina {cuando}.
        {isAdmin ? (
          <Link to="/app/settings?tab=suscripcion" className="font-medium underline">
            Suscribirme
          </Link>
        ) : (
          <span>Avisa a la persona que administra el negocio.</span>
        )}
      </AlertDescription>
    </Alert>
  )
}
