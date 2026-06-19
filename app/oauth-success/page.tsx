'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function OAuthSuccessContent() {
  const params = useSearchParams()
  const status = params.get('google') ?? 'success'

  useEffect(() => {
    if (window.opener) {
      window.opener.__googleCalendarResult = status
      window.close()
    } else {
      window.location.replace('/configuracion?tab=google_calendar')
    }
  }, [status])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-[14px] text-gray-500">Cerrando ventana…</p>
    </div>
  )
}

export default function OAuthSuccessPage() {
  return (
    <Suspense>
      <OAuthSuccessContent />
    </Suspense>
  )
}
