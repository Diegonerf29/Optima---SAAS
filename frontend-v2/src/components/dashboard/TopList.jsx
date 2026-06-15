// ranking compacto con barra de progreso para top servicios o empleados del mes

/** Ranking compacto con barra de progreso para top servicios o empleados */
export function TopList({ title, sub, items, renderMeta }) {
  const max = items[0]?.count ?? 1
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
      <div className="mb-4">
        <div className="text-base font-bold text-[#1e3a5f]">{title}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400 py-3">Sin datos este mes.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it, idx) => (
            <div key={it.name} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                idx === 0
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_4px_10px_rgba(14,165,233,0.4)]'
                  : 'bg-blue-50 text-blue-700'
              }`}>{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1e3a5f] truncate leading-tight">{it.name}</div>
                <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">{renderMeta(it)}</div>
              </div>
              <div className="w-20 h-1 rounded-full bg-slate-100 overflow-hidden shrink-0">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${(it.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
