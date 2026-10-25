import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { useTenant } from '@/auth/context'
import { saveSession } from '@/auth/session'
import { Field } from '@/components/common/Field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** borra el negocio y todos sus datos para siempre (pide la contraseña y una confirmacion) */
export function EraseBusinessDialog({ businessName }: { businessName?: string }) {
  const { businessId } = useTenant()
  const [abierto, setAbierto] = useState(false)
  const [password, setPassword] = useState('')
  const [entendido, setEntendido] = useState(false)

  const borrar = useMutation({
    mutationFn: () => unwrap(api.POST('/api/businesses/{businessId}/erase', { params: { path: { businessId } }, body: { password } })),
    onSuccess: () => {
      // se sale con una recarga completa de la portada: asi no queda nada del negocio en memoria
      // (y la pantalla protegida no llega a mandar al login al cerrarse la sesion)
      saveSession(null)
      window.location.replace('/?negocio-borrado=1')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o)
        setPassword('')
        setEntendido(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 /> Borrar el negocio para siempre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            borrar.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>¿Borrar {businessName ?? 'el negocio'}?</DialogTitle>
            <DialogDescription>
              Se borran para siempre las citas, los clientes, el catálogo y el equipo de este negocio. No se puede deshacer: si quieres
              conservar algo, descarga antes los datos.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={entendido} onCheckedChange={(v) => setEntendido(v === true)} className="mt-0.5" />
            Entiendo que no se puede recuperar
          </label>
          <Field label="Tu contraseña" htmlFor="erase-password">
            <Input
              id="erase-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!entendido || !password || borrar.isPending}>
              {borrar.isPending ? 'Borrando…' : 'Borrar para siempre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
