import createClient, { type Middleware } from 'openapi-fetch'

import type { paths } from './schema'

/** error de la API con el mensaje en español que devuelve el backend ({status, error, message}) */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type SessionHooks = {
  getToken: () => string | null
  onUnauthorized: () => void
}

let hooks: SessionHooks = { getToken: () => null, onUnauthorized: () => {} }

/** la sesion se conecta aqui al arrancar (ver AuthProvider) */
export function connectSession(h: SessionHooks) {
  hooks = h
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = hooks.getToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
  onResponse({ request, response }) {
    // con token y 401: la sesion ha caducado o se ha cerrado en otro dispositivo
    if (response.status === 401 && request.headers.has('Authorization')) {
      hooks.onUnauthorized()
    }
    return response
  },
}

/**
 * cliente HTTP con los tipos generados de /v3/api-docs (npm run gen:api)
 * las rutas son relativas: en desarrollo Vite las manda al backend y en produccion Caddy
 */
export const api = createClient<paths>({ baseUrl: import.meta.env.VITE_API_URL ?? '' })
api.use(authMiddleware)

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

/** espera la respuesta y devuelve los datos, o lanza ApiError con el mensaje del backend */
export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>
  try {
    result = await promise
  } catch {
    throw new ApiError(0, 'No se puede conectar con el servidor. Revisa tu conexión.')
  }
  const { data, error, response } = result
  if (!response.ok) {
    const message =
      (error as { message?: string } | undefined)?.message ??
      (response.status === 403 ? 'No tienes permisos para esta acción' : 'Ha ocurrido un error inesperado')
    throw new ApiError(response.status, message)
  }
  return data as T
}

/** mensaje legible de cualquier error (para avisos y formularios) */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ha ocurrido un error inesperado'
}
