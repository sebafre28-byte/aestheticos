'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import Link from 'next/link'

const MOTIVOS = [
  'Es muy caro',
  'No lo uso suficiente',
  'Me falta una función importante',
  'Cambié a otro software',
  'Fue solo para probar',
  'Otro motivo',
]

type Props = {
  open: boolean
  onClose: () => void
  clinicaId: string
}

export default function CancelacionModal({ open, onClose, clinicaId }: Props) {
  const [motivo, setMotivo]   = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleCancelar() {
    if (!motivo) return
    setLoading(true)
    try {
      await fetch('/api/subscriptions/cancelacion-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clinica_id: clinicaId, motivo }),
      })
      const res = await fetch('/api/stripe/portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clinica_id: clinicaId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-[16px] font-semibold text-gray-900 mb-1">Antes de cancelar…</h2>
        <p className="text-[13px] text-gray-500 mb-5">
          Cuéntanos por qué para poder mejorar. Tu respuesta nos ayuda mucho.
        </p>

        <div className="space-y-2 mb-5">
          {MOTIVOS.map(m => (
            <label key={m} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="motivo"
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
                className="accent-[#2563EB]"
              />
              <span className={`text-[13px] ${motivo === m ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{m}</span>
            </label>
          ))}
        </div>

        {motivo === 'Es muy caro' && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-[12px] text-[#2563EB]">
            ¿Sabías que con el plan anual ahorras 2 meses?{' '}
            <Link href="/configuracion?tab=plan" onClick={onClose} className="font-semibold underline">
              Ver plan anual →
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            disabled={!motivo || loading}
            onClick={handleCancelar}
            className="w-full h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Cancelar suscripción
          </button>
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Mejor me quedo
          </button>
        </div>
      </div>
    </div>
  )
}
