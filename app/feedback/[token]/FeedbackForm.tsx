'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

const RATINGS = [
  { value: 'excelente', emoji: '😊', label: 'Excelente', bg: 'bg-green-50 border-green-300 text-green-700', selected: 'bg-green-500 border-green-500 text-white' },
  { value: 'regular',   emoji: '😐', label: 'Regular',   bg: 'bg-yellow-50 border-yellow-300 text-yellow-700', selected: 'bg-yellow-400 border-yellow-400 text-white' },
  { value: 'mala',      emoji: '😞', label: 'Mala',      bg: 'bg-red-50 border-red-300 text-red-700', selected: 'bg-red-500 border-red-500 text-white' },
]

const PREGUNTAS = [
  {
    id: 'atencion',
    label: '¿Cómo fue la atención del equipo?',
    opciones: ['Muy amable', 'Buena', 'Mejorable'],
  },
  {
    id: 'puntualidad',
    label: '¿Te atendieron a la hora?',
    opciones: ['Sí, puntual', 'Pequeña espera', 'Mucha espera'],
  },
  {
    id: 'resultado',
    label: '¿Quedaste satisfecha/o con el resultado?',
    opciones: ['Muy satisfecha/o', 'Bien', 'No tanto'],
  },
  {
    id: 'volveria',
    label: '¿Volverías con nosotros?',
    opciones: ['Sí, definitivamente', 'Probablemente', 'No sé'],
  },
]

interface Props {
  citaId: string
  clinicaId: string
  pacienteId: string | null
  initialRating?: string
  clinicaTelefono?: string | null
  clinicaSlug?: string | null
}

export function FeedbackForm({ citaId, clinicaId, initialRating, clinicaTelefono }: Props) {
  const [step, setStep] = useState<'rating' | 'preguntas' | 'done'>(initialRating ? 'preguntas' : 'rating')
  const [rating, setRating] = useState<string>(initialRating ?? '')
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleRating(r: string) {
    setRating(r)
    setStep('preguntas')
  }

  function handleRespuesta(preguntaId: string, opcion: string) {
    setRespuestas(prev => ({ ...prev, [preguntaId]: opcion }))
  }

  async function submit() {
    if (!rating) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cita_id: citaId,
          clinica_id: clinicaId,
          rating,
          respuestas,
          comentario: comentario.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setStep('done')
    } catch {
      setError('Hubo un error. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    const r = RATINGS.find(r => r.value === rating)
    return (
      <div className="text-center py-2">
        <div className="text-5xl mb-3">{r?.emoji}</div>
        <p className="text-[16px] font-semibold text-gray-900">¡Gracias por tu feedback!</p>
        <p className="text-[13px] text-gray-500 mt-1">Tu opinión nos ayuda a mejorar cada día.</p>
        {clinicaTelefono && (
          <a
            href={`https://wa.me/${clinicaTelefono.replace(/\D/g, '')}?text=Hola, me gustaría agendar una cita`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#25D366] text-white text-[13px] font-medium"
          >
            <MessageCircle className="size-4" />
            Agendar próxima cita
          </a>
        )}
      </div>
    )
  }

  if (step === 'rating') {
    return (
      <div className="space-y-4">
        <p className="text-[13px] font-medium text-gray-700 text-center">¿Cómo calificarías tu experiencia?</p>
        <div className="grid grid-cols-3 gap-2">
          {RATINGS.map(r => (
            <button
              key={r.value}
              onClick={() => handleRating(r.value)}
              className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 text-[12px] font-medium transition-all ${r.bg} hover:scale-105 active:scale-95`}
            >
              <span className="text-3xl">{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // step === 'preguntas'
  const ratingObj = RATINGS.find(r => r.value === rating)
  const allAnswered = PREGUNTAS.every(p => respuestas[p.id])

  return (
    <div className="space-y-5">
      {/* Rating seleccionado */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border-2 ${ratingObj?.selected ?? ''}`}>
        <span className="text-xl">{ratingObj?.emoji}</span>
        <span className="text-[13px] font-semibold">{ratingObj?.label}</span>
        <button
          onClick={() => setStep('rating')}
          className="ml-auto text-[11px] opacity-80 underline"
        >
          Cambiar
        </button>
      </div>

      {/* Preguntas adicionales */}
      {PREGUNTAS.map(p => (
        <div key={p.id}>
          <p className="text-[12px] font-semibold text-gray-700 mb-2">{p.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {p.opciones.map(op => (
              <button
                key={op}
                onClick={() => handleRespuesta(p.id, op)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                  respuestas[p.id] === op
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Comentario libre */}
      <div>
        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
          ¿Algo que quieras contarnos? <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="¿Qué fue lo mejor de tu visita? ¿Hay algo que podríamos mejorar?"
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={!allAnswered || loading}
        className="w-full h-11 rounded-xl bg-violet-600 text-white text-[14px] font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors"
      >
        {loading ? 'Enviando...' : allAnswered ? 'Enviar feedback' : `Faltan ${PREGUNTAS.filter(p => !respuestas[p.id]).length} respuestas`}
      </button>
    </div>
  )
}
