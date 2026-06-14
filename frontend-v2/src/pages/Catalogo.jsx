// Gestion del catalogo de servicios, categorias e impuestos con vistas grid y tabla
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Archive, Tag, Scissors, Search, RefreshCw, Filter, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { usePagedFetch } from '@/hooks/usePagedFetch'
import api, { getErrorMessage } from '@/lib/api'
import { emptyService, emptyCategory, fmtEur, catColor } from '@/components/catalogo/catalogShared'
import { StatTile, CatChip } from '@/components/catalogo/catalogWidgets'
import { FlatGrid, GroupedView, ServicesTable } from '@/components/catalogo/ServiceViews'
import { ServiceDrawer } from '@/components/catalogo/ServiceDrawer'
import { CategoryCard } from '@/components/catalogo/CategoryCard'

/** Catalogo de servicios, categorias e impuestos con vistas en tarjetas y tabla */
export default function Catalogo() {
  const { user } = useAuth()
  const toast = useToast()
  const bId = user?.businessId
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState(() => localStorage.getItem('optima_cat_tab') || 'services')
  useEffect(() => { localStorage.setItem('optima_cat_tab', tab) }, [tab])

  const [view, setView] = useState(() => localStorage.getItem('optima_cat_view') || 'grid')
  useEffect(() => { localStorage.setItem('optima_cat_view', view) }, [view])

  const [grouped, setGrouped] = useState(() => localStorage.getItem('optima_cat_grouped') === 'true')
  useEffect(() => { localStorage.setItem('optima_cat_grouped', String(grouped)) }, [grouped])

  const [pageSize, setPageSize] = useState(() => parseInt(localStorage.getItem('optima_cat_size') || '20', 10))
  useEffect(() => { localStorage.setItem('optima_cat_size', String(pageSize)) }, [pageSize])

  const [sortKey, setSortKey] = useState(() => localStorage.getItem('optima_cat_sortkey') || 'name')
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('optima_cat_sortdir') || 'asc')
  useEffect(() => { localStorage.setItem('optima_cat_sortkey', sortKey) }, [sortKey])
  useEffect(() => { localStorage.setItem('optima_cat_sortdir', sortDir) }, [sortDir])

  const [serviceView, setServiceView] = useState('active')   // tab Servicios
  const [categoryView, setCategoryView] = useState('active') // tab Categorias
  const servicesArchived = serviceView === 'archived'
  const categoriesArchived = categoryView === 'archived'

  // Filtros que viajan al servidor (ordenacion + flag de archivado)
  const servicesParams = useMemo(
    () => ({ sort: `${sortKey},${sortDir}`, active: serviceView === 'active' }),
    [sortKey, sortDir, serviceView],
  )
  const categoriesParams = useMemo(
    () => ({ active: categoryView === 'active' }),
    [categoryView],
  )

  const servicesUrl   = bId ? `/api/businesses/${bId}/services`   : null
  const categoriesUrl = bId ? `/api/businesses/${bId}/categories` : null

  // Servicios: se cargan TODOS (size=100, tope del servidor) para que la
  // busqueda y la paginacion operen sobre el conjunto completo
  const {
    items: services, totalElements: servTotal,
    loading: servLoading, refresh: refreshServices,
  } = usePagedFetch(servicesUrl, { size: 100, params: servicesParams })

  const {
    items: categories, page: catPage, totalPages: catTotalPages, totalElements: catTotal,
    loading: catLoading, setPage: setCatPage, refresh: refreshCategories,
  } = usePagedFetch(categoriesUrl, { size: 100, params: categoriesParams })

  // Siempre activos: alimentan el desplegable de categorias del ventana de
  // servicio y los chips de filtro, que no deben mostrar elementos archivados
  // aunque la pestana de categorias este en vista 'archived'
  const [aux, setAux] = useState({ taxes: [], allServices: [], activeCategories: [] })
  const [auxVersion, setAuxVersion] = useState(0)
  const bumpAux = useCallback(() => setAuxVersion((v) => v + 1), [])

  useEffect(() => {
    if (!bId) return
    Promise.allSettled([
      api.get(`/api/businesses/${bId}/taxes?size=100`),
      api.get(`/api/businesses/${bId}/services?size=100`),
      api.get(`/api/businesses/${bId}/categories?size=100`),
    ]).then((results) => {
      setAux({
        taxes:           results[0].status === 'fulfilled' ? results[0].value.data.content : [],
        allServices:     results[1].status === 'fulfilled' ? results[1].value.data.content : [],
        activeCategories: results[2].status === 'fulfilled' ? results[2].value.data.content : [],
      })
      const firstError = results.find((r) => r.status === 'rejected')
      if (firstError) {
        toast({
          type: 'error',
          message: getErrorMessage(firstError.reason, 'No se pudieron cargar los datos auxiliares.'),
        })
      }
    })
  }, [bId, auxVersion, toast])

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('ALL')
  const [drawer, setDrawer] = useState(null) // servicio abierto en panel

  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [serviceForm, setServiceForm] = useState(emptyService)
  const [catForm, setCatForm] = useState(emptyCategory)
  const [saving, setSaving] = useState(false)

  // Cierra el panel con Esc
  useEffect(() => {
    if (!drawer) return
    const handler = (e) => { if (e.key === 'Escape') setDrawer(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [drawer])

  const closeModal = () => { setModal(null); setSelected(null) }

  const openCreateService = () => {
    setSelected(null); setServiceForm(emptyService); setModal('service-create')
  }
  const openEditService = (s) => {
    setSelected(s)
    setServiceForm({
      name: s.name,
      description: s.description || '',
      price: s.price,
      durationMinutes: s.durationMinutes,
      categoryId: s.categoryId,
      taxId: s.taxId,
    })
    setModal('service-edit')
  }
  const openArchiveService = (s) => { setSelected(s); setModal('service-archive') }

  const handleServiceSave = async () => {
    const { name, price, durationMinutes, categoryId, taxId } = serviceForm
    if (!name || !price || !durationMinutes || !categoryId || !taxId) {
      toast({ type: 'error', message: 'Rellena todos los campos obligatorios.' }); return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        description:     serviceForm.description,
        price:           parseFloat(price),
        durationMinutes: parseInt(durationMinutes, 10),
        categoryId:      parseInt(categoryId, 10),
        taxId:           parseInt(taxId, 10),
      }
      if (modal === 'service-create') {
        await api.post(`/api/businesses/${bId}/services`, payload)
        toast({ type: 'success', message: 'Servicio creado.' })
      } else {
        await api.put(`/api/businesses/${bId}/services/${selected.id}`, payload)
        toast({ type: 'success', message: 'Servicio actualizado.' })
      }
      closeModal()
      refreshServices()
      bumpAux()
      if (drawer?.id === selected?.id) setDrawer(null)
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveService = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/services/${selected.id}`)
      toast({ type: 'success', message: 'Servicio archivado.' })
      closeModal()
      refreshServices()
      bumpAux()
      if (drawer?.id === selected.id) setDrawer(null)
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al archivar.') })
    } finally {
      setSaving(false)
    }
  }

  // Restaurar es un clic directo (no destructivo): sin ventana de confirmacion
  const handleReactivateService = async (service) => {
    try {
      await api.patch(`/api/businesses/${bId}/services/${service.id}/reactivate`)
      toast({ type: 'success', message: 'Servicio restaurado.' })
      refreshServices()
      bumpAux()
      if (drawer?.id === service.id) setDrawer(null)
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al restaurar el servicio.') })
    }
  }

  const openCreateCat = () => { setSelected(null); setCatForm(emptyCategory); setModal('cat-create') }
  const openEditCat = (c) => { setSelected(c); setCatForm({ name: c.name }); setModal('cat-edit') }
  const openArchiveCat = (c) => { setSelected(c); setModal('cat-archive') }

  const handleCatSave = async () => {
    if (!catForm.name.trim()) {
      toast({ type: 'error', message: 'El nombre es obligatorio.' }); return
    }
    setSaving(true)
    try {
      if (modal === 'cat-create') {
        await api.post(`/api/businesses/${bId}/categories`, catForm)
        toast({ type: 'success', message: 'Categoría creada.' })
      } else {
        await api.put(`/api/businesses/${bId}/categories/${selected.id}`, catForm)
        toast({ type: 'success', message: 'Categoría actualizada.' })
      }
      closeModal()
      refreshCategories()
      bumpAux()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al guardar.') })
    } finally {
      setSaving(false)
    }
  }
  const handleArchiveCat = async () => {
    setSaving(true)
    try {
      await api.delete(`/api/businesses/${bId}/categories/${selected.id}`)
      toast({ type: 'success', message: 'Categoría archivada.' })
      closeModal()
      refreshCategories()
      bumpAux()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al archivar.') })
    } finally {
      setSaving(false)
    }
  }

  // Restaurar es un clic directo (no destructivo): sin ventana de confirmacion
  const handleReactivateCat = async (category) => {
    try {
      await api.patch(`/api/businesses/${bId}/categories/${category.id}/reactivate`)
      toast({ type: 'success', message: 'Categoría restaurada.' })
      refreshCategories()
      bumpAux()
    } catch (err) {
      toast({ type: 'error', message: getErrorMessage(err, 'Error al restaurar la categoría.') })
    }
  }

  const stats = useMemo(() => {
    const list = aux.allServices
    if (list.length === 0) return null
    const totalPrice = list.reduce((acc, s) => acc + Number(s.price), 0)
    const totalMin   = list.reduce((acc, s) => acc + Number(s.durationMinutes), 0)
    const maxPrice   = list.reduce((acc, s) => (Number(s.price) > Number(acc.price) ? s : acc), list[0])
    return {
      count: list.length,
      avgPrice: totalPrice / list.length,
      avgMinutes: Math.round(totalMin / list.length),
      maxPriceService: maxPrice,
    }
  }, [aux.allServices])

  const visibleServices = useMemo(() => {
    const t = search.trim().toLowerCase()
    return services.filter((s) => {
      if (activeCat !== 'ALL' && s.categoryId !== Number(activeCat)) return false
      if (!t) return true
      return (
        s.name.toLowerCase().includes(t) ||
        s.description?.toLowerCase().includes(t) ||
        s.categoryName?.toLowerCase().includes(t)
      )
    })
  }, [services, search, activeCat])

  // Paginacion en cliente sobre los servicios ya filtrados
  const [servPage, setServPage] = useState(0)
  const servTotalPages = Math.max(1, Math.ceil(visibleServices.length / pageSize))
  const servSafePage = Math.min(servPage, servTotalPages - 1)
  const pagedServices = visibleServices.slice(servSafePage * pageSize, servSafePage * pageSize + pageSize)

  const countsByCat = useMemo(() => {
    const m = new Map()
    aux.allServices.forEach((s) => m.set(s.categoryId, (m.get(s.categoryId) ?? 0) + 1))
    return m
  }, [aux.allServices])

  const refreshAll = () => { refreshServices(); refreshCategories(); bumpAux() }


  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-8">

      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Catálogo de servicios</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            {servTotal} servicio{servTotal === 1 ? '' : 's'} · {catTotal} categoría{catTotal === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            title="Refrescar"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f] transition"
          >
            <RefreshCw size={16} className={(servLoading || catLoading) ? 'animate-spin' : ''} />
          </button>
          {isAdmin && (
            <Button onClick={tab === 'services' ? openCreateService : openCreateCat} className="gap-2">
              <Plus size={16} /> {tab === 'services' ? 'Nuevo servicio' : 'Nueva categoría'}
            </Button>
          )}
        </div>
      </div>

      {stats && !(tab === 'services' && servicesArchived) && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Servicios activos" value={stats.count} />
          <StatTile label="Precio medio"      value={fmtEur(stats.avgPrice)} />
          <StatTile label="Duración media"    value={`${stats.avgMinutes} min`} />
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Más caro</div>
            <div className="text-base font-bold text-[#1e3a5f] mt-1 truncate">{stats.maxPriceService.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">{fmtEur(stats.maxPriceService.price)}</div>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center gap-1 bg-slate-100 rounded-2xl p-1.5 w-fit">
        {[
          { key: 'services',   label: 'Servicios',   Icon: Scissors, count: servTotal },
          { key: 'categories', label: 'Categorías',  Icon: Tag,      count: catTotal },
        ].map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white text-[#1e3a5f] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)]'
                : 'text-slate-500 hover:text-[#1e3a5f]'
            }`}
          >
            <Icon size={15} /> {label}
            <span className={`text-[10px] font-bold ${tab === key ? 'text-slate-400' : 'text-slate-400'} ml-1`}>{count}</span>
          </button>
        ))}
      </div>

      {tab === 'services' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, descripción o categoría…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-[#1f2c4a] placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <select
              value={`${sortKey},${sortDir}`}
              onChange={(e) => { const [k, d] = e.target.value.split(','); setSortKey(k); setSortDir(d) }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
            >
              <option value="name,asc">Nombre A → Z</option>
              <option value="name,desc">Nombre Z → A</option>
              <option value="price,asc">Precio ↑</option>
              <option value="price,desc">Precio ↓</option>
              <option value="durationMinutes,asc">Duración ↑</option>
              <option value="durationMinutes,desc">Duración ↓</option>
              <option value="createdAt,desc">Más recientes</option>
            </select>

            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setView('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'grid' ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
              >
                <LayoutGrid size={14} /> Grid
              </button>
              <button
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === 'table' ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
              >
                <List size={14} /> Tabla
              </button>
            </div>

            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
              {[{ key: 'active', label: 'Activos' }, { key: 'archived', label: 'Archivados' }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setServiceView(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    serviceView === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
                  }`}>{label}</button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setServPage(0) }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a5f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {aux.activeCategories.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <CatChip
                active={activeCat === 'ALL'}
                onClick={() => setActiveCat('ALL')}
              >
                <Filter size={12} /> Todas <span className="opacity-70">{stats?.count ?? 0}</span>
              </CatChip>
              {aux.activeCategories.map((c) => {
                const color = catColor(c.id)
                const count = countsByCat.get(c.id) ?? 0
                return (
                  <CatChip
                    key={c.id}
                    active={activeCat === String(c.id)}
                    onClick={() => setActiveCat(String(c.id))}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: color.dot }} />
                    {c.name} <span className="text-slate-400">{count}</span>
                  </CatChip>
                )
              })}

              <div className="ml-auto inline-flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setGrouped(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!grouped ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
                >
                  Plano
                </button>
                <button
                  onClick={() => setGrouped(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${grouped ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'}`}
                >
                  Por categoría
                </button>
              </div>
            </div>
          )}

          {servLoading ? (
            view === 'grid' ? (
              <div className="card-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-xl mb-2 animate-pulse" />
                ))}
              </div>
            )
          ) : visibleServices.length === 0 ? (
            search || activeCat !== 'ALL' ? (
              <p className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                Sin servicios con estos filtros.
              </p>
            ) : servicesArchived ? (
              <EmptyState
                icon={Scissors}
                title="No hay servicios archivados"
                description="Los servicios que archives aparecerán aquí para que puedas restaurarlos."
              />
            ) : (
              <EmptyState
                icon={Scissors}
                title="El catálogo está vacío"
                description="Añade tu primer servicio para poder ofrecerlo en las citas."
                actionLabel={isAdmin ? 'Nuevo servicio' : undefined}
                onAction={isAdmin ? openCreateService : undefined}
              />
            )
          ) : view === 'grid' ? (
            grouped ? (
              <GroupedView
                list={pagedServices}
                categories={aux.activeCategories}
                taxes={aux.taxes}
                isAdmin={isAdmin}
                archived={servicesArchived}
                onOpen={setDrawer}
                onEdit={openEditService}
                onArchive={openArchiveService}
                onReactivate={handleReactivateService}
              />
            ) : (
              <FlatGrid
                list={pagedServices}
                taxes={aux.taxes}
                isAdmin={isAdmin}
                archived={servicesArchived}
                onOpen={setDrawer}
                onEdit={openEditService}
                onArchive={openArchiveService}
                onReactivate={handleReactivateService}
              />
            )
          ) : (
            <ServicesTable
              list={pagedServices}
              taxes={aux.taxes}
              isAdmin={isAdmin}
              archived={servicesArchived}
              onOpen={setDrawer}
              onEdit={openEditService}
              onArchive={openArchiveService}
              onReactivate={handleReactivateService}
            />
          )}

          {servTotalPages > 1 && (
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
              <Pagination
                page={servSafePage}
                totalPages={servTotalPages}
                totalElements={visibleServices.length}
                onChange={setServPage}
              />
            </div>
          )}
        </>
      )}

      {tab === 'categories' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
              {[{ key: 'active', label: 'Activos' }, { key: 'archived', label: 'Archivados' }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setCategoryView(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    categoryView === key ? 'bg-white text-[#1e3a5f] shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-[#1e3a5f]'
                  }`}>{label}</button>
              ))}
            </div>
            <span className="text-xs text-slate-500">
              <strong className="text-[#1e3a5f]">{catTotal}</strong>{' '}
              {categoriesArchived
                ? `categoría${catTotal === 1 ? '' : 's'} archivada${catTotal === 1 ? '' : 's'}`
                : `categoría${catTotal === 1 ? '' : 's'}`}
            </span>
          </div>

          {catLoading ? (
            <div className="card-grid">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            categoriesArchived ? (
              <EmptyState
                icon={Tag}
                title="No hay categorías archivadas"
                description="Las categorías que archives aparecerán aquí para que puedas restaurarlas."
              />
            ) : (
              <EmptyState
                icon={Tag}
                title="No hay categorías"
                description="Crea categorías para organizar los servicios del catálogo."
                actionLabel={isAdmin ? 'Nueva categoría' : undefined}
                onAction={isAdmin ? openCreateCat : undefined}
              />
            )
          ) : (
            <div className="card-grid">
              {categories.map((c) => (
                <CategoryCard
                  key={c.id}
                  category={c}
                  count={countsByCat.get(c.id) ?? 0}
                  isAdmin={isAdmin}
                  archived={categoriesArchived}
                  onOpen={() => { setActiveCat(String(c.id)); setTab('services') }}
                  onEdit={() => openEditCat(c)}
                  onArchive={() => openArchiveCat(c)}
                  onReactivate={() => handleReactivateCat(c)}
                />
              ))}
            </div>
          )}

          {catTotalPages > 1 && (
            <div className="mt-6 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
              <Pagination
                page={catPage}
                totalPages={catTotalPages}
                totalElements={catTotal}
                onChange={setCatPage}
              />
            </div>
          )}
        </>
      )}

      {drawer && (
        <ServiceDrawer
          service={drawer}
          taxes={aux.taxes}
          isAdmin={isAdmin}
          archived={servicesArchived}
          onClose={() => setDrawer(null)}
          onEdit={() => openEditService(drawer)}
          onArchive={() => openArchiveService(drawer)}
          onReactivate={() => handleReactivateService(drawer)}
        />
      )}


      <Modal
        open={modal === 'service-create' || modal === 'service-edit'}
        onClose={closeModal}
        title={modal === 'service-create' ? 'Nuevo servicio' : 'Editar servicio'}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nombre *"
              name="name"
              value={serviceForm.name}
              onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nombre del servicio"
              maxLength={150}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Descripción"
              name="description"
              value={serviceForm.description}
              onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descripción opcional…"
              maxLength={500}
            />
          </div>
          <Input
            label="Precio (€) *"
            type="number"
            min="0"
            step="0.01"
            value={serviceForm.price}
            onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Duración (min) *"
            type="number"
            min="1"
            value={serviceForm.durationMinutes}
            onChange={(e) => setServiceForm((p) => ({ ...p, durationMinutes: e.target.value }))}
            placeholder="30"
          />
          <Select
            label="Categoría *"
            value={serviceForm.categoryId}
            onChange={(e) => setServiceForm((p) => ({ ...p, categoryId: e.target.value }))}
          >
            <option value="">Selecciona categoría</option>
            {aux.activeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            label="Impuesto *"
            value={serviceForm.taxId}
            onChange={(e) => setServiceForm((p) => ({ ...p, taxId: e.target.value }))}
          >
            <option value="">Selecciona impuesto</option>
            {aux.taxes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.percentage}%)</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
          <Button onClick={handleServiceSave} loading={saving} className="flex-1">
            {modal === 'service-create' ? 'Crear servicio' : 'Guardar'}
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'service-archive'} onClose={closeModal} title="Archivar servicio" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
            <Archive size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-snug">
              ¿Archivar el servicio <strong>{selected?.name}</strong>?
              Dejará de aparecer en el catálogo pero las citas pasadas que lo usen seguirán intactas.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleArchiveService} loading={saving} className="flex-1">Archivar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'cat-create' || modal === 'cat-edit'}
        onClose={closeModal}
        title={modal === 'cat-create' ? 'Nueva categoría' : 'Editar categoría'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={catForm.name}
            onChange={(e) => setCatForm({ name: e.target.value })}
            placeholder="Nombre de la categoría"
            maxLength={100}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button onClick={handleCatSave} loading={saving} className="flex-1">
              {modal === 'cat-create' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'cat-archive'} onClose={closeModal} title="Archivar categoría" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-4">
            <Archive size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-snug">
              ¿Archivar la categoría <strong>{selected?.name}</strong>?
              Si tiene servicios asociados, el backend bloqueará la acción.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeModal} className="flex-1">Cancelar</Button>
            <Button variant="danger" onClick={handleArchiveCat} loading={saving} className="flex-1">Archivar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
