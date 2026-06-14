// barra de filtros del calendario: popover de empleado/cabina/estado, color y agrupado
import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { key: '',            label: 'Todos' },
  { key: 'PENDING',     dot: 'bg-amber-500' },
  { key: 'CONFIRMED',   dot: 'bg-blue-500' },
  { key: 'IN_PROGRESS', dot: 'bg-cyan-500' },
  { key: 'COMPLETED',   dot: 'bg-emerald-500' },
  { key: 'CANCELLED',   dot: 'bg-slate-400' },
  { key: 'NO_SHOW',     dot: 'bg-rose-500' },
]

/** Barra de filtros del calendario con popovers de filtro, color y agrupado */
export function FiltersBar({
  employees, booths,
  employeeFilter, setEmployeeFilter,
  boothFilter,    setBoothFilter,
  statusFilter,   setStatusFilter,
  colorBy,        setColorBy,
  view,
  groupBy,        setGroupBy,
  statusLabel,
}) {
  const [open, setOpen] = useState(false)
  const popRef = useRef(null)
  const btnRef = useRef(null)

  // Cerrar al pulsar fuera o ESC
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (popRef.current?.contains(e.target)) return
      if (btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activeCount =
    (employeeFilter ? 1 : 0) +
    (boothFilter ? 1 : 0) +
    (statusFilter ? 1 : 0)

  const clearAll = () => {
    setEmployeeFilter('')
    setBoothFilter('')
    setStatusFilter('')
  }

  const employeeLabel = employees.find((e) => String(e.id) === String(employeeFilter))?.fullName
  const boothLabelActive = booths.find((b) => String(b.id) === String(boothFilter))?.name
  const statusOpt     = STATUS_FILTER_OPTIONS.find((s) => s.key === statusFilter)

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/40 no-print">
      <div className="relative z-50">
        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          className={`h-9 inline-flex items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
            open || activeCount > 0
              ? 'border-blue-300 bg-blue-50 text-[#1e3a5f]'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-[#1e3a5f]'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#1e3a5f] text-white text-[10px] font-bold tabular-nums px-1">
              {activeCount}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={popRef}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.18)] p-4"
          >
            <div className="space-y-4">
              <FilterRow label="Empleado">
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                >
                  <option value="">Todos los empleados</option>
                  {employees.map((e) => (<option key={e.id} value={e.id}>{e.fullName}</option>))}
                </select>
              </FilterRow>

              <FilterRow label="Cabina">
                <select
                  value={boothFilter}
                  onChange={(e) => setBoothFilter(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
                >
                  <option value="">Todas las cabinas</option>
                  {booths.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </FilterRow>

              <FilterRow label="Estado">
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTER_OPTIONS.map(({ key, label, dot }) => (
                    <button
                      key={key || 'ALL'}
                      onClick={() => setStatusFilter(key)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition inline-flex items-center gap-1 ${
                        statusFilter === key
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                      {label ?? statusLabel(key)}
                    </button>
                  ))}
                </div>
              </FilterRow>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={clearAll}
                disabled={activeCount === 0}
                className="text-[11px] font-semibold text-slate-500 hover:text-[#1e3a5f] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Limpiar filtros
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-white bg-[#1e3a5f] hover:bg-[#2a4f82] rounded-lg px-3 py-1.5 transition"
              >
                Hecho
              </button>
            </div>
          </div>
        )}
      </div>

      {employeeLabel && (
        <ActiveChip label={employeeLabel} onClear={() => setEmployeeFilter('')} />
      )}
      {boothLabelActive && (
        <ActiveChip label={boothLabelActive} onClear={() => setBoothFilter('')} />
      )}
      {statusOpt && statusOpt.key && (
        <ActiveChip
          label={statusLabel(statusOpt.key)}
          dot={statusOpt.dot}
          onClear={() => setStatusFilter('')}
        />
      )}

      <div className="flex items-center gap-1.5 ml-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">Color</span>
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
          {[
            { key: 'status',   label: 'Estado' },
            { key: 'employee', label: 'Empleado' },
            { key: 'booth',    label: 'Cabina' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setColorBy(key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${colorBy === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
            >{label}</button>
          ))}
        </div>
      </div>

      {(view === 'Día' || view === 'Semana') && (
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">Agrupar</span>
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
            {[
              { key: 'time',     label: 'Cronol.' },
              { key: 'booth',    label: 'Cabinas' },
              { key: 'employee', label: 'Empleados' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setGroupBy(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${groupBy === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
              >{label}</button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function FilterRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function ActiveChip({ label, dot, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-[#1e3a5f]">
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      <span className="truncate max-w-[140px]">{label}</span>
      <button
        onClick={onClear}
        aria-label={`Quitar filtro: ${label}`}
        className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
      >
        <X size={11} />
      </button>
    </span>
  )
}
