'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { ProfesionalRow } from '@/lib/agenda/queries'
import { getClinicaId, crearBloqueo } from '@/lib/agenda/queries'

// Slots de 15 min de 07:00 a 21:00
const TIME_SLOTS = Array.from({ length: (21 - 7) * 4 + 1 }, (_, i) => {
  const totalMin = 7 * 60 + i * 15
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

type TipoBloqueo = 'bloqueo' | 'vacaciones' | 'feriado' | 'almuerzo' | 'capacitacion'
type FrecuenciaRep = 'diario' | 'semanal' | 'mensual'

const TIPO_CONFIG: Record<TipoBloqueo, { label: string; color: string; bg: string; border: string }> = {
  bloqueo:      { label: 'Bloqueo',      color: '#6B7280', bg: 'bg-gray-100',   border: 'border-gray-300' },
  vacaciones:   { label: 'Vacaciones',   color: '#2563EB', bg: 'bg-blue-100',   border: 'border-blue-300' },
  feriado:      { label: 'Feriado',      color: '#EF4444', bg: 'bg-red-100',    border: 'border-red-300' },
  almuerzo:     { label: 'Almuerzo',     color: '#F97316', bg: 'bg-orange-100', border: 'border-orange-300' },
  capacitacion: { label: 'Capacitación', color: '#7C3AED', bg: 'bg-purple-100', border: 'border-purple-300' },
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 pr-7 text-[13px] text-gray-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer appearance-none w-full"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      {TIME_SLOTS.map((h) => (
        <option key={h} value={h}>{h}</option>
      ))}
    </select>
  )
}

function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${activo ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${activo ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
      />
    </button>
  )
}

type Props = {
  profesionalId?: string
  horaInicio?: Date
  profesionales: ProfesionalRow[]
  onGuardado: () => void
  onCerrar: () => void
}

export function ModalBloqueo({ profesionalId, horaInicio, profesionales, onGuardado, onCerrar }: Props) {
  const horaInicioDefault = horaInicio
    ? `${String(horaInicio.getHours()).padStart(2, '0')}:${String(Math.floor(horaInicio.getMinutes() / 15) * 15).padStart(2, '0')}`
    : '09:00'

  const horaFinDefault = (() => {
    const base = horaInicio ? new Date(horaInicio) : new Date()
    base.setHours(base.getHours() + 1)
    const h = base.getHours()
    const m = Math.floor(base.getMinutes() / 15) * 15
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return TIME_SLOTS.includes(timeStr) ? timeStr : TIME_SLOTS[TIME_SLOTS.length - 1]
  })()

  const fechaDefault = horaInicio ? format(horaInicio, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoBloqueo>('bloqueo')
  const [profSeleccionado, setProfSeleccionado] = useState<string>(profesionalId ?? '__todos__')
  const [fechaInicio, setFechaInicio] = useState(fechaDefault)
  const [horaInicioVal, setHoraInicioVal] = useState(horaInicioDefault)
  const [fechaFin, setFechaFin] = useState(fechaDefault)
  const [horaFinVal, setHoraFinVal] = useState(horaFinDefault)
  const [repetir, setRepetir] = useState(false)
  const [frecuencia, setFrecuencia] = useState<FrecuenciaRep>('semanal')
  const [hasta, setHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar() {
    if (!titulo.trim()) { setError('El título es requerido'); return }
    setGuardando(true)
    setError(null)

    const clinicaId = await getClinicaId()
    if (!clinicaId) { setError('No se pudo obtener la clínica'); setGuardando(false); return }

    const profId = profSeleccionado === '__todos__' ? undefined : profSeleccionado

    if (!repetir) {
      const ok = await crearBloqueo({
        clinica_id: clinicaId,
        profesional_id: profId,
        titulo: titulo.trim(),
        tipo,
        inicio: `${fechaInicio}T${horaInicioVal}:00`,
        fin: `${fechaFin}T${horaFinVal}:00`,
        motivo: motivo.trim() || undefined,
      })
      if (!ok) { setError('Error al guardar el bloqueo'); setGuardando(false); return }
    } else {
      if (!hasta) { setError('Indica la fecha límite de repetición'); setGuardando(false); return }
      const fechaLimite = parseISO(hasta)
      const diasDiff = Math.round((parseISO(fechaFin).getTime() - parseISO(fechaInicio).getTime()) / 86400000)
      const ocurrencias: Array<{
        clinica_id: string
        profesional_id: string | null
        titulo: string
        tipo: TipoBloqueo
        inicio: string
        fin: string
        motivo: string | null
      }> = []
      let idx = 0
      let fechaBase = parseISO(fechaInicio)
      while (fechaBase <= fechaLimite) {
        const fechaStr = format(fechaBase, 'yyyy-MM-dd')
        const fechaFinStr = format(addDays(fechaBase, diasDiff), 'yyyy-MM-dd')
        ocurrencias.push({
          clinica_id: clinicaId,
          profesional_id: profId ?? null,
          titulo: titulo.trim(),
          tipo,
          inicio: `${fechaStr}T${horaInicioVal}:00`,
          fin: `${fechaFinStr}T${horaFinVal}:00`,
          motivo: motivo.trim() || null,
        })
        idx++
        if (frecuencia === 'diario') fechaBase = addDays(parseISO(fechaInicio), idx)
        else if (frecuencia === 'semanal') fechaBase = addWeeks(parseISO(fechaInicio), idx)
        else fechaBase = addMonths(parseISO(fechaInicio), idx)
      }
      const supabase = createClient()
      const { error: insertError } = await supabase.from('agenda_bloqueos').insert(ocurrencias)
      if (insertError) { setError('Error al guardar los bloqueos'); setGuardando(false); return }
    }

    setGuardando(false)
    onGuardado()
  }

  const tipoConf = TIPO_CONFIG[tipo]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">Bloquear horario</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Título */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Almuerzo, Reunión, Vacaciones..."
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(TIPO_CONFIG) as [TipoBloqueo, typeof TIPO_CONFIG[TipoBloqueo]][]).map(([key, conf]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  className={`h-7 px-2.5 rounded-lg text-[12px] font-medium border transition-colors ${tipo === key ? `${conf.bg} ${conf.border} border` : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  style={tipo === key ? { color: conf.color } : undefined}
                >
                  {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profesional */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Profesional</label>
            <select
              value={profSeleccionado}
              onChange={(e) => setProfSeleccionado(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
            >
              <option value="__todos__">Todos los profesionales</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha y hora inicio */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Inicio</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => { setFechaInicio(e.target.value); if (e.target.value > fechaFin) setFechaFin(e.target.value) }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 w-full"
              />
              <TimeSelect value={horaInicioVal} onChange={setHoraInicioVal} />
            </div>
          </div>

          {/* Fecha y hora fin */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Fin</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={(e) => setFechaFin(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 w-full"
              />
              <TimeSelect value={horaFinVal} onChange={setHoraFinVal} />
            </div>
          </div>

          {/* Repetir */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-gray-700">Repetir</label>
              <Toggle activo={repetir} onChange={() => setRepetir((v) => !v)} />
            </div>

            {repetir && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Frecuencia</label>
                  <div className="flex gap-1.5">
                    {(['diario', 'semanal', 'mensual'] as FrecuenciaRep[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrecuencia(f)}
                        className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-colors ${frecuencia === f ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    min={fechaInicio}
                    onChange={(e) => setHasta(e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
              Motivo / Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Detalle adicional..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onCerrar}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: tipoConf.color }}
          >
            {guardando ? 'Guardando...' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}
