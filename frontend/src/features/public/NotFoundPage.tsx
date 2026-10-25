import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/features/public/PublicLayout'

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-5xl font-bold text-muted-foreground">404</p>
        <h1 className="mt-4 text-xl font-semibold">Esta página no existe</h1>
        <Button asChild className="mt-6">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </PublicLayout>
  )
}
