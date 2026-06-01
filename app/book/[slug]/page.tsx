'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChevronLeft, Loader2, MapPin, Phone, Mail, Clock, DollarSign } from 'lucide-react'
import { sendEmail } from '@/lib/email/sendEmail'

// ─── Types ────────────────────────────────────────────────────────────────────

type Servicio = {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  precio: number
  color: string
  buffer_minutos: number
}

type Profesional = {
  id: string
  nombre: string
  especialidad: string | null
  color: string
}

type HorarioDia = {
  activo: boolean
  desde: string
  hasta: string
}

type ClinicaPublica = {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  logo_url: string | null
  configuracion: {
    horarios?: Record<string, HorarioDia>
  } | null
  servicios: Servicio[]
  profesionales: Profesional[]
}

type SlotOcupado = {
  inicio: string
  fin: string
  profesional_id: string
  buffer_minutos?: number
}

type FormData = {
  nombre: string
  telefono: string
  email: string
  notas: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS_ES: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
}

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const DEFAULT_TZ = 'America/Santiago'

function toLocalDate(date: Date, tz: string = DEFAULT_TZ): Date {
  const str = date.toLocaleString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Wall-clock ISO string (no offset) matching modalWallClockToIso format used by agenda modal */
function toWallClockIso(date: Date, tz: string = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildSlotsDisponibles(
  horarioDia: HorarioDia,
  duracionMin: number,
  slotsOcupados: SlotOcupado[],
  fecha: Date,
  profesionalId: string,
  tz: string = DEFAULT_TZ,
): Date[] {
  const slots: Date[] = []
  const [desdeH, desdeM] = horarioDia.desde.split(':').map(Number)
  const [hastaH, hastaM] = horarioDia.hasta.split(':').map(Number)
  const fechaStr = formatDateISO(fecha)

  let current = desdeH * 60 + desdeM
  const finMin = hastaH * 60 + hastaM

  while (current + duracionMin <= finMin) {
    const h = Math.floor(current / 60)
    const m = current % 60
    // Use naive wall-clock ISO (no offset) to match how agenda modal saves citas
    const slotInicioStr = `${fechaStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const slotFinMin = current + duracionMin
    const fh = Math.floor(slotFinMin / 60)
    const fm = slotFinMin % 60
    const slotFinStr = `${fechaStr}T${String(fh).padStart(2, '0')}:${String(fm).padStart(2, '0')}:00`

    // For overlap comparison, compare as wall-clock strings (lexicographic is safe for same-day)
    const ocupado = slotsOcupados.some((s) => {
      if (s.profesional_id !== profesionalId) return false
      // Normalize occupied slot to wall-clock for comparison, extending fin by buffer_minutos
      const oInicioWall = toWallClockIso(new Date(s.inicio), tz)
      const bufferMs = (s.buffer_minutos ?? 0) * 60_000
      const oFinWall = toWallClockIso(new Date(new Date(s.fin).getTime() + bufferMs), tz)
      return slotInicioStr < oFinWall && slotFinStr > oInicioWall
    })

    if (!ocupado) {
      // Store wall-clock as Date for display purposes only
      slots.push(new Date(slotInicioStr))
    }

    current += duracionMin
  }

  return slots
}

function formatHora(date: Date, tz: string = DEFAULT_TZ): string {
  return date.toLocaleTimeString('es-CL', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatPrecio(precio: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(precio)
}

function getInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ paso, total }: { paso: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < paso ? 'bg-[#2563EB] w-8' : i === paso ? 'bg-[#2563EB] w-8' : 'bg-gray-200 w-4'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Paso 1: Servicio ─────────────────────────────────────────────────────────

function PasoServicio({ servicios, onSelect }: { servicios: Servicio[]; onSelect: (s: Servicio) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">¿Qué servicio necesitas?</h2>
      <p className="text-sm text-gray-500 mb-5">Selecciona el tratamiento que deseas reservar</p>
      {servicios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Esta clínica no tiene servicios disponibles por ahora.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {servicios.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: s.color || '#2563EB' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0B132B] text-[15px] group-hover:text-[#2563EB] transition-colors">{s.nombre}</p>
                  {s.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" /> {s.duracion_minutos} min
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-[#14B8A6]">
                      <DollarSign className="w-3 h-3" /> {formatPrecio(s.precio)}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-[#2563EB] rotate-180 shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Paso 2: Profesional y fecha ──────────────────────────────────────────────

function PasoProfesionalFecha({
  profesionales,
  profesionalId,
  onProfesional,
  fechaSeleccionada,
  onFecha,
  horarios,
  tz = DEFAULT_TZ,
}: {
  profesionales: Profesional[]
  profesionalId: string | null
  onProfesional: (id: string) => void
  fechaSeleccionada: Date | null
  onFecha: (d: Date) => void
  horarios: Record<string, HorarioDia> | undefined
  tz?: string
}) {
  const today = toLocalDate(new Date(), tz)
  const dias: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  function isDiaActivo(d: Date): boolean {
    if (!horarios) return true
    const nombreDia = DIAS_ES[d.getDay()]
    const h = horarios[nombreDia]
    return h?.activo !== false
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">Elige profesional y fecha</h2>
      <p className="text-sm text-gray-500 mb-5">¿Con quién y cuándo te gustaría ser atendido?</p>

      {profesionales.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Profesional</p>
          <div className="grid gap-2">
            {profesionales.map((p) => (
              <button
                key={p.id}
                onClick={() => onProfesional(p.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  profesionalId === p.id
                    ? 'border-[#2563EB] bg-blue-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: p.color || '#2563EB' }}
                >
                  {getInitials(p.nombre)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#0B132B] text-sm">{p.nombre}</p>
                  {p.especialidad && <p className="text-xs text-gray-500">{p.especialidad}</p>}
                </div>
                {profesionalId === p.id && (
                  <div className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Fecha</p>
      <div className="grid grid-cols-4 gap-2">
        {dias.map((d) => {
          const activo = isDiaActivo(d)
          const seleccionado = fechaSeleccionada && formatDateISO(d) === formatDateISO(fechaSeleccionada)
          return (
            <button
              key={d.toISOString()}
              disabled={!activo}
              onClick={() => onFecha(d)}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                !activo
                  ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                  : seleccionado
                  ? 'border-[#2563EB] bg-[#2563EB] text-white'
                  : 'border-gray-200 hover:border-[#2563EB] hover:bg-blue-50/30'
              }`}
            >
              <span className={`text-[10px] uppercase font-medium ${seleccionado ? 'text-blue-100' : 'text-gray-400'}`}>
                {DIAS_ES[d.getDay()].slice(0, 3)}
              </span>
              <span className={`text-lg font-bold leading-tight ${seleccionado ? 'text-white' : 'text-[#0B132B]'}`}>
                {d.getDate()}
              </span>
              <span className={`text-[10px] ${seleccionado ? 'text-blue-100' : 'text-gray-400'}`}>
                {MESES_ES[d.getMonth()].slice(0, 3)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Paso 3: Hora ─────────────────────────────────────────────────────────────

function PasoHora({
  fecha,
  horarios,
  servicio,
  profesionalId,
  clinicaId,
  onSelect,
  tz = DEFAULT_TZ,
}: {
  fecha: Date
  horarios: Record<string, HorarioDia> | undefined
  servicio: Servicio
  profesionalId: string
  clinicaId: string
  onSelect: (inicio: Date, fin: Date) => void
  tz?: string
}) {
  const [slots, setSlots] = useState<Date[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarSlots = useCallback(async () => {
    setCargando(true)
    const supabase = createClient()
    const fechaISO = formatDateISO(fecha)
    const [{ data }, { data: bloqueosData }] = await Promise.all([
      supabase.rpc('get_slots_ocupados', {
        p_clinica_id: clinicaId,
        p_fecha: fechaISO,
        p_profesional_id: profesionalId,
      }),
      supabase
        .from('agenda_bloqueos')
        .select('inicio, fin, profesional_id')
        .eq('clinica_id', clinicaId)
        .gte('inicio', `${fechaISO}T00:00:00`)
        .lte('fin', `${fechaISO}T23:59:59`),
    ])
    const ocupados: SlotOcupado[] = Array.isArray(data) ? data : []

    const nombreDia = DIAS_ES[fecha.getDay()]
    const horarioDia = horarios?.[nombreDia]
    if (!horarioDia || !horarioDia.activo) {
      setSlots([])
      setCargando(false)
      return
    }

    const bloqueos: Array<{ inicio: string; fin: string; profesional_id: string | null }> = Array.isArray(bloqueosData) ? bloqueosData : []

    let disponibles = buildSlotsDisponibles(horarioDia, servicio.duracion_minutos, ocupados, fecha, profesionalId, tz)

    // Filtrar slots que se solapan con bloqueos (para todos los profesionales o el específico)
    if (bloqueos.length > 0) {
      const duracionMs = servicio.duracion_minutos * 60 * 1000
      disponibles = disponibles.filter((slot) => {
        const slotInicioMs = slot.getTime()
        const slotFinMs = slotInicioMs + duracionMs
        return !bloqueos.some((b) => {
          if (b.profesional_id !== null && b.profesional_id !== profesionalId) return false
          const bInicioMs = new Date(b.inicio).getTime()
          const bFinMs = new Date(b.fin).getTime()
          return slotInicioMs < bFinMs && slotFinMs > bInicioMs
        })
      })
    }

    setSlots(disponibles)
    setCargando(false)
  }, [fecha, clinicaId, profesionalId, horarios, servicio.duracion_minutos])

  useEffect(() => {
    cargarSlots()
  }, [cargarSlots])

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
        <span className="ml-2 text-sm text-gray-500">Cargando horarios…</span>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">¿A qué hora?</h2>
      <p className="text-sm text-gray-500 mb-5">
        {fecha.getDate()} de {MESES_ES[fecha.getMonth()]} · {servicio.nombre} ({servicio.duracion_minutos} min)
      </p>

      {slots.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Sin horarios disponibles</p>
          <p className="text-xs text-gray-400 mt-1">Intenta con otra fecha o profesional</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const fin = new Date(slot)
            fin.setMinutes(fin.getMinutes() + servicio.duracion_minutos)
            // slot is wall-clock Date (no timezone), display hours directly
            const slotLabel = `${String(slot.getHours()).padStart(2,'0')}:${String(slot.getMinutes()).padStart(2,'0')}`
            return (
              <button
                key={slotLabel}
                onClick={() => onSelect(slot, fin)}
                className="py-2.5 px-2 rounded-xl border border-gray-200 text-center text-sm font-medium text-[#0B132B] hover:border-[#2563EB] hover:bg-blue-50/30 hover:text-[#2563EB] transition-all"
              >
                {slotLabel}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Paso 4: Datos del paciente ───────────────────────────────────────────────

function PasoDatos({
  servicio,
  profesional,
  inicio,
  fin,
  clinica,
  clinicaId,
  profesionalId,
  servicioId,
  onExito,
  tz = DEFAULT_TZ,
}: {
  servicio: Servicio
  profesional: Profesional | null
  inicio: Date
  fin: Date
  clinica: ClinicaPublica
  clinicaId: string
  profesionalId: string
  servicioId: string
  onExito: (citaId: string) => void
  tz?: string
}) {
  const [form, setForm] = useState<FormData>({ nombre: '', telefono: '', email: '', notas: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.telefono.trim()) { setError('El teléfono es requerido.'); return }
    setEnviando(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('crear_reserva_publica', {
      p_clinica_id: clinicaId,
      p_servicio_id: servicioId,
      p_profesional_id: profesionalId,
      // Save wall-clock ISO (no offset) to match agenda modal format for consistent conflict detection
      p_inicio: toWallClockIso(inicio, tz),
      p_fin: toWallClockIso(fin, tz),
      p_paciente_nombre: form.nombre.trim(),
      p_paciente_telefono: form.telefono.trim(),
      p_paciente_email: form.email.trim() || null,
      p_notas: form.notas.trim() || null,
    })

    setEnviando(false)
    if (rpcError) {
      setError(rpcError.message || 'No se pudo crear la reserva.')
      return
    }
    const result = data as { ok: boolean; error?: string; cita_id?: string }
    if (!result.ok) {
      setError(result.error || 'No se pudo crear la reserva.')
      return
    }

    // Send confirmation email if patient provided an email (non-critical)
    if (form.email.trim()) {
      const fechaLabel = inicio.toLocaleDateString('es-CL', {
        timeZone: tz,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      const horaLabel = formatHora(inicio, tz)
      sendEmail({
        tipo: 'confirmacion_cita',
        destinatario: form.email.trim(),
        datos: {
          paciente_nombre: form.nombre.trim(),
          servicio_nombre: servicio.nombre,
          profesional_nombre: profesional?.nombre ?? 'Por asignar',
          fecha: fechaLabel,
          hora: horaLabel,
          clinica_nombre: clinica.nombre,
          clinica_telefono: clinica.telefono ?? undefined,
        },
      }).catch((err) => console.warn('[booking] sendEmail error (non-critical):', err))
    }

    onExito(result.cita_id ?? '')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">Tus datos</h2>
      <p className="text-sm text-gray-500 mb-5">Último paso — confirma tus datos para reservar</p>

      {/* Resumen */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-5 space-y-1">
        <p className="text-sm font-semibold text-[#0B132B]">{servicio.nombre}</p>
        {profesional && <p className="text-xs text-gray-500">Con {profesional.nombre}</p>}
        <p className="text-xs text-gray-500">
          {inicio.toLocaleDateString('es-CL', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' })} a las {formatHora(inicio, tz)}
        </p>
        <p className="text-xs font-medium text-[#14B8A6]">{formatPrecio(servicio.precio)} · {servicio.duracion_minutos} min</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Ej: María González"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono <span className="text-red-400">*</span></label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => setForm(p => ({ ...p, telefono: e.target.value }))}
            placeholder="+56 9 XXXX XXXX"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="tu@email.com"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm(p => ({ ...p, notas: e.target.value }))}
            placeholder="Alguna indicación especial…"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando…</> : 'Confirmar reserva'}
        </button>
      </form>
    </div>
  )
}

// ─── Pantalla de éxito ────────────────────────────────────────────────────────

function PantallaExito({
  clinica,
  servicio,
  profesional,
  inicio,
  fin,
  tz = DEFAULT_TZ,
}: {
  clinica: ClinicaPublica
  servicio: Servicio
  profesional: Profesional | null
  inicio: Date
  fin: Date
  tz?: string
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-[#0B132B] mb-1">¡Tu cita está confirmada!</h2>
      <p className="text-sm text-gray-500 mb-6">Te esperamos en {clinica.nombre}</p>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 text-left space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: servicio.color || '#2563EB' }} />
          <div>
            <p className="text-sm font-semibold text-[#0B132B]">{servicio.nombre}</p>
            <p className="text-xs text-gray-500">{servicio.duracion_minutos} min · {formatPrecio(servicio.precio)}</p>
          </div>
        </div>
        {profesional && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: profesional.color || '#2563EB' }}>
              {getInitials(profesional.nombre)}
            </div>
            <p className="text-sm text-gray-700">{profesional.nombre}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            {inicio.toLocaleDateString('es-CL', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' })} a las {formatHora(inicio, tz)} — {formatHora(fin, tz)}
          </span>
        </div>
        {clinica.direccion && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span>{clinica.direccion}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">Si necesitas cancelar o modificar tu cita, comunícate directamente con la clínica.</p>
      {clinica.telefono && (
        <a href={`tel:${clinica.telefono}`} className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-[#2563EB] hover:underline">
          <Phone className="w-3.5 h-3.5" /> {clinica.telefono}
        </a>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BookingPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const [clinica, setClinica] = useState<ClinicaPublica | null>(null)
  const [cargando, setCargando] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Wizard state
  const [paso, setPaso] = useState(0)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [profesionalId, setProfesionalId] = useState<string | null>(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null)
  const [horaInicio, setHoraInicio] = useState<Date | null>(null)
  const [horaFin, setHoraFin] = useState<Date | null>(null)
  const [citaId, setCitaId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_clinica_publica', { p_slug: slug }).then(({ data, error }) => {
      if (error || !data) {
        setNotFound(true)
      } else {
        const c = data as ClinicaPublica
        setClinica(c)
        // Auto-select if only one profesional
        if (c.profesionales.length === 1) {
          setProfesionalId(c.profesionales[0].id)
        }
      }
      setCargando(false)
    })
  }, [slug])

  function handleSelectServicio(s: Servicio) {
    setServicioSeleccionado(s)
    setPaso(1)
  }

  function handleFecha(d: Date) {
    setFechaSeleccionada(d)
    setPaso(2)
  }

  function handleProfesional(id: string) {
    setProfesionalId(id)
  }

  function handleHora(inicio: Date, fin: Date) {
    setHoraInicio(inicio)
    setHoraFin(fin)
    setPaso(3)
  }

  function handleExito(id: string) {
    setCitaId(id)
    setPaso(4)
  }

  function goBack() {
    if (paso > 0) setPaso(paso - 1)
  }

  // Loading
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  // 404
  if (notFound || !clinica) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
            <span className="text-white text-2xl font-bold">?</span>
          </div>
          <h1 className="text-xl font-bold text-[#0B132B] mb-2">Clínica no encontrada</h1>
          <p className="text-sm text-gray-500">El enlace de reservas que usaste no existe o fue desactivado. Contacta a la clínica directamente.</p>
        </div>
      </div>
    )
  }

  const tz = (clinica.configuracion as { timezone?: string } | null)?.timezone ?? DEFAULT_TZ
  const horarios = clinica.configuracion?.horarios
  const profesional = clinica.profesionales.find(p => p.id === profesionalId) ?? null

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFF' }}>
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
          {clinica.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinica.logo_url} alt={clinica.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-bold">{clinica.nombre[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0B132B] truncate">{clinica.nombre}</p>
          {clinica.direccion && (
            <p className="text-xs text-gray-400 flex items-center gap-0.5 truncate">
              <MapPin className="w-2.5 h-2.5 shrink-0" /> {clinica.direccion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {clinica.telefono && (
            <a href={`tel:${clinica.telefono}`} className="text-gray-400 hover:text-[#2563EB] transition-colors">
              <Phone className="w-4 h-4" />
            </a>
          )}
          {clinica.email && (
            <a href={`mailto:${clinica.email}`} className="text-gray-400 hover:text-[#2563EB] transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Back button */}
        {paso > 0 && paso < 4 && (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2563EB] transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
        )}

        {/* Step indicator */}
        {paso < 4 && <StepIndicator paso={paso} total={4} />}

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {paso === 0 && (
            <PasoServicio servicios={clinica.servicios} onSelect={handleSelectServicio} />
          )}

          {paso === 1 && servicioSeleccionado && (
            <>
              <PasoProfesionalFecha
                profesionales={clinica.profesionales}
                profesionalId={profesionalId}
                onProfesional={handleProfesional}
                fechaSeleccionada={fechaSeleccionada}
                onFecha={handleFecha}
                horarios={horarios}
                tz={tz}
              />
              {/* Auto-advance only when date is selected; profesional is pre-selected if only one */}
            </>
          )}

          {paso === 2 && servicioSeleccionado && profesionalId && fechaSeleccionada && (
            <PasoHora
              fecha={fechaSeleccionada}
              horarios={horarios}
              servicio={servicioSeleccionado}
              profesionalId={profesionalId}
              clinicaId={clinica.id}
              onSelect={handleHora}
              tz={tz}
            />
          )}

          {paso === 3 && servicioSeleccionado && profesionalId && horaInicio && horaFin && (
            <PasoDatos
              servicio={servicioSeleccionado}
              profesional={profesional}
              inicio={horaInicio}
              fin={horaFin}
              clinica={clinica}
              clinicaId={clinica.id}
              profesionalId={profesionalId}
              servicioId={servicioSeleccionado.id}
              onExito={handleExito}
              tz={tz}
            />
          )}

          {paso === 4 && servicioSeleccionado && horaInicio && horaFin && (
            <PantallaExito
              clinica={clinica}
              servicio={servicioSeleccionado}
              profesional={profesional}
              inicio={horaInicio}
              fin={horaFin}
              tz={tz}
            />
          )}
        </div>

        {citaId && paso === 4 && (
          <p className="text-center text-xs text-gray-400 mt-3">Ref. {citaId.slice(0, 8).toUpperCase()}</p>
        )}
      </div>
    </div>
  )
}
