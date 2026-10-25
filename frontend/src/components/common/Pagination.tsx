import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Page } from '@/api/types'
import { Button } from '@/components/ui/button'

export function Pagination<T>({ page, onChange }: { page?: Page<T>; onChange: (page: number) => void }) {
  const meta = page?.page
  if (!meta || (meta.totalPages ?? 0) <= 1) return null
  const current = meta.number ?? 0
  const total = meta.totalPages ?? 1
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
      <span>
        {meta.totalElements} resultados · página {current + 1} de {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={current === 0} onClick={() => onChange(current - 1)}>
          <ChevronLeft /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={current + 1 >= total} onClick={() => onChange(current + 1)}>
          Siguiente <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
