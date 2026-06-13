'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Download, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONSENTIMIENTO_DEFAULT } from '@/lib/consentimientos/queries'

type FirmaData = {
  firma_img: string | null
  firmado_at: string | null
  email_destino: string
  // extras para PDF
  clinica_nombre?: string
  paciente_nombre?: string
  servicio_nombre?: string
  fecha_cita?: string
  titulo?: string
  contenido?: string
}

async function descargarPDF(data: FirmaData, solicitudId: string) {
  if (!data.firma_img) return
  const { generarConsentimientoPDF } = await import('@/lib/consentimientos/pdf')
  const firmado_at = data.firmado_at
    ? format(new Date(data.firmado_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })
    : ''
  const doc = await generarConsentimientoPDF({
    clinica_nombre: data.clinica_nombre ?? '',
    paciente_nombre: data.paciente_nombre ?? '',
    servicio_nombre: data.servicio_nombre ?? '',
    fecha_cita: data.fecha_cita ?? '',
    email_destino: data.email_destino,
    firmado_at,
    titulo: data.titulo ?? 'Consentimiento Informado',
    contenido: data.contenido ?? CONSENTIMIENTO_DEFAULT,
    firma_img: data.firma_img,
  })
  doc.save(`consentimiento_${(data.paciente_nombre ?? 'paciente').replace(/\s+/g, '_')}_${solicitudId.slice(0, 8)}.pdf`)
}

export function ModalFirmaConsentimiento({
  solicitudId,
  onClose,
}: {
  solicitudId: string
  onClose: () => void
}) {
  const [data, setData] = useState<FirmaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  useEffect(() => {
    fetch(`/api/consentimiento/firma?id=${solicitudId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [solicitudId])

  async function handleDescargarPDF() {
    if (!data) return
    setGenerandoPDF(true)
    try {
      await descargarPDF(data, solicitudId)
    } finally {
      setGenerandoPDF(false)
    }
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

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-gray-300" />
            </div>
          ) : !data?.firma_img ? (
            <p className="text-sm text-gray-400 text-center py-6">Firma no disponible</p>
          ) : (
            <>
              {/* Firma */}
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.firma_img} alt="Firma del paciente" className="w-full" />
              </div>

              {/* Info */}
              {data.firmado_at && (
                <div className="text-center space-y-0.5">
                  <p className="text-xs text-gray-500">
                    Firmado el {format(new Date(data.firmado_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <p className="text-xs text-gray-400">{data.email_destino}</p>
                </div>
              )}

              {/* Acciones */}
              <div className="space-y-2">
                <Button
                  onClick={handleDescargarPDF}
                  disabled={generandoPDF}
                  className="w-full gap-2 text-sm bg-purple-600 hover:bg-purple-700"
                >
                  {generandoPDF
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <FileText className="size-3.5" />
                  }
                  Descargar documento PDF completo
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
