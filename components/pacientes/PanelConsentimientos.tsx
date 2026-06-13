'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle, Loader2, FileText } from 'lucide-react'
import { ModalFirmaConsentimiento } from '@/components/consentimientos/ModalFirmaConsentimiento'

type SolicitudConsentimiento = {
  id: string
  email_destino: string
  estado: 'pendiente' | 'firmado' | 'expirado'
  firmado_at: string | null
  created_at: string
  expires_at: string
  cita: { inicio: string; servicios: { nombre: string } | null } | null
}

export default function PanelConsentimientos({ pacienteId }: { pacienteId: string }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudConsentimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [verFirmaId, setVerFirmaId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/consentimiento/historial?paciente_id=${pacienteId}`)
      .then(r => r.json())
      .then(d => setSolicitudes(d.solicitudes ?? []))
      .finally(() => setLoading(false))
  }, [pacienteId])

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="size-4 animate-spin text-gray-300" /></div>
  }

  if (solicitudes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="size-8 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Sin consentimientos registrados</p>
        <p className="text-xs text-gray-300 mt-1">Los consentimientos firmados aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {solicitudes.map(s => {
        const servicio = s.cita?.servicios?.nombre
        const fecha = s.cita?.inicio ? format(new Date(s.cita.inicio), "d MMM yyyy", { locale: es }) : null
        const isFirmado = s.estado === 'firmado'
        const isPendiente = s.estado === 'pendiente' && new Date(s.expires_at) > new Date()

        return (
          <div key={s.id} className="border border-gray-100 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isFirmado
                    ? <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                    : isPendiente
                    ? <Clock className="size-3.5 text-amber-500 shrink-0" />
                    : <AlertCircle className="size-3.5 text-gray-300 shrink-0" />
                  }
                  <span className={`text-xs font-semibold ${isFirmado ? 'text-green-700' : isPendiente ? 'text-amber-700' : 'text-gray-400'}`}>
                    {isFirmado ? 'Firmado' : isPendiente ? 'Pendiente' : 'Expirado'}
                  </span>
                </div>
                {servicio && <p className="text-xs font-medium text-gray-700">{servicio}</p>}
                {fecha && <p className="text-xs text-gray-400 mt-0.5">Cita: {fecha}</p>}
                {isFirmado && s.firmado_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Firmado: {format(new Date(s.firmado_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">Enviado a: {s.email_destino}</p>
              </div>
              {isFirmado && (
                <button
                  onClick={() => setVerFirmaId(s.id)}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium shrink-0 underline underline-offset-2"
                >
                  Ver / PDF
                </button>
              )}
            </div>
          </div>
        )
      })}

      {verFirmaId && typeof document !== 'undefined' && (
        <ModalFirmaConsentimiento solicitudId={verFirmaId} onClose={() => setVerFirmaId(null)} />
      )}
    </div>
  )
}
