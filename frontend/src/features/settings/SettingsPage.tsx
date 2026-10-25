import { PartyPopper } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { useBilling } from '@/api/queries'
import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SubscriptionCard } from '@/features/billing/SubscriptionCard'

import { BlocksTab } from './BlocksTab'
import { BoothsTab } from './BoothsTab'
import { BusinessTab } from './BusinessTab'
import { HoursTab } from './HoursTab'

/** configuracion del negocio (solo ADMIN) */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const billing = useBilling()
  const conPagos = billing.data?.enabled === true
  const bienvenida = params.get('bienvenida') === '1'
  const tab = params.get('tab') ?? (bienvenida ? 'horario' : 'negocio')

  return (
    <>
      <PageHeader title="Configuración" description="Datos del negocio, horario, cabinas y días de cierre." />
      {bienvenida && (
        <Alert className="mb-6">
          <PartyPopper />
          <AlertTitle>¡Bienvenido a Optima!</AlertTitle>
          <AlertDescription>
            Empieza poniendo el horario del local. Después crea tus servicios en Catálogo y ya puedes dar citas.
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="negocio">Negocio</TabsTrigger>
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="cabinas">Cabinas</TabsTrigger>
          <TabsTrigger value="bloqueos">Días bloqueados</TabsTrigger>
          {conPagos && <TabsTrigger value="suscripcion">Suscripción</TabsTrigger>}
        </TabsList>
        <TabsContent value="negocio">
          <BusinessTab />
        </TabsContent>
        <TabsContent value="horario">
          <HoursTab />
        </TabsContent>
        <TabsContent value="cabinas">
          <BoothsTab />
        </TabsContent>
        <TabsContent value="bloqueos">
          <BlocksTab />
        </TabsContent>
        {conPagos && (
          <TabsContent value="suscripcion">
            <SubscriptionCard />
          </TabsContent>
        )}
      </Tabs>
    </>
  )
}
