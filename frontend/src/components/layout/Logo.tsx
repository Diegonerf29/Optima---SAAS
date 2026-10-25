import { CalendarCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck className="size-4.5" />
      </span>
      Optima
    </span>
  )
}
