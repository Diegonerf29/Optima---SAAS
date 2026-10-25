import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { ApiError } from '@/api/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import '@/index.css'

/*
 * si la suscripcion caduca mientras se usa la aplicacion, la API responde 402:
 * se vuelve a leer su estado y la pantalla cambia a la de pago
 */
function siCaducaLaSuscripcion(error: Error) {
  if (error instanceof ApiError && error.status === 402) {
    void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[2] === 'billing' })
  }
}

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: siCaducaLaSuscripcion }),
  mutationCache: new MutationCache({ onError: siCaducaLaSuscripcion }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // los errores de permisos o datos no se reintentan, solo los de red
      retry: (failureCount, error) => !(error instanceof ApiError && error.status > 0 && error.status < 500) && failureCount < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
