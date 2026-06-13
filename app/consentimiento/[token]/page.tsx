'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, Clock, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SolicitudData = {
  id: string
  estado: 'pendiente' | 'firmado' | 'expirado'
  email_destino: string
  expires_at: string
  firmado_at: string | null
  plantilla: { titulo: string; contenido: string } | null
  clinica: { nombre: string } | null
  cita: {
    inicio: string
    pacientes: { nombre: string } | null
    servicios: { nombre: string } | null
  } | null
}

export default function ConsentimientoPage() {
  const { token } = useParams<{ token: string }>()

  const [solicitud, setSolicitud] = useState<SolicitudData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'doc' | 'firma' | 'done'>('doc')
  const [signing, setSigning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStroke, setHasStroke] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    fetch(`/api/consentimiento/sign?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setSolicitud(d.solicitud)
      })
      .catch(() => setError('Error al cargar el consentimiento'))
      .finally(() => setLoading(false))
  }, [token])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      setHasStroke(true)
    }
    lastPos.current = pos
  }

  function endDraw() {
    setIsDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
  }

  async function submitFirma() {
    const canvas = canvasRef.current
    if (!canvas || !hasStroke) return
    setSigning(true)
    const firma_img = canvas.toDataURL('image/png')
    try {
      const res = await fetch('/api/consentimiento/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firma_img }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al firmar')
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al firmar')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    const isExpired = error === 'El link expiró'
    const isSigned = error === 'Ya fue firmado'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {isSigned ? (
            <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
          ) : (
            <AlertCircle className="size-12 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {isSigned ? 'Documento ya firmado' : isExpired ? 'Link expirado' : 'No encontrado'}
          </h2>
          <p className="text-sm text-gray-500">
            {isSigned
              ? 'Este consentimiento informado ya fue firmado anteriormente.'
              : isExpired
              ? 'Este link de firma ha vencido. Contacta a tu clínica para solicitar uno nuevo.'
              : 'El enlace no es válido o no existe.'}
          </p>
        </div>
      </div>
    )
  }

  if (!solicitud) return null

  if (solicitud.estado === 'firmado' || step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="size-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Firmado con éxito!</h2>
          <p className="text-sm text-gray-500 mb-1">
            Gracias, <strong>{solicitud.cita?.pacientes?.nombre}</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Tu consentimiento informado ha sido registrado correctamente.
          </p>
          <div className="mt-6 text-xs text-gray-400">
            {solicitud.firmado_at
              ? `Firmado el ${format(new Date(solicitud.firmado_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}`
              : null}
          </div>
        </div>
      </div>
    )
  }

  const isExpired = new Date(solicitud.expires_at) < new Date()
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Clock className="size-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Link expirado</h2>
          <p className="text-sm text-gray-500">
            Este enlace venció el {format(new Date(solicitud.expires_at), "d MMM 'a las' HH:mm", { locale: es })}.
            Contacta a tu clínica para solicitar uno nuevo.
          </p>
        </div>
      </div>
    )
  }

  const titulo = solicitud.plantilla?.titulo ?? 'Consentimiento Informado'
  const contenido = solicitud.plantilla?.contenido ?? ''
  const pacienteNombre = solicitud.cita?.pacientes?.nombre ?? ''
  const servicioNombre = solicitud.cita?.servicios?.nombre ?? ''
  const clinicaNombre = solicitud.clinica?.nombre ?? ''
  const fechaCita = solicitud.cita?.inicio
    ? format(new Date(solicitud.cita.inicio), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">SC</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{clinicaNombre}</p>
            <p className="text-xs text-gray-400">Firma digital de consentimiento</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Patient info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex flex-col gap-1">
            {pacienteNombre && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-400">Paciente:</span>{' '}
                <span className="font-medium">{pacienteNombre}</span>
              </p>
            )}
            {servicioNombre && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-400">Procedimiento:</span>{' '}
                <span className="font-medium">{servicioNombre}</span>
              </p>
            )}
            {fechaCita && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-400">Cita:</span>{' '}
                <span className="font-medium capitalize">{fechaCita}</span>
              </p>
            )}
          </div>
        </div>

        {step === 'doc' && (
          <>
            {/* Document */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h1 className="text-base font-bold text-gray-900">{titulo}</h1>
              </div>
              <div className="px-5 py-4">
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {contenido}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep('firma')}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
              He leído y acepto — Firmar →
            </Button>
          </>
        )}

        {step === 'firma' && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-800">Firma aquí</p>
                <p className="text-xs text-gray-400 mt-0.5">Usa tu dedo o el mouse para firmar</p>
              </div>
              <div className="p-4">
                <div className="relative rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasStroke && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-sm text-gray-300 select-none">Firma aquí</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={clearCanvas}
                  className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  <RotateCcw className="size-3" />
                  Limpiar firma
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs text-amber-700 leading-relaxed">
                Al firmar este documento confirmo que he leído, entendido y acepto el consentimiento informado.
                Esta firma tiene validez legal.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('doc')} className="flex-1 h-12">
                ← Volver
              </Button>
              <Button
                onClick={submitFirma}
                disabled={!hasStroke || signing}
                className="flex-1 h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {signing ? <Loader2 className="size-4 animate-spin" /> : 'Confirmar firma'}
              </Button>
            </div>
          </>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          Powered by SimpliClinic
        </p>
      </div>
    </div>
  )
}
