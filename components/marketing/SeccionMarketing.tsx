'use client'

import { useEffect, useState } from 'react'
import { Cake, RotateCcw, Save, Loader2, CheckCircle2, Eye, X, Star } from 'lucide-react'
import { getClinicaConfig, actualizarClinicaConfig, type MarketingConfig } from '@/lib/onboarding/queries'

type PreviewTipo = 'email_cumpleanos' | 'email_reactivacion' | 'post_cita'

export function SeccionMarketing() {
  const [config, setConfig] = useState<MarketingConfig>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [preview, setPreview] = useState<PreviewTipo | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [postCitaActivo, setPostCitaActivo] = useState(true)

  useEffect(() => {
    getClinicaConfig().then(c => {
      setConfig(c.marketing ?? {})
      const emailCfg = c.recordatorios_email
      if (emailCfg) setPostCitaActivo(emailCfg.post_cita ?? true)
      setLoading(false)
    })
  }, [])

  async function openPreview(tipo: PreviewTipo) {
    setPreview(tipo)
    setPreviewHtml(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/email/preview?tipo=${tipo}`)
      const html = await res.text()
      setPreviewHtml(html)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function guardar() {
    setGuardando(true)
    const fullConfig = await getClinicaConfig()
    const recordatoriosEmail = {
      ...(fullConfig.recordatorios_email ?? { manana: true, hoy: true, hoy_horas_antes: 2, post_cita: true }),
      post_cita: postCitaActivo,
    }
    await actualizarClinicaConfig({ ...fullConfig, marketing: config, recordatorios_email: recordatoriosEmail })
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[14px] font-semibold text-gray-900">Marketing automático</h2>
        <p className="text-[12px] text-gray-500 mt-0.5">Activa y personaliza los envíos automáticos. El sistema se encarga solo.</p>
      </div>

      {/* Post-cita (feedback) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <Star className="size-4 text-violet-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Email post-consulta (feedback)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Se envía 1–3 h después de la cita. Incluye encuesta de satisfacción con 4 preguntas y comentario libre.</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => openPreview('post_cita')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="size-3.5" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => setPostCitaActivo(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${postCitaActivo ? 'bg-violet-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${postCitaActivo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cumpleaños */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center">
            <Cake className="size-4 text-pink-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Email de cumpleaños</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Envía un email personalizado a cada paciente el día de su cumpleaños</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => openPreview('email_cumpleanos')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="size-3.5" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, cumpleanos: !c.cumpleanos }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.cumpleanos ? 'bg-pink-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${config.cumpleanos ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {config.cumpleanos && (
              <div className="mt-3">
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Mensaje personalizado (opcional)</label>
                <textarea
                  value={config.mensaje_cumpleanos ?? ''}
                  onChange={e => setConfig(c => ({ ...c, mensaje_cumpleanos: e.target.value }))}
                  placeholder="¡Feliz cumpleaños! En nuestra clínica te deseamos un día especial..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">Si lo dejas vacío, se usa el mensaje por defecto.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactivación */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <RotateCcw className="size-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Campaña de reactivación</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Envía un recordatorio a pacientes que llevan tiempo sin reservar.</p>
              </div>
              <button
                onClick={() => openPreview('email_reactivacion')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors ml-4 shrink-0"
              >
                <Eye className="size-3.5" />
                Ver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Días sin cita para considerar inactivo</label>
                <select
                  value={config.reactivacion_dias ?? 60}
                  onChange={e => setConfig(c => ({ ...c, reactivacion_dias: parseInt(e.target.value) as 30 | 45 | 60 | 90 }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 días</option>
                  <option value={45}>45 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Mensaje personalizado (opcional)</label>
              <textarea
                value={config.mensaje_reactivacion ?? ''}
                onChange={e => setConfig(c => ({ ...c, mensaje_reactivacion: e.target.value }))}
                placeholder="¡Te echamos de menos! Reserva tu próxima cita y recibe atención de primera..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Automático */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-gray-800">Envío automático semanal</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cada lunes ~10:00 hrs (Chile) el sistema envía solo, sin que hagas nada.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, reactivacion_auto: !c.reactivacion_auto }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${config.reactivacion_auto ? 'bg-blue-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${config.reactivacion_auto ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {!config.reactivacion_auto && (
                <p className="text-[11px] text-slate-400 mt-2">También puedes disparar la campaña manualmente desde Pacientes → &quot;Reactivar pacientes&quot;.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={guardar}
        disabled={guardando}
        className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {guardando ? <Loader2 className="size-3.5 animate-spin" /> : guardado ? <CheckCircle2 className="size-3.5" /> : <Save className="size-3.5" />}
        {guardado ? '¡Guardado!' : 'Guardar configuración'}
      </button>

      {/* Preview modal */}
      {preview && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setPreview(null)} />
          <div className="fixed inset-4 sm:inset-8 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-[13px] font-semibold text-gray-900">
                Vista previa —{' '}
                {preview === 'email_cumpleanos' ? 'Email de cumpleaños' :
                 preview === 'email_reactivacion' ? 'Campaña de reactivación' :
                 'Post-consulta (feedback)'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">datos de ejemplo</span>
                <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="size-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-6 animate-spin text-slate-400" />
                </div>
              ) : previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Vista previa del email"
                  sandbox="allow-same-origin"
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
