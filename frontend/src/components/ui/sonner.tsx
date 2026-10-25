import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** avisos breves en una esquina: toast.success('Cita creada') */
function Toaster(props: ToasterProps) {
  return <Sonner position="top-right" richColors closeButton {...props} />
}

export { Toaster }
