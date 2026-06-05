'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChevronLeft, Loader2, MapPin, Phone, Mail, Clock, DollarSign, Check } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'

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

type DisponibilidadProfesional = {
  dia_semana: number // 1=lun … 7=dom (ISO)
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

type Profesional = {
  id: string
  nombre: string
  especialidad: string | null
  color: string
  foto_url?: string | null
  bio?: string | null
  servicios_ids?: string[]
  disponibilidad?: DisponibilidadProfesional[]
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
  rut: string
}

// ─── RUT helpers ──────────────────────────────────────────────────────────────

function limpiarRut(rut: string) {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase()
}

function formatearRut(rut: string): string {
  const clean = limpiarRut(rut)
  if (clean.length < 2) return clean
  const cuerpo = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

function validarRutChileno(rut: string): boolean {
  const clean = limpiarRut(rut)
  if (clean.length < 2) return false
  const cuerpo = clean.slice(0, -1)
  const dvIngresado = clean.slice(-1).toLowerCase()
  let suma = 0, multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const dvEsperado = 11 - (suma % 11)
  const dv = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : String(dvEsperado)
  return dvIngresado === dv
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

    // Slots ocupados usan wall-clock almacenado como UTC en timestamptz.
    // toISOString() recupera el componente UTC que ES el wall-clock original.
    const ocupado = slotsOcupados.some((s) => {
      if (s.profesional_id !== profesionalId) return false
      const oInicioWall = new Date(s.inicio).toISOString().slice(0, 19)
      const bufferMs = (s.buffer_minutos ?? 0) * 60_000
      const oFinWall = new Date(new Date(s.fin).getTime() + bufferMs).toISOString().slice(0, 19)
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
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        i < paso ? (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
        ) : i === paso ? (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0"
          >
            <span className="text-white text-xs font-bold">{i + 1}</span>
          </div>
        ) : (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 opacity-50"
          >
            <span className="text-gray-500 text-xs font-bold">{i + 1}</span>
          </div>
        )
      ))}
    </div>
  )
}

// ─── Paso 1: Servicio ─────────────────────────────────────────────────────────

function PasoServicio({
  servicios,
  onSelect,
  profesionalId,
  profesionales,
}: {
  servicios: Servicio[]
  onSelect: (s: Servicio) => void
  profesionalId?: string | null
  profesionales?: Profesional[]
}) {
  // Si hay un profesional preseleccionado con servicios configurados, filtrar
  const profesionalActual = profesionalId && profesionales ? profesionales.find(p => p.id === profesionalId) : null
  const serviciosFiltrados = profesionalActual?.servicios_ids && profesionalActual.servicios_ids.length > 0
    ? servicios.filter(s => profesionalActual.servicios_ids!.includes(s.id))
    : servicios

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">¿Qué servicio necesitas?</h2>
      <p className="text-sm text-gray-500 mb-5">Selecciona el tratamiento que deseas reservar</p>
      {serviciosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Esta clínica no tiene servicios disponibles por ahora.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {serviciosFiltrados.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left rounded-xl border border-gray-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-all group overflow-hidden"
            >
              <div className="flex items-stretch">
                <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: s.color || '#2563EB' }} />
                <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0B132B] text-[15px] group-hover:text-[#2563EB] transition-colors">{s.nombre}</p>
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
  servicioId,
}: {
  profesionales: Profesional[]
  profesionalId: string | null
  onProfesional: (id: string) => void
  fechaSeleccionada: Date | null
  onFecha: (d: Date) => void
  horarios: Record<string, HorarioDia> | undefined
  tz?: string
  servicioId?: string | null
}) {
  // Filtrar profesionales por servicio seleccionado si tienen servicios_ids configurados
  const algunoTieneServicios = profesionales.some(p => p.servicios_ids && p.servicios_ids.length > 0)
  const profesionalesFiltrados = servicioId && algunoTieneServicios
    ? profesionales.filter(p => !p.servicios_ids || p.servicios_ids.length === 0 || p.servicios_ids.includes(servicioId))
    : profesionales
  const today = toLocalDate(new Date(), tz)

  // Build 42-day calendar (6 weeks) starting from the Monday on or before today
  const startDow = today.getDay() // 0=sun
  const daysFromMonday = startDow === 0 ? 6 : startDow - 1
  const calStart = new Date(today)
  calStart.setDate(today.getDate() - daysFromMonday)

  const calDays: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(calStart)
    d.setDate(calStart.getDate() + i)
    return d
  })

  // Group by weeks (rows of 7)
  const weeks: Date[][] = []
  for (let i = 0; i < 28; i += 7) {
    weeks.push(calDays.slice(i, i + 7))
  }

  // Determine month label shown in header
  const monthSet = new Set(calDays.map(d => `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`))
  const monthLabel = Array.from(monthSet).slice(0, 2).join(' / ')

  // Convierte getDay() (0=dom) a dia_semana ISO (1=lun…7=dom)
  function jsDayToIso(jsDay: number): number {
    return jsDay === 0 ? 7 : jsDay
  }

  const profesionalActualObj = profesionalId ? profesionalesFiltrados.find(p => p.id === profesionalId) : null

  function isDiaActivo(d: Date): boolean {
    if (d < today) return false
    const nombreDia = DIAS_ES[d.getDay()]

    // 1. Verificar horario de la clínica
    if (horarios) {
      const h = horarios[nombreDia]
      if (h?.activo === false) return false
    }

    // 2. Verificar disponibilidad del profesional seleccionado
    if (profesionalActualObj?.disponibilidad && profesionalActualObj.disponibilidad.length > 0) {
      const isoDia = jsDayToIso(d.getDay())
      const tieneEseDia = profesionalActualObj.disponibilidad.some(
        dsp => dsp.dia_semana === isoDia && dsp.activo
      )
      if (!tieneEseDia) return false
    }

    return true
  }

  const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#0B132B] mb-1">Elige profesional y fecha</h2>
      <p className="text-sm text-gray-500 mb-5">¿Con quién y cuándo te gustaría ser atendido?</p>

      {profesionalesFiltrados.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Profesional</p>
          <div className="grid gap-2">
            {profesionalesFiltrados.map((p) => (
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
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                  style={{ backgroundColor: p.foto_url ? undefined : (p.color || '#2563EB') }}
                >
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : getInitials(p.nombre)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#0B132B] text-sm">{p.nombre}</p>
                  {p.especialidad && <p className="text-xs text-gray-500">{p.especialidad}</p>}
                  {p.bio && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.bio}</p>}
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

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Fecha</p>
        <p className="text-xs text-gray-500 capitalize">{monthLabel}</p>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium text-gray-400 pb-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((d) => {
            const activo = isDiaActivo(d)
            const esHoy = formatDateISO(d) === formatDateISO(today)
            const seleccionado = fechaSeleccionada && formatDateISO(d) === formatDateISO(fechaSeleccionada)
            const esPasado = d < today

            return (
              <button
                key={d.toISOString()}
                disabled={!activo}
                onClick={() => onFecha(d)}
                className={`w-full aspect-square flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all ${
                  esPasado || !activo
                    ? 'text-gray-200 cursor-not-allowed'
                    : seleccionado
                    ? 'bg-[#2563EB] text-white'
                    : esHoy
                    ? 'border border-blue-300 text-[#0B132B] hover:bg-blue-50'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-[#2563EB] border border-transparent'
                }`}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Paso 3: Hora ─────────────────────────────────────────────────────────────

function PasoHora({
  fecha,
  horarios,
  servicio,
  profesionalId,
  profesional,
  clinicaId,
  onSelect,
  tz = DEFAULT_TZ,
}: {
  fecha: Date
  horarios: Record<string, HorarioDia> | undefined
  servicio: Servicio
  profesionalId: string
  profesional?: Profesional | null
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
        .lt('inicio', `${fechaISO}T23:59:59`)
        .gt('fin', `${fechaISO}T00:00:00`),
    ])
    const ocupados: SlotOcupado[] = Array.isArray(data) ? data : []

    const nombreDia = DIAS_ES[fecha.getDay()]

    // Determinar horario efectivo: profesional tiene precedencia sobre clínica
    let horarioEfectivo: HorarioDia | undefined
    const profDisp = profesional?.disponibilidad
    if (profDisp && profDisp.length > 0) {
      // dia_semana ISO: 1=lun…7=dom; getDay(): 0=dom,1=lun…6=sab
      const isoDia = fecha.getDay() === 0 ? 7 : fecha.getDay()
      const dsp = profDisp.find(d => d.dia_semana === isoDia && d.activo)
      if (dsp) {
        horarioEfectivo = { activo: true, desde: dsp.hora_inicio, hasta: dsp.hora_fin }
      }
    }
    // Fallback al horario de la clínica
    if (!horarioEfectivo) {
      const h = horarios?.[nombreDia]
      horarioEfectivo = h
    }

    if (!horarioEfectivo || !horarioEfectivo.activo) {
      setSlots([])
      setCargando(false)
      return
    }

    const bloqueos: Array<{ inicio: string; fin: string; profesional_id: string | null }> = Array.isArray(bloqueosData) ? bloqueosData : []

    let disponibles = buildSlotsDisponibles(horarioEfectivo, servicio.duracion_minutos, ocupados, fecha, profesionalId, tz)

    // Filtrar slots que se solapan con bloqueos (para todos los profesionales o el específico)
    // Comparison uses wall-clock strings to avoid timezone mismatch:
    // - slot Date was created from local wall-clock string → getHours()/getMinutes() = wall-clock
    // - bloqueo.inicio from Supabase is UTC ISO of the stored wall-clock → slice(0,19) = wall-clock
    if (bloqueos.length > 0) {
      const fechaStr = formatDateISO(fecha)
      disponibles = disponibles.filter((slot) => {
        const hh = String(slot.getHours()).padStart(2, '0')
        const mm = String(slot.getMinutes()).padStart(2, '0')
        const slotInicioWall = `${fechaStr}T${hh}:${mm}:00`
        const slotFinMin = slot.getHours() * 60 + slot.getMinutes() + servicio.duracion_minutos
        const sfh = String(Math.floor(slotFinMin / 60)).padStart(2, '0')
        const sfm = String(slotFinMin % 60).padStart(2, '0')
        const slotFinWall = `${fechaStr}T${sfh}:${sfm}:00`
        return !bloqueos.some((b) => {
          if (b.profesional_id !== null && b.profesional_id !== profesionalId) return false
          const bInicioWall = b.inicio.slice(0, 19)
          const bFinWall = b.fin.slice(0, 19)
          return slotInicioWall < bFinWall && slotFinWall > bInicioWall
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
      <p className="text-sm text-gray-500 mb-4">
        {fecha.getDate()} de {MESES_ES[fecha.getMonth()]} · {servicio.nombre} ({servicio.duracion_minutos} min)
      </p>

      {/* Profesional card */}
      {profesional && (
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5 mb-5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
            style={{ backgroundColor: profesional.foto_url ? undefined : (profesional.color || '#2563EB') }}
          >
            {profesional.foto_url
              ? <img src={profesional.foto_url} alt={profesional.nombre} className="w-full h-full object-cover" />
              : getInitials(profesional.nombre)
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0B132B] truncate">{profesional.nombre}</p>
            {profesional.especialidad && <p className="text-xs text-gray-500 truncate">{profesional.especialidad}</p>}
          </div>
        </div>
      )}

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
  const [form, setForm] = useState<FormData>({ nombre: '', telefono: '', email: '', notas: '', rut: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rut.trim()) { setError('El RUT es requerido.'); return }
    if (!validarRutChileno(form.rut)) { setError('El RUT ingresado no es válido.'); return }
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.telefono.trim()) { setError('El teléfono es requerido.'); return }
    if (!form.email.trim()) { setError('El email es requerido.'); return }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (siteKey && !captchaToken) {
      setError('Por favor completa la verificación de seguridad.')
      return
    }

    setEnviando(true)
    setError(null)

    if (siteKey && captchaToken) {
      const base = window.location.origin
      const captchaRes = await fetch(`${base}/api/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      })
      if (!captchaRes.ok) {
        setError('Verificación de seguridad fallida. Intenta de nuevo.')
        setEnviando(false)
        return
      }
    }

    const rutLimpio = form.rut.trim() ? limpiarRut(form.rut) : null

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
      p_paciente_rut: rutLimpio,
    })

    setEnviando(false)
    if (rpcError) {
      setError(rpcError.message || 'No se pudo crear la reserva.')
      return
    }
    const result = data as { cita_id?: string; ok?: boolean; error?: string }
    if (!result?.cita_id && !result?.ok) {
      setError(result?.error || 'No se pudo crear la reserva.')
      return
    }

    // Notify patient + clinic admin (non-critical)
    const base = window.location.origin
    fetch(`${base}/api/book/notificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'nueva_cita',
        canal: 'book',
        paciente: {
          nombre: form.nombre.trim(),
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
        },
        profesional: { nombre: profesional?.nombre ?? 'Por asignar' },
        servicio: { nombre: servicio.nombre },
        clinica: {
          nombre: clinica.nombre,
          email: clinica.email,
          telefono: clinica.telefono,
          direccion: clinica.direccion,
          logo_url: clinica.logo_url,
        },
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
      }),
    }).catch((err) => console.warn('[booking] notificar-cita error (non-critical):', err))

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
          <label className="block text-xs font-medium text-gray-700 mb-1">RUT <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.rut}
            onChange={(e) => {
              const formatted = formatearRut(e.target.value)
              setForm(p => ({ ...p, rut: formatted }))
            }}
            placeholder="12.345.678-9"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-400">*</span></label>
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

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={(token) => setCaptchaToken(token)}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'light', size: 'normal' }}
          />
        )}

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

function buildCalendarLinks(
  titulo: string,
  descripcion: string,
  ubicacion: string,
  inicio: Date,
  fin: Date,
) {
  // Format as YYYYMMDDTHHMMSS (wall-clock, no TZ)
  function fmt(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  }
  const start = fmt(inicio)
  const end = fmt(fin)
  const enc = encodeURIComponent

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(titulo)}&dates=${start}/${end}&details=${enc(descripcion)}&location=${enc(ubicacion)}`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${titulo}`,
    `DESCRIPTION:${descripcion}`,
    `LOCATION:${ubicacion}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const icsBlob = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`

  return { google, ics: icsBlob }
}

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
  const direccion = clinica.direccion ?? ''
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(direccion)}&navigate=yes`

  const calTitulo = `${servicio.nombre} — ${clinica.nombre}`
  const calDesc = `Servicio: ${servicio.nombre}\nProfesional: ${profesional?.nombre ?? ''}\nDuración: ${servicio.duracion_minutos} min`
  const { google: googleCalUrl, ics: icsUrl } = buildCalendarLinks(calTitulo, calDesc, direccion, inicio, fin)

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-[#0B132B] mb-1">¡Tu cita está confirmada!</h2>
      <p className="text-sm text-gray-500 mb-6">Te esperamos en {clinica.nombre}</p>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 text-left space-y-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: servicio.color || '#2563EB' }} />
          <div>
            <p className="text-sm font-semibold text-[#0B132B]">{servicio.nombre}</p>
            <p className="text-xs text-gray-500">{servicio.duracion_minutos} min · {formatPrecio(servicio.precio)}</p>
          </div>
        </div>

        {profesional && (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 overflow-hidden"
              style={{ backgroundColor: profesional.foto_url ? undefined : (profesional.color || '#2563EB') }}
            >
              {profesional.foto_url
                ? <img src={profesional.foto_url} alt={profesional.nombre} className="w-full h-full object-cover" />
                : getInitials(profesional.nombre)
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{profesional.nombre}</p>
              {profesional.especialidad && <p className="text-xs text-gray-500">{profesional.especialidad}</p>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            {inicio.toLocaleDateString('es-CL', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' })} a las {formatHora(inicio, tz)} — {formatHora(fin, tz)}
          </span>
        </div>

        {direccion && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span>{direccion}</span>
          </div>
        )}
      </div>

      {/* Agregar al calendario */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Agregar al calendario</p>
        <div className="flex gap-2 justify-center">
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/><path d="M8 12h8M12 8v8" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/></svg>
            Google Calendar
          </a>
          <a
            href={icsUrl}
            download="cita.ics"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 9h18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/></svg>
            Outlook / Apple
          </a>
        </div>
      </div>

      {/* Cómo llegar */}
      {direccion && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Cómo llegar</p>
          <div className="flex gap-2 justify-center">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>
              Google Maps
            </a>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="7" stroke="#00CCFF" strokeWidth="2"/><path d="M9 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5" stroke="#00CCFF" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="9" r="0.75" fill="#00CCFF"/><circle cx="14" cy="9" r="0.75" fill="#00CCFF"/><path d="M10 19l2 3 2-3" stroke="#00CCFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Waze
            </a>
          </div>
        </div>
      )}

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

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
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
      {/* Hero header */}
      <header style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1e3a8a 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden mb-4 shadow-lg"
            style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}>
            {clinica.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinica.logo_url} alt={clinica.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">{clinica.nombre[0]?.toUpperCase()}</span>
            )}
          </div>
          {/* Nombre */}
          <h1 className="text-2xl font-bold text-white mb-1">{clinica.nombre}</h1>
          <p className="text-sm font-medium mb-4" style={{ color: '#93C5FD' }}>Reserva tu hora en línea</p>
          {/* Datos de contacto */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {clinica.direccion && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{clinica.direccion}</span>
              </div>
            )}
            {clinica.telefono && (
              <a href={`tel:${clinica.telefono}`}
                className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{clinica.telefono}</span>
              </a>
            )}
            {clinica.email && (
              <a href={`mailto:${clinica.email}`}
                className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>{clinica.email}</span>
              </a>
            )}
          </div>
        </div>
      </header>

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
            <PasoServicio
              servicios={clinica.servicios}
              onSelect={handleSelectServicio}
              profesionalId={profesionalId}
              profesionales={clinica.profesionales}
            />
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
                servicioId={servicioSeleccionado.id}
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
              profesional={profesional}
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
