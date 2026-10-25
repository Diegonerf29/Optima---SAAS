import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { api, errorMessage, unwrap } from '@/api/client'
import { keys, useClients } from '@/api/queries'
import type { Client } from '@/api/types'
import { useTenant } from '@/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

/** buscador de clientes con alta rapida ("+ Nuevo cliente") sin salir de la cita */
export function ClientPicker({ value, onChange }: { value: Client | null; onChange: (client: Client) => void }) {
  const { businessId } = useTenant()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState('')
  const [nuevo, setNuevo] = useState<{ fullName: string; phone: string; email: string } | null>(null)
  const busqueda = useDebounce(texto)
  const clientes = useClients({ search: busqueda, size: 8 })

  const crear = useMutation({
    mutationFn: (body: { fullName: string; phone?: string; email?: string }) =>
      unwrap(api.POST('/api/businesses/{businessId}/clients', { params: { path: { businessId } }, body })),
    onSuccess: (cliente) => {
      void queryClient.invalidateQueries({ queryKey: keys.all(businessId, 'clients') })
      onChange(cliente)
      setNuevo(null)
      setOpen(false)
      toast.success('Cliente creado')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setNuevo(null)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={value ? `Cliente: ${value.fullName}` : 'Buscar cliente'}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? value.fullName : 'Buscar cliente por nombre o teléfono'}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        {nuevo ? (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!nuevo.fullName.trim()) return
              crear.mutate({
                fullName: nuevo.fullName.trim(),
                phone: nuevo.phone.trim() || undefined,
                email: nuevo.email.trim() || undefined,
              })
            }}
          >
            <p className="text-sm font-medium">Nuevo cliente</p>
            <Input
              aria-label="Nombre"
              placeholder="Nombre y apellidos"
              value={nuevo.fullName}
              autoFocus
              onChange={(e) => setNuevo({ ...nuevo, fullName: e.target.value })}
            />
            <Input
              aria-label="Teléfono"
              placeholder="Teléfono"
              type="tel"
              value={nuevo.phone}
              onChange={(e) => setNuevo({ ...nuevo, phone: e.target.value })}
            />
            <Input
              aria-label="Email"
              placeholder="Email (para avisos)"
              type="email"
              value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setNuevo(null)}>
                Volver
              </Button>
              <Button type="submit" size="sm" disabled={crear.isPending || !nuevo.fullName.trim()}>
                Crear
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-2">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Escribe para buscar"
                className="pl-8"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <ul className="max-h-60 overflow-y-auto" role="listbox">
              {clientes.data?.content?.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value?.id === c.id}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onChange(c)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn('size-4', value?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{c.fullName}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </button>
                </li>
              ))}
              {clientes.data?.content?.length === 0 && (
                <li className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados</li>
              )}
            </ul>
            <Button type="button" variant="secondary" size="sm" onClick={() => setNuevo({ fullName: texto, phone: '', email: '' })}>
              <Plus /> Nuevo cliente{texto && ` «${texto}»`}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
