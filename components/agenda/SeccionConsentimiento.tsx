'use client'

import { useState, useEffect } from 'react'
import { FileText, Send, CheckCircle2, Clock, AlertCircle, Loader2, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { createPortal } from 'react-dom'
import type { CitaConRelaciones } from '@/lib/agenda/queries'

type Solicitud = {
  id: string
  email_destino: string
  estado: 'pendiente' | 'firmado' | 'expirado'
  firmado_at: string | null
  created_at: string
  expires_at: string
}

type FirmaData = {
  firma_img: string | null
  firmado_at: string | null
  email_destino: string
}

function ModalFirma({ solicitudId, onClose }: { solicitudId: string; onClose: () => void }) {
  const [data, setData] = useState<FirmaData | null>(null)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Firma del paciente</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="size-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-gray-300" />
            </div>
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
                  Firmado el {format(new Date(data.firmado_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
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

export function SeccionConsentimiento({ cita }: { cita: CitaConRelaciones }) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [verFirmaId, setVerFirmaId] = useState<string | null>(null)

  const pacienteEmail = (cita.pacientes as { email?: string } | null)?.email ?? ''

  useEffect(() => {
    setEmail(pacienteEmail)
    loadSolicitudes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cita.id])

  async function loadSolicitudes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/consentimiento/status?cita_id=${cita.id}`)
      const data = await res.json()
      setSolicitudes(data.solicitudes ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/consentimiento/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cita_id: cita.id, email_destino: email.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Error al enviar')
        return
      }
      setShowForm(false)
      await loadSolicitudes()
    } finally {
      setSending(false)
    }
  }

  const latest = solicitudes[0]
  const hasPendiente = latest?.estado === 'pendiente' && new Date(latest.expires_at) > new Date()
  const firmado = solicitudes.find(s => s.estado === 'firmado')

  return (
    <div className="px-5 py-4 border-b border-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-purple-500" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            Consentimiento informado
          </p>
        </div>
        {!showForm && !firmado && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
          >
            + Enviar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="size-3.5 animate-spin text-gray-300" />
          <span className="text-xs text-gray-400">Cargando...</span>
        </div>
      ) : firmado ? (
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-green-700">Consentimiento firmado</p>
              {firmado.firmado_at && (
                <p className="text-[11px] text-green-600 mt-0.5">
                  {format(new Date(firmado.firmado_at), "d MMM 'a las' HH:mm", { locale: es })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setVerFirmaId(firmado.id)}
            className="text-[11px] text-green-700 hover:text-green-800 font-medium shrink-0 ml-2 underline underline-offset-2"
          >
            Ver firma
          </button>
        </div>
      ) : hasPendiente ? (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-700">Pendiente de firma</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Enviado a {latest.email_destino}</p>
            <p className="text-[11px] text-amber-500 mt-0.5">
              Vence {formatDistanceToNow(new Date(latest.expires_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          <button
            onClick={() => { setEmail(latest.email_destino); setShowForm(true) }}
            className="text-[11px] text-amber-600 hover:text-amber-700 font-medium shrink-0"
          >
            Reenviar
          </button>
        </div>
      ) : solicitudes.length > 0 ? (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <AlertCircle className="size-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">Link expirado sin firmar</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-1">No se ha enviado consentimiento aún.</p>
      )}

      {showForm && (
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1 block">Email del paciente</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1 text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={send} disabled={!email.trim() || sending} className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 gap-1">
              {sending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Enviar por email
            </Button>
          </div>
        </div>
      )}

      {verFirmaId && typeof document !== 'undefined' && (
        <ModalFirma solicitudId={verFirmaId} onClose={() => setVerFirmaId(null)} />
      )}
    </div>
  )
}
