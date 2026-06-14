// pestana de configuracion: HoursTab
import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api, { getErrorMessage } from '@/lib/api'
import { DAYS, CARD, emptyHour } from './configShared'
import { SectionHint } from './configWidgets'

/** Pestana del horario semanal de apertura del negocio */
export function HoursTab({ bId, isAdmin }) {
  const toast = useToast()
  const [hours, setHours] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!bId) return
    let cancelled = false
    setLoading(true)
    api.get(`/api/businesses/${bId}/hours`)
      .then((r) => { if (!cancelled) setHours([...r.data].sort((a, b) => a.dayOfWeek - b.dayOfWeek)) })
      .catch((err) => {
        if (cancelled) return
        toast({ type: 'error', message: getErrorMessage(err, 'No se pudieron cargar los horarios.') })
        setHours([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bId, reload, toast])

  const refresh = () => setReload((v) => v + 1)

  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyHour)
  const [saving, setSaving]     = useState(false)

  const closeModal = () => { setModal(null); setSelected(null) }
  const openCreate = () => { setForm(emptyHour); setSelected(null); setModal('create') }
  const openEdit = (h) => {
    setSelected(h)
    setForm({
      dayOfWeek: String(h.dayOfWeek),
      startTime: h.startTime?.slice(0, 5) || '09:00',
      endTime:   h.endTime?.slice(0, 5) || '18:00',
      isClosed:  h.isClosed,
    })
    setModal('edit')
  }
  const openDelete = (h) => { setSelected(h); setModal('delete') }

  const handleSave = async () => {
    if (!form.isClosed && form.startTime >= form.endTime) {
      toast({ type: 'error', message: 'La hora de cierre debe ser posterior a la de apertura.' }); return
    }
    setSaving(true)
    try {
      const payload = {
        dayOfWeek: Number(form.dayOfWeek),
        isClosed:  form.isClosed,
        startTime: form.isClosed ? null : `${form.startTime}:00`,
        endTime:   form.isClosed ? null : `${form.endTime}:00`,
      }
      if (modal === 'create') {
        await api.post(`/api/businesses/${bId}/hours`, payload)
        toast({ type: 'success', message: 'Tramo horario añadido.' })
      } else {
        await api.put(`/api/businesses/${bId}/hours/${selected.id}`, payload)
        toast({ type: 'success', message: 'Tramo horario actualizado.' })
      }
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo guardar el horario.') })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/hours/${selected.id}`)
      toast({ type: 'success', message: 'Tramo horario eliminado.' })
      closeModal(); refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo eliminar el horario.') })
    } finally { setSaving(false) }
  }

  // Quick action: clona los tramos del lunes en Mar-Vie Sobrescribe: borra
  // antes los tramos de cada dia y crea los del lunes (turno partido se copia
  // completo) DELETE antes que POST porque el servidor valida solape al crear
  // (409) Mismo patron que EmpleadoshandleCopyMonToWeek
  const handleCopyMonToFriday = async () => {
    const all = hours ?? []
    const mondayTramos = all.filter((h) => h.dayOfWeek === 1 && !h.isClosed)
    if (mondayTramos.length === 0) {
      toast({ type: 'error', message: 'Configura primero el horario del lunes.' }); return
    }
    setSaving(true)
    try {
      for (let d = 2; d <= 5; d++) {
        for (const existing of all.filter((h) => h.dayOfWeek === d)) {
          await api.delete(`/api/businesses/${bId}/hours/${existing.id}`)
        }
        for (const m of mondayTramos) {
          await api.post(`/api/businesses/${bId}/hours`, {
            dayOfWeek: d,
            isClosed: false,
            startTime: m.startTime,
            endTime: m.endTime,
          })
        }
      }
      toast({ type: 'success', message: 'Horario del lunes copiado a martes–viernes.' })
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo copiar el horario.') })
      refresh()
    } finally { setSaving(false) }
  }

  // Marca el fin de semana como cerrado
  const handleCloseWeekend = async () => {
    const all = hours ?? []
    setSaving(true)
    try {
      for (let d = 6; d <= 7; d++) {
        for (const existing of all.filter((h) => h.dayOfWeek === d)) {
          await api.delete(`/api/businesses/${bId}/hours/${existing.id}`)
        }
        await api.post(`/api/businesses/${bId}/hours`, {
          dayOfWeek: d, isClosed: true, startTime: null, endTime: null,
        })
      }
      toast({ type: 'success', message: 'Fin de semana marcado como cerrado.' })
      refresh()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo actualizar.') })
      refresh()
    } finally { setSaving(false) }
  }

  // Total weekly hours
  const totalWeekly = useMemo(() => {
    if (!hours) return 0
    return hours.reduce((acc, h) => {
      if (h.isClosed || !h.startTime || !h.endTime) return acc
      const ms = new Date(`1970-01-01T${h.endTime}`) - new Date(`1970-01-01T${h.startTime}`)
      return acc + ms / 3600000
    }, 0)
  }, [hours])

  // Rango visual de la rejilla, adaptativo al horario realmente
  // configurado Si el negocio abre 2:00-22:00 la barra ya no se
  // calcula sobre 8-22 (lo que producia width > 100% y desbordaba la
  // tarjeta) sino sobre 2-22 Defaults 8-22 si no hay nada que pintar
  // Cap defensivo [0, 24] por si alguna fila tiene una hora rara
  const { DAY_START, DAY_END } = useMemo(() => {
    let minH = 24, maxH = 0
    ;(hours ?? []).forEach((h) => {
      if (h.isClosed || !h.startTime || !h.endTime) return
      const [sh, sm] = h.startTime.slice(0, 5).split(':').map(Number)
      const [eh, em] = h.endTime.slice(0, 5).split(':').map(Number)
      const s = sh + sm / 60
      const e = eh + em / 60
      if (s < minH) minH = s
      if (e > maxH) maxH = e
    })
    if (minH === 24 || maxH === 0) return { DAY_START: 8, DAY_END: 22 }
    return {
      DAY_START: Math.max(0, Math.floor(minH)),
      DAY_END: Math.min(24, Math.ceil(maxH)),
    }
  }, [hours])
  const total = DAY_END - DAY_START

  return (
    <div>
      <SectionHint title="¿Cómo funciona el horario del negocio?">
        Define a qué hora abre y cierra cada día. El calendario respeta
        este horario en toda la aplicación: pinta gris los huecos fuera
        de horario y no permite crear citas ahí. Admite turno partido
        (mañana y tarde): añade dos tramos en el mismo día.
      </SectionHint>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        {isAdmin && (
          <>
            <button onClick={handleCopyMonToFriday} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition disabled:opacity-40">Copiar L → V</button>
            <button onClick={handleCloseWeekend} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 transition disabled:opacity-40">Fin de semana cerrado</button>
          </>
        )}
        <span className="ml-auto text-xs text-slate-500"><strong className="text-[#1e3a5f] tabular-nums">{totalWeekly.toFixed(0)} h</strong> semanales</span>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2" size="sm"><Plus size={14} /> Añadir tramo</Button>
        )}
      </div>

      {loading ? (
        <div className={`${CARD} p-5 space-y-2`}>{[...Array(7)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-md animate-pulse" />)}</div>
      ) : (
        <div className={`${CARD} p-5`}>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].flatMap((d) => {
              const dayHours = (hours ?? [])
                .filter((hh) => hh.dayOfWeek === d)
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
              if (dayHours.length === 0) {
                return [{ key: `empty-${d}`, h: null, day: d, isFirstOfDay: true }]
              }
              return dayHours.map((hh, idx) => ({
                key: `h-${hh.id}`,
                h: hh,
                day: d,
                isFirstOfDay: idx === 0,
              }))
            }).map(({ key, h, day, isFirstOfDay }) => {
              const isToday = (new Date().getDay() === 0 ? 7 : new Date().getDay()) === day
              let bar
              if (h && !h.isClosed && h.startTime && h.endTime) {
                const [sh, sm] = h.startTime.slice(0, 5).split(':').map(Number)
                const [eh, em] = h.endTime.slice(0, 5).split(':').map(Number)
                const startH = sh + sm / 60 - DAY_START
                const endH   = eh + em / 60 - DAY_START
                const left   = Math.max(0, (startH / total) * 100)
                const width  = Math.max(2, ((endH - startH) / total) * 100)
                bar = (
                  <div
                    className="absolute inset-y-1 rounded-md flex items-center px-2 text-[10px] font-semibold text-white"
                    style={{ left: `${left}%`, width: `${width}%`, background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)' }}
                  >
                    {h.startTime.slice(0, 5)} – {h.endTime.slice(0, 5)}
                  </div>
                )
              } else if (h && h.isClosed) {
                bar = <div className="absolute inset-y-2 left-1 right-1 rounded-md bg-slate-50 text-[10px] font-medium text-slate-400 flex items-center justify-center">Cerrado</div>
              } else {
                bar = <div className="absolute inset-y-2 left-1 right-1 rounded-md border border-dashed border-slate-200 text-[10px] font-medium text-slate-400 flex items-center justify-center">Sin configurar</div>
              }
              return (
                <div key={key} className="grid grid-cols-[80px_1fr_64px] items-center gap-2">
                  <div className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-[#1e3a5f]'}`}>
                    {isFirstOfDay ? DAYS[day] : ''}
                  </div>
                  <div className="relative h-8 rounded-md bg-slate-50 border border-slate-100">{bar}</div>
                  <div className="flex gap-0.5 justify-end">
                    {h && isAdmin && (
                      <>
                        <button onClick={() => openEdit(h)} className="rounded p-1 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition" title="Editar"><Pencil size={12} /></button>
                        <button onClick={() => openDelete(h)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition" title="Eliminar"><Trash2 size={12} /></button>
                      </>
                    )}
                    {!h && isAdmin && (
                      <button onClick={() => { setForm({ ...emptyHour, dayOfWeek: String(day) }); setModal('create') }} className="rounded p-1 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition" title="Añadir"><Plus size={12} /></button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-[80px_1fr_64px] gap-2 mt-3">
            <div />
            <div className="flex justify-between text-[10px] text-slate-400 px-1 font-mono">
              {Array.from({ length: Math.floor(total / 2) + 1 }, (_, i) => (
                <span key={i}>{String(DAY_START + i * 2).padStart(2, '0')}</span>
              ))}
            </div>
            <div />
          </div>
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'create' ? 'Nuevo tramo horario' : 'Editar tramo horario'} size="sm">
        <div className="space-y-4">
          <Select label="Día *" value={form.dayOfWeek} onChange={(e) => setForm((p) => ({ ...p, dayOfWeek: e.target.value }))}>
            {DAYS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
          </Select>
          <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isClosed} onChange={(e) => setForm((p) => ({ ...p, isClosed: e.target.checked }))} className="accent-[#1e3a5f] h-4 w-4 rounded" />
            El negocio cierra este día
          </label>
          {!form.isClosed && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Apertura" type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
              <Input label="Cierre" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{modal === 'create' ? 'Añadir' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === 'delete'} onClose={closeModal} title="Eliminar horario" size="sm">
        <p className="text-sm text-slate-600 mb-5">¿Eliminar el horario del <strong>{DAYS[selected?.dayOfWeek]}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving} className="flex-1">Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}

