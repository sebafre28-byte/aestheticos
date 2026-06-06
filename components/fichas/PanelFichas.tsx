'use client'

import { useEffect, useState } from 'react'
import { useRol } from '@/lib/auth/useRol'
import { getFichasPaciente, crearFicha, eliminarFicha, type FichaClinica } from '@/lib/fichas/queries'
import { TEMPLATES, TIPOS_TRATAMIENTO, type TipoTratamiento } from '@/lib/fichas/templates'
import { ChevronDown, ChevronUp, FileText, Loader2, Plus, Trash2, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  pacienteId: string
  onCountChange?: (n: number) => void
}

export default function PanelFichas({ pacienteId, onCountChange }: Props) {
  const { rol } = useRol()
  const [fichas, setFichas] = useState<FichaClinica[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [tipo, setTipo] = useState<TipoTratamiento>('general')
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const puedeEliminar = rol === 'admin' || rol === 'profesional'

  useEffect(() => {
    getFichasPaciente(pacienteId).then((data) => {
      setFichas(data)
      setLoading(false)
      onCountChange?.(data.length)
    })
  }, [pacienteId]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() { setTipo('general'); setCampos({}); setNotas(''); setCreando(false) }

  async function handleGuardar() {
    setGuardando(true)
    const contenido: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(campos)) if (v) contenido[k] = v
    const ficha = await crearFicha({ paciente_id: pacienteId, tipo_tratamiento: tipo, contenido, notas: notas || null })
    if (ficha) {
      setFichas((prev) => {
        const next = [ficha, ...prev]
        onCountChange?.(next.length)
        return next
      })
      resetForm()
    }
    setGuardando(false)
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta ficha?')) return
    const ok = await eliminarFicha(id)
    if (ok) {
      setFichas((prev) => {
        const next = prev.filter((f) => f.id !== id)
        onCountChange?.(next.length)
        return next
      })
    }
  }

  const template = TEMPLATES[tipo]

  return (
    <div className="space-y-3">
      {!creando && (
        <button
          onClick={() => setCreando(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <Plus className="size-4" /> Nueva ficha clínica
        </button>
      )}

      {creando && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-gray-700">Nueva ficha</p>
            <button onClick={resetForm} className="p-2 -mr-2 rounded-lg hover:bg-gray-100"><X className="size-4 text-gray-400" /></button>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Tipo de tratamiento</label>
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TIPOS_TRATAMIENTO.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTipo(t); setCampos({}) }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${tipo === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                  {TEMPLATES[t].label}
                </button>
              ))}
            </div>
          </div>

          {template.campos.map((campo) => (
            <div key={campo.key}>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                {campo.label}{campo.requerido && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {campo.tipo === 'select' ? (
                <select
                  value={campos[campo.key] ?? ''}
                  onChange={(e) => setCampos((p) => ({ ...p, [campo.key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                >
                  <option value="">Seleccionar...</option>
                  {campo.opciones?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : campo.tipo === 'textarea' ? (
                <textarea
                  rows={2}
                  value={campos[campo.key] ?? ''}
                  onChange={(e) => setCampos((p) => ({ ...p, [campo.key]: e.target.value }))}
                  placeholder={campo.placeholder}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              ) : (
                <input
                  type={campo.tipo}
                  value={campos[campo.key] ?? ''}
                  onChange={(e) => setCampos((p) => ({ ...p, [campo.key]: e.target.value }))}
                  placeholder={campo.placeholder}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              )}
            </div>
          ))}

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Notas adicionales</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, indicaciones post-tratamiento..."
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </div>

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar ficha'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Loader2 className="size-6 animate-spin mb-2 text-blue-400" />
          <p className="text-[13px]">Cargando fichas...</p>
        </div>
      ) : fichas.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-300">
          <FileText className="size-10 mb-3" />
          <p className="text-[13px] text-gray-400 font-medium">Sin fichas clínicas aún</p>
          <p className="text-[12px] text-gray-400 mt-1 text-center">Crea la primera ficha para documentar el tratamiento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fichas.map((ficha) => {
            const tmpl = TEMPLATES[ficha.tipo_tratamiento as TipoTratamiento] ?? TEMPLATES.general
            const abierto = expandido === ficha.id
            return (
              <div key={ficha.id} className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => setExpandido(abierto ? null : ficha.id)}
                >
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tmpl.color}`}>{tmpl.label}</span>
                    <span className="text-[12px] font-medium text-gray-700">
                      {format(parseISO(ficha.created_at), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {puedeEliminar && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); handleEliminar(ficha.id) }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    )}
                    {abierto ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                  </div>
                </button>

                {abierto && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-50">
                    {tmpl.campos.map((campo) => {
                      const val = (ficha.contenido as Record<string, string>)[campo.key]
                      if (!val) return null
                      return (
                        <div key={campo.key}>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-2">{campo.label}</p>
                          <p className="text-[13px] text-gray-700">{val}</p>
                        </div>
                      )
                    })}
                    {ficha.notas && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-2">Notas</p>
                        <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{ficha.notas}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
