import { AlertTriangle } from 'lucide-react'
import { Navigate, useParams } from 'react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { PublicLayout } from '@/features/public/PublicLayout'

/*
 * PLANTILLAS de los textos legales. Los datos entre [CORCHETES] los tiene que completar
 * el titular de Optima y conviene que un profesional los revise antes de lanzar (plan.md, paso 10.1)
 */
type Seccion = { titulo: string; parrafos: string[] }
type Documento = { titulo: string; secciones: Seccion[] }

const TITULAR = '[NOMBRE O RAZÓN SOCIAL], con NIF [NIF] y domicilio en [DIRECCIÓN]. Contacto: [EMAIL DE CONTACTO]'

const DOCUMENTOS: Record<string, Documento> = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    secciones: [
      { titulo: 'Titular del sitio', parrafos: [`Este sitio web y la aplicación Optima son propiedad de ${TITULAR}.`] },
      {
        titulo: 'Objeto',
        parrafos: ['Optima es un servicio online de agenda y gestión de citas para negocios. El acceso a la aplicación requiere registro.'],
      },
      {
        titulo: 'Propiedad intelectual',
        parrafos: [
          'Los contenidos, el diseño y el código de Optima pertenecen a su titular. No se permite su reproducción sin autorización.',
        ],
      },
      {
        titulo: 'Legislación aplicable',
        parrafos: [
          'Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados de [CIUDAD].',
        ],
      },
    ],
  },
  privacidad: {
    titulo: 'Política de privacidad',
    secciones: [
      { titulo: 'Responsable', parrafos: [`El responsable del tratamiento de los datos de las cuentas de Optima es ${TITULAR}.`] },
      {
        titulo: 'Qué datos tratamos y para qué',
        parrafos: [
          'Datos de las personas usuarias (nombre, email, teléfono y contraseña cifrada) para prestar el servicio, gestionar el acceso y enviar los avisos necesarios: confirmación de email, recuperación de contraseña e invitaciones.',
          'Datos de los clientes de cada negocio (nombre, contacto, notas y citas). Sobre estos datos el responsable es cada negocio; Optima actúa como encargado del tratamiento y solo los trata para prestar el servicio.',
        ],
      },
      {
        titulo: 'Base legal',
        parrafos: ['La ejecución del contrato de servicio y, en su caso, el cumplimiento de obligaciones legales.'],
      },
      {
        titulo: 'Conservación',
        parrafos: ['Mientras la cuenta esté activa y, después, el tiempo necesario para atender posibles responsabilidades legales.'],
      },
      {
        titulo: 'Destinatarios',
        parrafos: [
          'Proveedores necesarios para prestar el servicio: alojamiento ([PROVEEDOR DE HOSTING], en la Unión Europea), envío de correo ([PROVEEDOR DE EMAIL]) y, si se contrata, pago ([PASARELA DE PAGO]). No se venden datos a terceros.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a [EMAIL DE CONTACTO]. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
        ],
      },
    ],
  },
  condiciones: {
    titulo: 'Condiciones de uso',
    secciones: [
      {
        titulo: 'El servicio',
        parrafos: [`Optima es un servicio prestado por ${TITULAR}. Al crear una cuenta aceptas estas condiciones.`],
      },
      {
        titulo: 'Cuenta y seguridad',
        parrafos: [
          'Eres responsable de mantener tu contraseña en secreto y del uso que se haga de tu cuenta. Avísanos si sospechas un acceso no autorizado.',
        ],
      },
      {
        titulo: 'Prueba y suscripción',
        parrafos: [
          'Los negocios disponen de un periodo de prueba gratuito. Después, el uso requiere una suscripción de pago según los precios publicados. Puedes cancelarla cuando quieras.',
        ],
      },
      {
        titulo: 'Datos de tus clientes (encargo del tratamiento)',
        parrafos: [
          'El negocio es responsable de los datos de sus clientes. Optima los trata solo por cuenta del negocio y para prestar el servicio, aplica medidas de seguridad adecuadas y no los usa para fines propios. Al terminar el servicio, el negocio puede pedir la exportación o el borrado de sus datos.',
        ],
      },
      {
        titulo: 'Uso aceptable',
        parrafos: ['No se permite usar Optima para enviar comunicaciones no deseadas ni para actividades ilegales.'],
      },
      {
        titulo: 'Responsabilidad',
        parrafos: [
          'Optima se presta con la mayor diligencia, con copias de seguridad diarias, pero no garantiza un funcionamiento ininterrumpido.',
        ],
      },
    ],
  },
  cookies: {
    titulo: 'Política de cookies',
    secciones: [
      {
        titulo: 'Qué usamos',
        parrafos: [
          'Optima no usa cookies de publicidad ni de analítica. Solo guarda en tu navegador la sesión iniciada (almacenamiento de sesión, que se borra al cerrar el navegador). Es imprescindible para que la aplicación funcione y por eso no requiere consentimiento.',
        ],
      },
    ],
  },
}

export default function LegalPage() {
  const { pagina } = useParams()
  const doc = pagina ? DOCUMENTOS[pagina] : undefined
  if (!doc) return <Navigate to="/" replace />
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">{doc.titulo}</h1>
        <Alert variant="warning" className="mt-6">
          <AlertTriangle />
          <AlertDescription className="text-foreground">
            Borrador: los datos entre corchetes están pendientes de completar.
          </AlertDescription>
        </Alert>
        {doc.secciones.map((s) => (
          <section key={s.titulo} className="mt-8">
            <h2 className="text-lg font-semibold">{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p} className="mt-2 leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </PublicLayout>
  )
}
