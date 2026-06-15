// donut de distribucion de citas del mes por estado, con leyenda
import { STATUS_LABELS, STATUS_COLORS } from './dashboardShared'

/** Donut con la distribucion de citas del mes por estado */
export function StatusDonut({ buckets, total }) {
  const slices = []
  let deg = 0
  Object.keys(STATUS_LABELS).forEach((k) => {
    const portion = total > 0 ? ((buckets[k] ?? 0) / total) * 360 : 0
    if (portion > 0) slices.push(`${STATUS_COLORS[k]} ${deg}deg ${deg + portion}deg`)
    deg += portion
  })
  const gradient = slices.length
    ? `conic-gradient(${slices.join(', ')})`
    : 'conic-gradient(#e2e8f0 0deg 360deg)'

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
      <div className="mb-4">
        <div className="text-base font-bold text-[#1e3a5f]">Estado de las citas</div>
        <div className="text-xs text-slate-400 mt-0.5">Este mes · {total} totales</div>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0">
          <div className="w-full h-full rounded-full" style={{ background: gradient }} />
          <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total</div>
            <div className="text-xl font-extrabold text-[#1e3a5f] leading-none tabular-nums">{total}</div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 gap-2 min-w-0">
          {Object.keys(STATUS_LABELS).map((k) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: STATUS_COLORS[k] }} />
              <span className="flex-1 text-slate-500 truncate">{STATUS_LABELS[k]}</span>
              <span className="font-bold text-[#1e3a5f] tabular-nums">{buckets[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
