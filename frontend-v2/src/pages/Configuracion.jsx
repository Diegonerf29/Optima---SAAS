// configuracion del negocio por pestanas: datos, horarios, impuestos, cabinas y bloqueos
import { useEffect, useState } from 'react'
import { Percent, Clock, Building2, Store, CalendarX2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BusinessTab } from '@/components/configuracion/BusinessTab'
import { TaxesTab } from '@/components/configuracion/TaxesTab'
import { HoursTab } from '@/components/configuracion/HoursTab'
import { BoothsTab } from '@/components/configuracion/BoothsTab'
import { BlocksTab } from '@/components/configuracion/BlocksTab'

/** Configuracion del negocio por pestanas: datos, horario, impuestos, cabinas y bloqueos */
export default function Configuracion() {
  const { user } = useAuth()
  const bId = user?.businessId
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState(() => localStorage.getItem('optima_cfg_tab') || 'business')
  useEffect(() => { localStorage.setItem('optima_cfg_tab', tab) }, [tab])

  const tabs = [
    { key: 'business', label: 'Negocio',   icon: Building2 },
    { key: 'taxes',    label: 'Impuestos', icon: Percent },
    { key: 'hours',    label: 'Horarios',  icon: Clock },
    { key: 'booths',   label: 'Cabinas',   icon: Store },
    { key: 'blocks',   label: 'Bloqueos',  icon: CalendarX2 },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">Gestiona los datos y parámetros de tu negocio</p>
      </div>

      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1.5 w-fit max-w-full overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-white text-[#1e3a5f] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]'
                  : 'text-slate-500 hover:text-[#1e3a5f]'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'business' && <BusinessTab bId={bId} isAdmin={isAdmin} />}
      {tab === 'taxes'    && <TaxesTab    bId={bId} isAdmin={isAdmin} />}
      {tab === 'hours'    && <HoursTab    bId={bId} isAdmin={isAdmin} />}
      {tab === 'booths'   && <BoothsTab   bId={bId} isAdmin={isAdmin} />}
      {tab === 'blocks'   && <BlocksTab   bId={bId} isAdmin={isAdmin} />}
    </div>
  )
}

