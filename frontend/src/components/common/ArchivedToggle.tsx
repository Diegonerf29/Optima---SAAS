import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** pestañas "Activos / Archivados" de los listados */
export function ArchivedToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return (
    <Tabs value={active ? 'activos' : 'archivados'} onValueChange={(v) => onChange(v === 'activos')}>
      <TabsList>
        <TabsTrigger value="activos">Activos</TabsTrigger>
        <TabsTrigger value="archivados">Archivados</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
