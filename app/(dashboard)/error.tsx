'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Algo salió mal</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        Ocurrió un error inesperado. Puedes intentar recargar la sección o volver al inicio.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')}>
          Ir al inicio
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-400">Código: {error.digest}</p>
      )}
    </div>
  )
}
