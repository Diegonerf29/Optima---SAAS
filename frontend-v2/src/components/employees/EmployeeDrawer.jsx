// panel lateral de empleado: resumen del mes, contacto, horario semanal y ausencias
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Shield, User, Calendar, X, Mail, Phone, Clock, Plus, Pencil, Trash2, ArchiveRestore, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { totalBooked } from '@/lib/format'
import { avatarColor, fmtSinceLong, fmtAbsence, telHref, ymd, todayDow, DAYS_FULL, DAYS_SHORT, emptySchedule, emptyAbsence } from './employeeUtils'

/** panel lateral con detalle del empleado, horario semanal y ausencias */
export function EmployeeDrawer({ emp, bId, isAdmin, archived, onClose, onEditRole, onDeactivate, onReactivate }) {
  const toast = useToast()
  const empUrl = `/api/businesses/${bId}/users/${emp.id}`

  const [schedules, setSchedules] = useState(null)
  const [schedReload, setSchedReload] = useState(0)
  // se carga el horario semanal del empleado
  useEffect(() => {
    api.get(`${empUrl}/schedules`)
      .then((r) => setSchedules(r.data))
      .catch((err) => {
        toast({ type: 'error', message: getErrorMessage(err, 'Error al cargar horarios.') })
        setSchedules([])
      })
  }, [empUrl, schedReload, toast])
  const refreshSchedules = useCallback(() => setSchedReload((v) => v + 1), [])

  const {
    items: absences,
    page: absPage,
    totalPages: absTotalPages,
    totalElements: absTotal,
    loading: absLoading,
    setPage: setAbsPage,
    refresh: refreshAbsences,
  } = usePagedFetch(`${empUrl}/absences`, { size: 10 })

  // se piden las citas del mes del empleado para calcular sus totales
  // el servidor devuelve como mucho 100, de sobra para una persona
  const [kpi, setKpi] = useState(null)
  useEffect(() => {
    const from = ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const to   = ymd(new Date())
    api.get(`/api/businesses/${bId}/appointments`, {
      params: { from, to, membershipId: emp.id, size: 100 },
    })
      .then((r) => {
        const list = r.data.content ?? []
        const considered = list.filter((a) => a.statusName !== 'CANCELLED' && a.statusName !== 'NO_SHOW')
        const citas = considered.length
        const ingresos = considered.reduce((acc, a) => acc + parseFloat(totalBooked(a.bookedServices)), 0)
        const minutos = considered.reduce(
          (acc, a) => acc + (new Date(a.endDateTime) - new Date(a.startDateTime)) / 60000,
          0,
        )
        setKpi({ citas, ingresos, horas: Math.round(minutos / 60) })
      })
      .catch(() => setKpi({ citas: 0, ingresos: 0, horas: 0 }))
  }, [bId, emp.id])

  const dow = todayDow()
  const todaySch = (schedules ?? []).find((s) => s.dayOfWeek === dow)
  const now = new Date()
  const currentAbsence = absences.find(
    (a) => new Date(a.startDateTime) <= now && now <= new Date(a.endDateTime),
  )
  const status = currentAbsence
    ? { kind: 'absent',
        label: `Ausente hasta ${fmtAbsence(currentAbsence.endDateTime)}`,
        cls:   'bg-amber-50 text-amber-700 ring-amber-200',
        dot:   'bg-amber-500' }
    : todaySch
      ? { kind: 'available',
          label: `Disponible · ${todaySch.startTime?.slice(0,5)}–${todaySch.endTime?.slice(0,5)}`,
          cls:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
          dot:   'bg-emerald-500' }
      : { kind: 'off',
          label: 'Descansa hoy',
          cls:   'bg-slate-100 text-slate-600 ring-slate-200',
          dot:   'bg-slate-400' }

  const [scheduleModal, setScheduleModal]   = useState(null) // create | edit | delete | copyweek
  const [absenceModal, setAbsenceModal]     = useState(null)
  const [selectedSch, setSelectedSch]       = useState(null)
  const [selectedAbs, setSelectedAbs]       = useState(null)
  const [scheduleForm, setScheduleForm]     = useState(emptySchedule)
  const [absenceForm, setAbsenceForm]       = useState(emptyAbsence)
  const [savingChild, setSavingChild]       = useState(false)

  const closeSched = () => { setScheduleModal(null); setSelectedSch(null) }
  const closeAbs   = () => { setAbsenceModal(null); setSelectedAbs(null) }

  // abren las ventanas de horario
  const openSchedCreate = () => { setSelectedSch(null); setScheduleForm({ ...emptySchedule, dayOfWeek: String(dow) }); setScheduleModal('create') }
  const openSchedEdit = (s) => {
    setSelectedSch(s)
    setScheduleForm({
      dayOfWeek: String(s.dayOfWeek),
      startTime: s.startTime?.slice(0, 5) || '09:00',
      endTime:   s.endTime?.slice(0, 5)   || '18:00',
    })
    setScheduleModal('edit')
  }
  const openSchedDelete = (s) => { setSelectedSch(s); setScheduleModal('delete') }

  // copia los tramos del lunes al resto de dias laborables
  // borra antes lo que hubiera porque el servidor no admite solapes
  const handleCopyMonToWeek = async () => {
    const all = schedules ?? []
    const mondayTramos = all.filter((s) => s.dayOfWeek === 1)
    if (mondayTramos.length === 0) {
      toast({ type: 'error', message: 'Configura primero el horario del lunes.' })
      return
    }
    setSavingChild(true)
    try {
      for (let d = 2; d <= 5; d++) {
        for (const s of all.filter((x) => x.dayOfWeek === d)) {
          await api.delete(`${empUrl}/schedules/${s.id}`)
        }
        for (const m of mondayTramos) {
          await api.post(`${empUrl}/schedules`, {
            dayOfWeek: d,
            startTime: m.startTime,
            endTime: m.endTime,
          })
        }
      }
      toast({ type: 'success', message: 'Horario del lunes copiado a martes-viernes.' })
      closeSched()
      refreshSchedules()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'No se pudo copiar el horario.') })
      refreshSchedules()
    } finally {
      setSavingChild(false)
    }
  }

  // guarda un tramo de horario nuevo o editado
  const handleSchedSave = async () => {
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      toast({ type: 'error', message: 'La hora de fin debe ser posterior a la de inicio.' }); return
    }
    setSavingChild(true)
    try {
      const payload = {
        dayOfWeek: parseInt(scheduleForm.dayOfWeek, 10),
        startTime: scheduleForm.startTime + ':00',
        endTime:   scheduleForm.endTime + ':00',
      }
      if (scheduleModal === 'create') {
        await api.post(`${empUrl}/schedules`, payload)
        toast({ type: 'success', message: 'Horario añadido.' })
      } else {
        await api.put(`${empUrl}/schedules/${selectedSch.id}`, payload)
        toast({ type: 'success', message: 'Horario actualizado.' })
      }
      closeSched()
      refreshSchedules()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally { setSavingChild(false) }
  }
  // elimina un tramo del horario
  const handleSchedDelete = async () => {
    setSavingChild(true)
    try {
      await api.delete(`${empUrl}/schedules/${selectedSch.id}`)
      toast({ type: 'success', message: 'Horario eliminado.' })
      closeSched()
      refreshSchedules()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al eliminar.') })
    } finally { setSavingChild(false) }
  }

  // abren las ventanas de ausencia
  const openAbsCreate = () => { setSelectedAbs(null); setAbsenceForm(emptyAbsence); setAbsenceModal('create') }
  const openAbsEdit = (a) => {
    setSelectedAbs(a)
    setAbsenceForm({
      startDateTime: a.startDateTime?.slice(0, 16) || '',
      endDateTime:   a.endDateTime?.slice(0, 16)   || '',
      reason:        a.reason || '',
    })
    setAbsenceModal('edit')
  }
  const openAbsDelete = (a) => { setSelectedAbs(a); setAbsenceModal('delete') }
  // guarda una ausencia nueva o editada
  const handleAbsSave = async () => {
    const { startDateTime, endDateTime, reason } = absenceForm
    if (!startDateTime || !endDateTime) {
      toast({ type: 'error', message: 'Las fechas son obligatorias.' }); return
    }
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      toast({ type: 'error', message: 'La fecha de fin debe ser posterior al inicio.' }); return
    }
    setSavingChild(true)
    try {
      const toLocalDt = (dt) => (dt.length === 16 ? dt + ':00' : dt)
      const payload = {
        startDateTime: toLocalDt(startDateTime),
        endDateTime:   toLocalDt(endDateTime),
        reason:        reason || null,
      }
      if (absenceModal === 'create') {
        await api.post(`${empUrl}/absences`, payload)
        toast({ type: 'success', message: 'Ausencia registrada.' })
      } else {
        await api.put(`${empUrl}/absences/${selectedAbs.id}`, payload)
        toast({ type: 'success', message: 'Ausencia actualizada.' })
      }
      closeAbs()
      refreshAbsences()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally { setSavingChild(false) }
  }
  // elimina una ausencia
  const handleAbsDelete = async () => {
    setSavingChild(true)
    try {
      await api.delete(`${empUrl}/absences/${selectedAbs.id}`)
      toast({ type: 'success', message: 'Ausencia eliminada.' })
      closeAbs()
      refreshAbsences()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al eliminar.') })
    } finally { setSavingChild(false) }
  }

  const isAdminRole = emp.roleName === 'ADMIN'

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
      />
      <aside className="fixed top-0 right-0 z-50 h-[100dvh] w-[540px] max-w-[95vw] bg-white shadow-[0_28px_56px_-16px_rgba(15,23,42,0.22)] flex flex-col animate-[slideInRight_240ms_cubic-bezier(0.2,0.7,0.2,1)]">

        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(emp.id)} flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)]`}>
                {emp.fullName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-lg font-bold text-[#1e3a5f]">{emp.fullName}</div>
                  {isAdminRole
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1e3a5f] text-white"><Shield size={10} /> Admin</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"><User size={10} /> Empleado</span>
                  }
                </div>
                <div className="text-xs text-slate-400 mt-1 inline-flex items-center gap-1.5">
                  <Calendar size={12} /> Empleado desde {fmtSinceLong(emp.createdAt)}
                </div>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${status.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-[#1e3a5f] transition" title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Resumen del mes</div>
            <div className="grid grid-cols-3 gap-2">
              <KpiTile label="Citas"    value={kpi == null ? '…' : kpi.citas} />
              <KpiTile label="Ingresos" value={kpi == null ? '…' : `${kpi.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`} />
              <KpiTile label="Horas"    value={kpi == null ? '…' : `${kpi.horas} h`} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Contacto</div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`mailto:${emp.email}`} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition">
                <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Mail size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email</span>
                  <span className="block text-xs font-semibold text-[#1e3a5f] truncate">{emp.email}</span>
                </span>
              </a>
              {emp.phone ? (
                <a href={telHref(emp.phone)} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition">
                  <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Phone size={16} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Teléfono</span>
                    <span className="block text-xs font-semibold text-[#1e3a5f] truncate font-mono">{emp.phone}</span>
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 opacity-60">
                  <span className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center"><Phone size={16} /></span>
                  <span className="flex-1 text-xs text-slate-400">Sin teléfono</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50"><Clock size={11} className="text-blue-500" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">Horario semanal</p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setScheduleModal('copyweek')} className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">
                    Copiar L→V
                  </button>
                  <button onClick={openSchedCreate} className="flex items-center gap-0.5 rounded-xl bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition">
                    <Plus size={10} /> Añadir
                  </button>
                </div>
              )}
            </div>
            <ScheduleGrid
              schedules={schedules ?? []}
              loading={schedules === null}
              isAdmin={isAdmin}
              onEdit={openSchedEdit}
              onDelete={openSchedDelete}
              onAdd={openSchedCreate}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50"><Calendar size={11} className="text-amber-500" /></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">
                  Ausencias{absTotal > 0 && <span className="text-slate-400 font-medium normal-case tracking-normal"> · {absTotal}</span>}
                </p>
              </div>
              {isAdmin && (
                <button onClick={openAbsCreate} className="flex items-center gap-0.5 rounded-xl bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-100 transition">
                  <Plus size={10} /> Añadir
                </button>
              )}
            </div>
            {absLoading ? (
              <div className="space-y-1.5">
                {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-amber-50/40 rounded-xl animate-pulse" />)}
              </div>
            ) : absences.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1 py-2">Sin ausencias registradas.</p>
            ) : (
              <div className="space-y-1.5">
                {[...absences]
                  .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
                  .map((a) => (
                    <div key={a.id} className="flex items-start text-xs bg-amber-50/60 rounded-xl px-3 py-2 border border-amber-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700">
                          {fmtAbsence(a.startDateTime)} – {fmtAbsence(a.endDateTime)}
                        </p>
                        {a.reason && <p className="text-slate-500 truncate mt-0.5">{a.reason}</p>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-0.5 ml-2 shrink-0">
                          <button onClick={() => openAbsEdit(a)}   className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition" title="Editar"><Pencil size={11} /></button>
                          <button onClick={() => openAbsDelete(a)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition" title="Eliminar"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <Pagination
              page={absPage}
              totalPages={absTotalPages}
              totalElements={absTotal}
              onChange={setAbsPage}
            />
          </div>
        </div>

        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
            {archived ? (
              <Button variant="success" onClick={onReactivate} className="flex-1 gap-2">
                <ArchiveRestore size={15} /> Reactivar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onDeactivate} className="flex-1 gap-2">
                  <UserMinus size={15} /> Desactivar
                </Button>
                <Button onClick={onEditRole} className="flex-1 gap-2">
                  <Pencil size={15} /> Editar
                </Button>
              </>
            )}
          </div>
        )}
      </aside>

      <Modal
        open={scheduleModal === 'create' || scheduleModal === 'edit'}
        onClose={closeSched}
        title={scheduleModal === 'create' ? 'Añadir horario' : 'Editar horario'}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Día *"
            value={scheduleForm.dayOfWeek}
            onChange={(e) => setScheduleForm((p) => ({ ...p, dayOfWeek: e.target.value }))}
          >
            {DAYS_FULL.slice(1).map((d, i) => (
              <option key={i + 1} value={i + 1}>{d}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hora inicio"
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) => setScheduleForm((p) => ({ ...p, startTime: e.target.value }))}
            />
            <Input
              label="Hora fin"
              type="time"
              value={scheduleForm.endTime}
              onChange={(e) => setScheduleForm((p) => ({ ...p, endTime: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={closeSched} className="flex-1">Cancelar</Button>
            <Button onClick={handleSchedSave} loading={savingChild} className="flex-1">
              {scheduleModal === 'create' ? 'Añadir' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={scheduleModal === 'delete'} onClose={closeSched} title="Eliminar tramo" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-4">
            <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-snug">
              ¿Eliminar el tramo del <strong>{DAYS_FULL[selectedSch?.dayOfWeek]}</strong> de{' '}
              <strong>{selectedSch?.startTime?.slice(0, 5)}</strong> a{' '}
              <strong>{selectedSch?.endTime?.slice(0, 5)}</strong>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeSched} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleSchedDelete} loading={savingChild} className="flex-1">Eliminar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={scheduleModal === 'copyweek'} onClose={closeSched} title="Copiar horario L→V" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4">
            <Clock size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-snug">
              Se copiarán los tramos del <strong>lunes</strong> a <strong>martes, miércoles,
              jueves y viernes</strong>. El horario que esos días tuvieran se <strong>reemplazará</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeSched} className="flex-1">Cancelar</Button>
            <Button onClick={handleCopyMonToWeek} loading={savingChild} className="flex-1">Copiar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={absenceModal === 'create' || absenceModal === 'edit'}
        onClose={closeAbs}
        title={absenceModal === 'create' ? 'Registrar ausencia' : 'Editar ausencia'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Inicio *"
            type="datetime-local"
            value={absenceForm.startDateTime}
            onChange={(e) => setAbsenceForm((p) => ({ ...p, startDateTime: e.target.value }))}
          />
          <Input
            label="Fin *"
            type="datetime-local"
            value={absenceForm.endDateTime}
            min={absenceForm.startDateTime || undefined}
            onChange={(e) => setAbsenceForm((p) => ({ ...p, endDateTime: e.target.value }))}
          />
          <Input
            label="Motivo"
            value={absenceForm.reason}
            onChange={(e) => setAbsenceForm((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Vacaciones, baja médica…"
            maxLength={255}
          />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={closeAbs} className="flex-1">Cancelar</Button>
            <Button onClick={handleAbsSave} loading={savingChild} className="flex-1">
              {absenceModal === 'create' ? 'Registrar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={absenceModal === 'delete'} onClose={closeAbs} title="Eliminar ausencia" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-4">
            <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-snug">
              ¿Eliminar la ausencia del <strong>{selectedAbs ? fmtAbsence(selectedAbs.startDateTime) : ''}</strong>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeAbs} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleAbsDelete} loading={savingChild} className="flex-1">Eliminar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}


/** tarjeta compacta de un dato del resumen */
function KpiTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-3 text-center">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-xl font-extrabold text-[#1e3a5f] mt-0.5 tabular-nums">{value}</div>
    </div>
  )
}

/** rejilla del horario semanal por dia con acciones de admin */
function ScheduleGrid({ schedules, loading, isAdmin, onEdit, onDelete, onAdd }) {
  // se calcula el rango de horas a mostrar segun el horario real
  // si no hay nada se usa de 8 a 22 por defecto
  const { DAY_START, DAY_END } = useMemo(() => {
    let minH = 24, maxH = 0
    ;(schedules ?? []).forEach((s) => {
      if (!s.startTime || !s.endTime) return
      const [sh, sm] = s.startTime.slice(0, 5).split(':').map(Number)
      const [eh, em] = s.endTime.slice(0, 5).split(':').map(Number)
      const start = sh + sm / 60
      const end   = eh + em / 60
      if (start < minH) minH = start
      if (end > maxH)   maxH = end
    })
    if (minH === 24 || maxH === 0) return { DAY_START: 8, DAY_END: 22 }
    return {
      DAY_START: Math.max(0, Math.floor(minH)),
      DAY_END: Math.min(24, Math.ceil(maxH)),
    }
  }, [schedules])
  const total = DAY_END - DAY_START
  const dow = todayDow()

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1.5">
        {[...Array(7)].map((_, i) => <div key={i} className="h-7 bg-white rounded-md animate-pulse" />)}
      </div>
    )
  }

  /* filas planas para mantener cada tramo en su dia */
  const flatRows = [1, 2, 3, 4, 5, 6, 7].flatMap((d) => {
    const daySchedules = schedules
      .filter((s) => s.dayOfWeek === d)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (daySchedules.length === 0) {
      return [{ key: `empty-${d}`, sch: null, day: d, isFirstOfDay: true }]
    }
    return daySchedules.map((sch, idx) => ({
      key: `s-${sch.id}`,
      sch,
      day: d,
      isFirstOfDay: idx === 0,
    }))
  })

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="space-y-1.5">
        {flatRows.map(({ key, sch, day, isFirstOfDay }) => {
          const isToday = day === dow
          let bar
          if (sch) {
            const [sh, sm] = sch.startTime.slice(0, 5).split(':').map(Number)
            const [eh, em] = sch.endTime.slice(0, 5).split(':').map(Number)
            const startH = sh + sm / 60 - DAY_START
            const endH   = eh + em / 60 - DAY_START
            const left   = Math.max(0, (startH / total) * 100)
            const width  = Math.max(2, ((endH - startH) / total) * 100)
            bar = (
              <div
                className="absolute inset-y-1 rounded-md flex items-center px-2 text-[10px] font-semibold text-white whitespace-nowrap overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%`, background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)' }}
                title={`${sch.startTime.slice(0, 5)} – ${sch.endTime.slice(0, 5)}`}
              >
                <span className="truncate">{sch.startTime.slice(0, 5)} – {sch.endTime.slice(0, 5)}</span>
              </div>
            )
          } else {
            bar = (
              <div className="absolute inset-y-2 left-1 right-1 rounded-md border border-dashed border-slate-200 text-[10px] font-medium text-slate-400 flex items-center justify-center">
                Libre
              </div>
            )
          }
          return (
            <div key={key} className="grid grid-cols-[36px_1fr_56px] items-center gap-2">
              <div className={`text-[11px] font-bold text-center ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                {isFirstOfDay ? DAYS_SHORT[day] : ''}
                {isFirstOfDay && isToday && <span className="block w-1 h-1 rounded-full bg-blue-500 mx-auto mt-0.5" />}
              </div>
              <div className="relative h-7 rounded-md bg-white border border-slate-100">{bar}</div>
              <div className="flex gap-0.5 justify-end">
                {sch ? (
                  isAdmin && (
                    <>
                      <button onClick={() => onEdit(sch)}   className="rounded p-1 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition"><Pencil size={12} /></button>
                      <button onClick={() => onDelete(sch)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={12} /></button>
                    </>
                  )
                ) : (
                  isAdmin && (
                    <button onClick={onAdd} className="rounded p-1 text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition" title="Añadir"><Plus size={12} /></button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-[36px_1fr_56px] gap-2 mt-2">
        <div />
        <div className="flex justify-between text-[9px] text-slate-400 px-1 font-mono">
          {Array.from({ length: Math.floor(total / 2) + 1 }, (_, i) => (
            <span key={i}>{String(DAY_START + i * 2).padStart(2, '0')}</span>
          ))}
        </div>
        <div />
      </div>
    </div>
  )
}
