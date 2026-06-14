// componentes de interfaz compartidos por las pestanas de configuracion
import { RefreshCw, Info } from 'lucide-react'

/** Cabecera azul con descripcion breve de la pestana activa */
export function SectionHint({ title, children }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
      <div className="text-sm text-slate-600">
        <p className="font-semibold text-[#1e3a5f]">{title}</p>
        <p className="mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

/** Barra superior con contador, filtros, orden y accion principal */
export function Toolbar({ rightCount, rightLabel, extraStats, filter, sortOptions, sortValue, onSortChange, pageSize, onPageSize, onRefresh, loading, primary }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="text-xs text-slate-500">
        <strong className="text-[#1e3a5f]">{rightCount}</strong> {rightLabel}
        {extraStats && <span className="ml-3 text-slate-400">· {extraStats}</span>}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        title="Refrescar"
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
      {filter}
      <select
        value={sortValue}
        onChange={(e) => onSortChange(e.target.value)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
      >
        {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
        <span>Mostrar</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(parseInt(e.target.value, 10))}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
        >
          <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
        </select>
        {primary}
      </div>
    </div>
  )
}

/* Control segmentado Activos / Archivados - compartido por Impuestos y Cabinas */
/** Toggle Activos/Archivados para los listados con archivado */
export function ArchiveViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
      {[{ key: 'active', label: 'Activos' }, { key: 'archived', label: 'Archivados' }].map(({ key, label }) => (
        <button key={key} type="button" onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            view === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
          }`}>{label}</button>
      ))}
    </div>
  )
}

