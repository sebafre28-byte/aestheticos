'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle, Loader2, X, Download, FileText } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

type SolicitudConsentimiento = {
  id: string
  email_destino: string
  estado: 'pendiente' | 'firmado' | 'expirado'
  firmado_at: string | null
  created_at: string
  expires_at: string
  cita: { inicio: string; servicios: { nombre: string } | null } | null
}

function ModalFirma({ solicitudId, onClose }: { solicitudId: string; onClose: () => void }) {
  const [data, setData] = useState<{ firma_img: string | null; firmado_at: string | null; email_destino: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/consentimiento/firma?id=${solicitudId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [solicitudId])

  function descargar() {
    if (!data?.firma_img) return
    const a = document.createElement('a')
    a.href = data.firma_img
    a.download = `firma_consentimiento_${solicitudId.slice(0, 8)}.png`
    a.click()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Firma del paciente</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="size-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-gray-300" /></div>
          ) : !data?.firma_img ? (
            <p className="text-sm text-gray-400 text-center py-6">Firma no disponible</p>
          ) : (
            <>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.firma_img} alt="Firma" className="w-full" />
              </div>
              {data.firmado_at && (
                <p className="text-xs text-gray-400 text-center mb-3">
                  {format(new Date(data.firmado_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                  {data.email_destino && ` · ${data.email_destino}`}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={descargar} className="w-full gap-2 text-xs">
                <Download className="size-3.5" /> Descargar firma PNG
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
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
                  Ver firma
                </button>
              )}
            </div>
          </div>
        )
      })}

      {verFirmaId && typeof document !== 'undefined' && (
        <ModalFirma solicitudId={verFirmaId} onClose={() => setVerFirmaId(null)} />
      )}
    </div>
  )
}
