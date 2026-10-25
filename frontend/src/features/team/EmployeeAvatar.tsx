import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { colorOf, iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'

/** iniciales del empleado sobre su color de la agenda */
export function EmployeeAvatar({
  name,
  color,
  index = 0,
  className,
}: {
  name?: string
  color?: string
  index?: number
  className?: string
}) {
  return (
    <Avatar className={cn('size-10', className)}>
      <AvatarFallback className="text-sm text-white" style={{ backgroundColor: colorOf(color, index) }}>
        {iniciales(name)}
      </AvatarFallback>
    </Avatar>
  )
}
