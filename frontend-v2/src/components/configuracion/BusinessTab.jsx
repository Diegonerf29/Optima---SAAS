// pestana de configuracion: BusinessTab
import { useEffect, useState } from 'react'
import { Trash2, Save, MapPin, Mail, Phone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, INPUT_SANITIZE } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api, { getErrorMessage } from '@/lib/api'
import { CARD, fmtSinceShort, isEmail } from './configShared'

/** Pestana de datos generales del negocio */
export function BusinessTab({ bId, isAdmin }) {
  const toast = useToast()
  const [biz, setBiz]   = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [reload, setReload]   = useState(0)
  const [dangerOpen, setDangerOpen]     = useState(false)
  const [dangerSaving, setDangerSaving] = useState(false)

  const refresh = () => setReload((v) => v + 1)

  useEffect(() => {
    if (!bId) return
    let cancelled = false
    setLoading(true)
    api.get(`/api/businesses/${bId}`)
      .then((r) => {
        if (cancelled) return
        const b = r.data
        setBiz(b)
        setForm({
          name: b.name || '', email: b.email || '', phone: b.phone || '',
          address: b.address || '', city: b.city || '', state: b.state || '',
          country: b.country || '', postalCode: b.postalCode || '',
          appointmentInterval: String(b.appointmentInterval || 30),
        })
      })
      .catch((err) => toast({ type: 'error', message: getErrorMessage(err, 'No se pudieron cargar los datos del negocio.') }))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bId, toast, reload])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim())  { toast({ type: 'error', message: 'El nombre del negocio es obligatorio.' }); return }
    if (!form.email.trim()) { toast({ type: 'error', message: 'El email del negocio es obligatorio.' }); return }
    if (!isEmail(form.email)) { toast({ type: 'error', message: 'Formato de email no válido.' }); return }
    setSaving(true)
    try {
      const { data } = await api.put(`/api/businesses/${bId}`, {
        ...form,
        appointmentInterval: Number(form.appointmentInterval),
      })
      setBiz(data)
      toast({ type: 'success', message: 'Datos del negocio actualizados.' })
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo guardar.') })
    } finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    setDangerSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}`)
      toast({ type: 'success', message: 'El negocio se ha dado de baja.' })
      setDangerOpen(false)
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo dar de baja el negocio.') })
    } finally { setDangerSaving(false) }
  }

  const handleReactivate = async () => {
    setDangerSaving(true)
    try {
      const { data } = await api.patch(`/api/businesses/${bId}/reactivate`)
      setBiz(data)
      toast({ type: 'success', message: 'El negocio se ha reactivado.' })
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo reactivar el negocio.') })
    } finally { setDangerSaving(false) }
  }

  if (loading || !form) {
    return <div className={`${CARD} p-6 space-y-4`}>{[...Array(5)].map((_, i) => <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />)}</div>
  }

  const mapsHref = biz?.latitude != null && biz?.longitude != null
    ? `https://www.google.com/maps?q=${biz.latitude},${biz.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([biz?.address, biz?.city, biz?.country].filter(Boolean).join(', '))}`

  return (
    <div className="space-y-5 max-w-5xl">
      {!biz.isActive && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-amber-800 font-medium flex-1 min-w-[220px]">
            Este negocio está <strong>dado de baja</strong>. Reactívalo para volver a operar con normalidad.
          </p>
          {isAdmin && <Button onClick={handleReactivate} loading={dangerSaving} size="sm">Reactivar negocio</Button>}
        </div>
      )}

      <div className={`${CARD} p-4 flex flex-wrap items-center gap-3`}>
        <a href={`mailto:${biz.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition truncate max-w-full">
          <Mail size={12} /> {biz.email}
        </a>
        {biz.phone && (
          <a href={`tel:${biz.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-xs font-medium font-mono px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition">
            <Phone size={12} /> {biz.phone}
          </a>
        )}
        {(biz.address || biz.city) && (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 transition truncate">
            <MapPin size={12} /> Ver en mapa <ExternalLink size={11} />
          </a>
        )}
        <span className="ml-auto text-[11px] text-slate-400 inline-flex items-center gap-1">
          Creado {fmtSinceShort(biz.createdAt)}
        </span>
      </div>

      <div className={`${CARD} p-6 space-y-6`}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nombre *" value={form.name} onChange={(e) => set('name', e.target.value)} disabled={!isAdmin} maxLength={150} />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={!isAdmin} maxLength={150} />
          <Input label="Teléfono" value={form.phone} onChange={(e) => set('phone', e.target.value)} disabled={!isAdmin} sanitize={INPUT_SANITIZE.PHONE} inputMode="tel" maxLength={20} />
          <Select
            label="Intervalo entre citas"
            value={form.appointmentInterval}
            onChange={(e) => set('appointmentInterval', e.target.value)}
            disabled={!isAdmin}
          >
            {[15, 30, 45, 60].map((v) => <option key={v} value={v}>{v} minutos</option>)}
          </Select>
        </div>

        <div>
          <Input label="Identificador (slug)" value={biz?.slug || ''} disabled maxLength={150} />
          <p className="text-[11px] text-slate-400 mt-1.5">El identificador se fija al crear el negocio y no se puede cambiar.</p>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ubicación</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Dirección" value={form.address} onChange={(e) => set('address', e.target.value)} disabled={!isAdmin} maxLength={255} />
            <Input label="Ciudad" value={form.city} onChange={(e) => set('city', e.target.value)} disabled={!isAdmin} maxLength={100} />
            <Input label="Código postal" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} disabled={!isAdmin} sanitize={INPUT_SANITIZE.DIGITS_ONLY} inputMode="numeric" maxLength={10} />
            <Input label="Provincia / Estado" value={form.state} onChange={(e) => set('state', e.target.value)} disabled={!isAdmin} maxLength={100} />
            <Input label="País" value={form.country} onChange={(e) => set('country', e.target.value)} disabled={!isAdmin} maxLength={100} />
          </div>
          {biz?.latitude != null && biz?.longitude != null && (
            <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
              <MapPin size={11} /> Coordenadas {biz.latitude}, {biz.longitude} — resueltas automáticamente desde la dirección.
            </p>
          )}
        </div>

        {isAdmin ? (
          <div className="pt-1">
            <Button onClick={handleSave} loading={saving} className="gap-2"><Save size={16} /> Guardar cambios</Button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Solo un administrador puede modificar estos datos.</p>
        )}
      </div>

      {isAdmin && biz.isActive && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <p className="text-sm font-bold text-red-700">Zona de peligro</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Dar de baja el negocio lo desactiva: nadie podrá iniciar sesión ni operar con él hasta reactivarlo.</p>
          <Button variant="outline-danger" size="sm" onClick={() => setDangerOpen(true)} className="gap-2">
            <Trash2 size={14} /> Dar de baja el negocio
          </Button>
        </div>
      )}

      <Modal open={dangerOpen} onClose={() => setDangerOpen(false)} title="Dar de baja el negocio" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-4">
            <Trash2 size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-snug">¿Seguro que quieres dar de baja <strong>{biz?.name}</strong>? Podrás reactivarlo después desde esta misma pantalla.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDangerOpen(false)} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleDeactivate} loading={dangerSaving} className="flex-1">Dar de baja</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

