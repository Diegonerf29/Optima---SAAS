import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { CategoriesTab } from './CategoriesTab'
import { ServicesTab } from './ServicesTab'
import { TaxesTab } from './TaxesTab'

/** servicios, categorias e impuestos (el empleado solo los ve) */
export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'servicios'

  return (
    <>
      <PageHeader title="Catálogo" description="Lo que ofreces, cuánto dura y cuánto cuesta." />
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
        </TabsList>
        <TabsContent value="servicios">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="impuestos">
          <TaxesTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
