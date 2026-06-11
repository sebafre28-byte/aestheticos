'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function AgendaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AgendaError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
        <AlertTriangle className="size-6 text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Error en la agenda</h2>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          Ocurrió un error inesperado al cargar la agenda. Tus datos están seguros.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </button>
        <button
          onClick={() => (window.location.href = '/dashboard')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Home className="size-3.5" />
          Ir al inicio
        </button>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-400">Referencia: {error.digest}</p>
      )}
    </div>
  )
}
