import { BellRing, CalendarDays, Check, Euro, Smartphone, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PublicLayout } from '@/features/public/PublicLayout'
import { PLAN } from '@/lib/plan'

const VENTAJAS = [
  {
    icon: CalendarDays,
    titulo: 'Agenda por profesional',
    texto: 'Una columna por cada persona del equipo. Huecos libres calculados con horarios, ausencias y cabinas.',
  },
  {
    icon: BellRing,
    titulo: 'Recordatorios automáticos',
    texto: 'Tus clientes reciben la confirmación y un recordatorio el día antes. Menos citas a las que nadie viene.',
  },
  {
    icon: Euro,
    titulo: 'Cobros claros',
    texto: 'Quién cobró, cuándo y cómo: efectivo, tarjeta o Bizum. La caja del día, sin hojas de cálculo.',
  },
  {
    icon: Users,
    titulo: 'Clientes y equipo',
    texto: 'Ficha de cada cliente con su historial. Horarios, vacaciones y permisos de tu equipo.',
  },
  {
    icon: Smartphone,
    titulo: 'En el PC y en el móvil',
    texto: 'Pensada para el ordenador de recepción y cómoda para consultar la agenda desde el móvil.',
  },
]

export default function LandingPage() {
  const [params] = useSearchParams()
  return (
    <PublicLayout>
      {params.get('negocio-borrado') === '1' && (
        <Alert className="mx-auto mt-6 max-w-3xl">
          <AlertDescription>Tu negocio y todos sus datos se han borrado. Gracias por haber usado Optima.</AlertDescription>
        </Alert>
      )}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">La agenda de tu local, sin complicaciones</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Optima es la agenda online para peluquerías, centros de estética, barberías y locales pequeños. Citas, clientes, equipo y cobros
          en un solo sitio.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/register">Crear mi negocio gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">14 días de prueba · sin tarjeta</p>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {VENTAJAS.map((v) => (
            <Card key={v.titulo}>
              <CardContent className="grid gap-2">
                <v.icon className="size-6 text-primary" />
                <h2 className="font-semibold">{v.titulo}</h2>
                <p className="text-sm text-muted-foreground">{v.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold">Un precio sencillo</h2>
        <p className="mt-2 text-muted-foreground">Un único plan con todo incluido para tu local.</p>
        <p className="mt-6">
          <span className="text-4xl font-bold">{PLAN.precio}</span> <span className="text-muted-foreground">{PLAN.periodo}</span>
        </p>
        <p className="text-sm text-muted-foreground">Los primeros {PLAN.diasPrueba} días, gratis y sin tarjeta. Cancela cuando quieras.</p>
        <ul className="mx-auto mt-6 grid max-w-sm gap-2 text-left text-sm">
          {[
            'Agenda y clientes ilimitados',
            'Todo tu equipo incluido',
            'Emails de confirmación y recordatorio',
            'Copias de seguridad diarias',
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="size-4 text-success" /> {t}
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="mt-8">
          <Link to="/register">Empezar la prueba gratuita</Link>
        </Button>
      </section>
    </PublicLayout>
  )
}
