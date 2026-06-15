// tarjeta de KPI del dashboard con icono, valor grande y subtitulo

/** Tarjeta de KPI con icono, valor grande y subtitulo */
export function StatCard({ label, value, sub, icon: Icon, tint = 'cyan-blue', attention = false }) {
  const tints = {
    'cyan-blue':   'from-cyan-400 to-blue-500',
    'blue-indigo': 'from-blue-500 to-indigo-500',
    'teal-cyan':   'from-teal-400 to-cyan-500',
    'amber':       'from-amber-400 to-orange-500',
  }
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] flex flex-col gap-3 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] transition-shadow min-h-[132px]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tints[tint]} flex items-center justify-center text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.4)]`}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
      <div className={`text-3xl font-extrabold tracking-tight leading-none tabular-nums ${attention ? 'text-orange-600' : 'text-[#1e3a5f]'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
