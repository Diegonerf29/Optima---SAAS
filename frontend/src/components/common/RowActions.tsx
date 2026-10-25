import { Archive, ArchiveRestore, Pencil } from 'lucide-react'

import { ConfirmButton } from '@/components/common/ConfirmButton'
import { Button } from '@/components/ui/button'

/** botones de editar y archivar/reactivar de una fila */
export function RowActions({
  active,
  what,
  onEdit,
  onArchive,
  onReactivate,
}: {
  active: boolean
  what: string // "el servicio", "la categoría"...
  onEdit?: () => void
  onArchive: () => void
  onReactivate: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      {active && onEdit && (
        <Button variant="ghost" size="icon" aria-label="Editar" onClick={onEdit}>
          <Pencil />
        </Button>
      )}
      {active ? (
        <ConfirmButton
          trigger={
            <Button variant="ghost" size="icon" aria-label="Archivar">
              <Archive />
            </Button>
          }
          title={`¿Archivar ${what}?`}
          description="Dejará de aparecer al crear citas, pero no se borra: puedes reactivarlo cuando quieras."
          confirmLabel="Archivar"
          onConfirm={onArchive}
        />
      ) : (
        <Button variant="ghost" size="icon" aria-label="Reactivar" onClick={onReactivate}>
          <ArchiveRestore />
        </Button>
      )}
    </div>
  )
}
