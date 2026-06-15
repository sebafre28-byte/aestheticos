'use client'

import { useEffect, useState } from 'react'
import { Cake, RotateCcw, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { getClinicaConfig, actualizarClinicaConfig, type MarketingConfig } from '@/lib/onboarding/queries'

export function SeccionMarketing() {
  const [config, setConfig] = useState<MarketingConfig>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    getClinicaConfig().then(c => {
      setConfig(c.marketing ?? {})
      setLoading(false)
    })
  }, [])

  async function guardar() {
    setGuardando(true)
    const fullConfig = await getClinicaConfig()
    await actualizarClinicaConfig({ ...fullConfig, marketing: config })
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
              <button
                type="button"
                onClick={() => setConfig(c => ({ ...c, cumpleanos: !c.cumpleanos }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${config.cumpleanos ? 'bg-pink-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${config.cumpleanos ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
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
            <p className="text-[13px] font-semibold text-gray-900">Campaña de reactivación</p>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Envía un recordatorio a pacientes que llevan tiempo sin reservar. Se dispara desde la lista de pacientes.</p>

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
    </div>
  )
}
