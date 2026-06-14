// tarjeta de KPI compacta del strip superior del calendario

/** Tarjeta de KPI compacta para el strip superior del calendario */
export function StatTile({ label, value, tone }) {
  const tones = { default: 'text-[#1e3a5f]', success: 'text-emerald-600', cyan: 'text-cyan-600', warning: 'text-orange-600' }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 tabular-nums ${tones[tone] || tones.default}`}>{value}</div>
    </div>
  )
}
