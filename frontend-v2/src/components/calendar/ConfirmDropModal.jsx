// ventana de confirmacion del arrastre de citas (reagendado)
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/** ventana de confirmacion del arrastre; lista solo los campos que cambian */
export function ConfirmDropModal({ pending, employeeResources, boothResources, saving, onCancel, onConfirm }) {
  if (!pending) return null
  const { appt, newStartDateTime, newMembershipId, newBoothId } = pending

  const oldDate = new Date(appt.startDateTime)
  const newDate = new Date(newStartDateTime)
  const fmtDate = (d) => d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
  const fmtTime = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const findEmp = (id) => employeeResources.find((r) => r.id === id)?.name ?? 'Sin empleado'
  const findBoo = (id) => id == null ? 'Sin cabina' : (boothResources.find((r) => r.id === id)?.name ?? 'Sin cabina')

  const empChanged = newMembershipId !== appt.membershipId
  const booChanged = (newBoothId ?? null) !== (appt.boothId ?? null)
  const dateChanged = oldDate.toDateString() !== newDate.toDateString()
  const timeChanged = oldDate.getTime() !== newDate.getTime()

  return (
    <Modal open onClose={saving ? () => {} : onCancel} title="Mover cita" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Vas a reagendar la cita de <strong>{appt.clientName ?? 'el cliente'}</strong>.
          La cita conserva sus servicios y notas; solo cambia lo que se muestra abajo.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          {(dateChanged || timeChanged) && (
            <div className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-slate-500">Cuándo</span>
              <span className="font-medium text-[#1e3a5f] tabular-nums">
                {fmtDate(oldDate)} {fmtTime(oldDate)} <span className="text-slate-400">→</span> {fmtDate(newDate)} {fmtTime(newDate)}
              </span>
            </div>
          )}
          {empChanged && (
            <div className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-slate-500">Empleado</span>
              <span className="font-medium text-[#1e3a5f]">
                {findEmp(appt.membershipId)} <span className="text-slate-400">→</span> {findEmp(newMembershipId)}
              </span>
            </div>
          )}
          {booChanged && (
            <div className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-slate-500">Cabina</span>
              <span className="font-medium text-[#1e3a5f]">
                {findBoo(appt.boothId)} <span className="text-slate-400">→</span> {findBoo(newBoothId)}
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? 'Moviendo…' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
