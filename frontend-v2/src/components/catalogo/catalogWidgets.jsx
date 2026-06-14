// widgets de interfaz del catalogo: tarjeta de KPI y chip de categoria seleccionable

/** Tarjeta de KPI del strip superior */
export function StatTile({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-extrabold text-[#1e3a5f] mt-1 tabular-nums">{value}</div>
    </div>
  )
}

/** Chip de categoria seleccionable */
export function CatChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active
          ? 'bg-[#1e3a5f] text-white'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-[#1e3a5f]'
      }`}
    >
      {children}
    </button>
  )
}
