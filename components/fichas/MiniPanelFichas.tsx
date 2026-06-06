'use client'

import { useEffect, useState } from 'react'
import { useRol } from '@/lib/auth/useRol'
import { getFichasPaciente, crearFicha, type FichaClinica } from '@/lib/fichas/queries'
import { TEMPLATES, TIPOS_TRATAMIENTO, type TipoTratamiento } from '@/lib/fichas/templates'
import { ChevronDown, ChevronUp, FileText, Loader2, Plus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function MiniPanelFichas({ pacienteId }: { pacienteId: string }) {
  const { rol } = useRol()
  const [fichas, setFichas] = useState<FichaClinica[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(false)
  const [creando, setCreando] = useState(false)
  const [tipo, setTipo] = useState<TipoTratamiento>('general')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const puedeEscribir = rol === 'admin' || rol === 'profesional'

  useEffect(() => {
    getFichasPaciente(pacienteId).then((data) => { setFichas(data); setLoading(false) })
  }, [pacienteId])

  function resetForm() { setTipo('general'); setNotas(''); setCreando(false) }

  async function handleGuardar() {
    setGuardando(true)
    const ficha = await crearFicha({ paciente_id: pacienteId, tipo_tratamiento: tipo, contenido: {}, notas: notas || null })
    if (ficha) {
      setFichas((prev) => [ficha, ...prev])
      resetForm()
    }
    setGuardando(false)
  }

  const ultimas = fichas.slice(0, 3)

  return (
    <div className="px-5 py-4 border-t border-gray-50">
      <button
        className="w-full flex items-center justify-between mb-2"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-blue-500" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            Fichas clínicas {fichas.length > 0 && `(${fichas.length})`}
          </p>
        </div>
        {expandido ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>

      {expandido && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
              <Loader2 className="size-3.5 animate-spin" />
              Cargando fichas...
            </div>
          ) : ultimas.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">Sin fichas clínicas</p>
          ) : (
            <div className="space-y-1.5">
              {ultimas.map((ficha) => {
                const tmpl = TEMPLATES[ficha.tipo_tratamiento as TipoTratamiento] ?? TEMPLATES.general
                return (
                  <div key={ficha.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${tmpl.color}`}>{tmpl.label}</span>
                    <p className="text-[11px] text-gray-500 flex-1">
                      {format(parseISO(ficha.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                )
              })}
              {fichas.length > 3 && (
                <p className="text-[11px] text-gray-400 text-center">+{fichas.length - 3} más en la ficha del paciente</p>
              )}
            </div>
          )}

          {puedeEscribir && !creando && (
            <button
              onClick={() => setCreando(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-200 text-[12px] text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="size-3.5" /> Nueva ficha rápida
            </button>
          )}

          {puedeEscribir && creando && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-700">Ficha rápida</p>
                <button onClick={resetForm} className="p-1 rounded hover:bg-gray-100"><X className="size-3.5 text-gray-400" /></button>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Tipo</label>
                <div className="flex gap-1 mt-1 overflow-x-auto pb-1 scrollbar-none">
                  {TIPOS_TRATAMIENTO.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${tipo === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                    >
                      {TEMPLATES[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Notas</label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones del tratamiento..."
                  className="mt-1 w-full px-2 py-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>

              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
