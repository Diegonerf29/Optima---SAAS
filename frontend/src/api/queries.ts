import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { Appointment } from '@/api/types'
import { useTenant } from '@/auth/context'

/*
 * lecturas de la API con TanStack Query: guarda en cache, recarga al volver a la pestaña
 * y da isLoading / error sin repetirlo en cada pantalla.
 * Las claves empiezan por el negocio para que al cambiar de negocio no se mezclen datos.
 */
export const keys = {
  me: ['me'] as const,
  myBusinesses: ['me', 'businesses'] as const,
  myInvitations: ['me', 'invitations'] as const,
  roles: ['roles'] as const,
  business: (b: number) => ['b', b, 'business'] as const,
  all: (b: number, what: string) => ['b', b, what] as const,
}

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => unwrap(api.GET('/api/me')) })
}

export function useRoles() {
  return useQuery({ queryKey: keys.roles, queryFn: () => unwrap(api.GET('/api/roles')), staleTime: Infinity })
}

export function useBusiness() {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: keys.business(businessId),
    queryFn: () => unwrap(api.GET('/api/businesses/{id}', { params: { path: { id: businessId } } })),
  })
}

/** empleados activos (para la agenda y los selectores) */
export function useEmployees(active = true) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'employees'), { active }],
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/users', { params: { path: { businessId }, query: { active, size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}

export function useOfferings(active = true) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'offerings'), { active }],
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/services', { params: { path: { businessId }, query: { active, size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}

export function useCategories(active = true) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'categories'), { active }],
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/categories', { params: { path: { businessId }, query: { active, size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}

export function useTaxes(active = true) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'taxes'), { active }],
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/taxes', { params: { path: { businessId }, query: { active, size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}

export function useBooths(active = true) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'booths'), { active }],
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/booths', { params: { path: { businessId }, query: { active, size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}

export function useBusinessHours() {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: keys.all(businessId, 'hours'),
    queryFn: () => unwrap(api.GET('/api/businesses/{businessId}/hours', { params: { path: { businessId } } })),
  })
}

export function useClients(params: { search?: string; active?: boolean; page?: number; size?: number }) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'clients'), params],
    queryFn: () =>
      unwrap(
        api.GET('/api/businesses/{businessId}/clients', {
          params: { path: { businessId }, query: { ...params, search: params.search || undefined } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

/** citas entre dos fechas (incluidas), opcionalmente de un empleado o un cliente */
export function useAppointments(params: {
  from?: string
  to?: string
  membershipId?: number
  clientId?: number
  page?: number
  size?: number
  sort?: string[]
}) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'appointments'), params],
    queryFn: () =>
      unwrap(
        api.GET('/api/businesses/{businessId}/appointments', {
          params: { path: { businessId }, query: { size: 100, ...params } },
        }),
      ),
    placeholderData: keepPreviousData,
  })
}

/**
 * todas las citas de un rango (la agenda y el inicio): pide paginas de 100 hasta tenerlas todas,
 * porque una semana con varios empleados puede pasar del tamaño maximo de pagina
 */
export function useAppointmentsInRange(from: string, to: string) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'appointments'), 'range', { from, to }],
    queryFn: async () => {
      const todas: Appointment[] = []
      for (let page = 0; ; page++) {
        const res = await unwrap(
          api.GET('/api/businesses/{businessId}/appointments', {
            params: { path: { businessId }, query: { from, to, page, size: 100 } },
          }),
        )
        todas.push(...(res.content ?? []))
        if (page + 1 >= (res.page?.totalPages ?? 0)) return todas
      }
    },
    placeholderData: keepPreviousData,
  })
}

/** ausencias del negocio en un rango (para pintarlas en la agenda) */
export function useBusinessAbsences(from: string, to: string) {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: [...keys.all(businessId, 'absences'), { from, to }],
    queryFn: () => unwrap(api.GET('/api/businesses/{businessId}/absences', { params: { path: { businessId }, query: { from, to } } })),
  })
}

export function useScheduleBlocks() {
  const { businessId } = useTenant()
  return useQuery({
    queryKey: keys.all(businessId, 'blocks'),
    queryFn: () =>
      unwrap(api.GET('/api/businesses/{businessId}/schedule-blocks', { params: { path: { businessId }, query: { size: 100 } } })),
    select: (page) => page.content ?? [],
  })
}
