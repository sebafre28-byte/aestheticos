"use client"

import * as Sentry from "@sentry/nextjs"
import { useState } from "react"

export default function SentryExamplePage() {
  const [done, setDone] = useState(false)

  function triggerError() {
    Sentry.captureException(new Error("Test error desde SimpliClinic — Sentry funciona ✓"))
    setDone(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
      <div className="bg-white rounded-2xl p-8 shadow-sm border max-w-sm w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Test Sentry</h1>
        <p className="text-sm text-gray-500">
          Haz clic para enviar un error de prueba a Sentry y confirmar que está conectado.
        </p>
        {done ? (
          <p className="text-emerald-600 font-medium text-sm">
            ✓ Error enviado — revisa sentry.io
          </p>
        ) : (
          <button
            onClick={triggerError}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            Disparar error de prueba
          </button>
        )}
      </div>
    </div>
  )
}
