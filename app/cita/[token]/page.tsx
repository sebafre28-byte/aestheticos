'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, Loader2, Calendar, Clock, User,
  Stethoscope, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Vista = 'loading' | 'acciones' | 'reagendar' | 'confirmada' | 'cancelada' | 'reagendada' | 'ya_procesada' | 'error'

interface CitaInfo {
  cita_id: string
  paciente_nombre: string
  servicio_nombre: string
  servicio_duracion: number
  profesional_nombre: string
  profesional_id: string
  clinica_nombre: string
  clinica_logo_url?: string
  clinica_telefono?: string
  clinica_id: string
  fecha: string
  hora: string
  hora_fin: string
  rawInicio: string
  rawFin: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(inicio: string) {
  const [datePart, timePart] = inicio.split('T')
  const date = new Date(datePart + 'T12:00:00Z')
  const fecha = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return {
    fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1),
    hora: timePart?.slice(0, 5) ?? '',
  }
}

function addMinutes(isoDate: string, minutes: number): string {
  const d = new Date(isoDate + 'Z')
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString().replace('Z', '')
}

function toLocalDateStr(isoDate: string): string {
  // isoDate = "2026-06-18T15:00:00" (UTC naive from Supabase)
  return isoDate.slice(0, 10)
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ children, clinicaLogo, clinicaNombre }: {
  children: React.ReactNode
  clinicaLogo?: string
  clinicaNombre?: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          {clinicaLogo ? (
            <img src={clinicaLogo} alt={clinicaNombre} className="w-9 h-9 rounded-xl object-cover" />
          ) : clinicaNombre ? (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
              <span className="text-white font-bold text-base">{clinicaNombre.charAt(0)}</span>
            </div>
          ) : null}
          {clinicaNombre && <span className="font-bold text-gray-800 text-lg">{clinicaNombre}</span>}
        </div>
        <div className="bg-white rounded-3xl shadow-lg border border-white/60 p-6">
          {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-semibold text-gray-500">SimpliClinic</span>
        </p>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

// ─── Slot picker ──────────────────────────────────────────────────────────────

interface Slot { inicio: string; fin: string }

function SlotPicker({
  cita,
  token,
  onSuccess,
  onBack,
}: {
  cita: CitaInfo
  token: string
  onSuccess: (nuevaFecha: string, nuevaHora: string) => void
  onBack: () => void
}) {
  const [fecha, setFecha] = useState<string>(toLocalDateStr(cita.rawInicio))
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotElegido, setSlotElegido] = useState<Slot | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Minimum date = tomorrow
  const minFecha = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  useEffect(() => {
    if (!fecha) return
    setLoadingSlots(true)
    setSlots([])
    setSlotElegido(null)

    const supabase = createClient()
    supabase
      .rpc('get_slots_ocupados', { p_clinica_id: cita.clinica_id, p_fecha: fecha, p_profesional_id: cita.profesional_id })
      .then(({ data }) => {
        // data = array of { inicio, fin } occupied slots
        const ocupados: { inicio: string; fin: string }[] = data ?? []

        // Build free slots from 08:00 to 19:00 in steps of duracion_minutos
        const dur = cita.servicio_duracion
        const libres: Slot[] = []

        // Start from 08:00
        const base = new Date(`${fecha}T08:00:00Z`)
        const limite = new Date(`${fecha}T19:00:00Z`)

        let cursor = new Date(base)
        while (true) {
          const slotFin = new Date(cursor.getTime() + dur * 60 * 1000)
          if (slotFin > limite) break

          const inicioStr = cursor.toISOString().replace('Z', '')
          const finStr = slotFin.toISOString().replace('Z', '')

          // Skip if conflicts with any occupied slot
          const conflicto = ocupados.some(o =>
            new Date(o.inicio) < slotFin && new Date(o.fin) > cursor
          )

          if (!conflicto) {
            libres.push({ inicio: inicioStr, fin: finStr })
          }
          cursor = slotFin
        }
        setSlots(libres)
        setLoadingSlots(false)
      })
  }, [fecha, cita.clinica_id, cita.profesional_id, cita.servicio_duracion])

  async function handleReagendar() {
    if (!slotElegido) return
    setEnviando(true)
    setErrorMsg('')
    const res = await fetch('/api/cita/reagendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nuevo_inicio: slotElegido.inicio, nuevo_fin: slotElegido.fin }),
    })
    const json = await res.json()
    if (json.ok) {
      const { fecha: f, hora: h } = formatFecha(slotElegido.inicio)
      onSuccess(f, h)
    } else {
      setErrorMsg(json.error ?? 'No se pudo reagendar. Intenta con otro horario.')
      setEnviando(false)
    }
  }

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const nombreDia = fecha ? diasSemana[new Date(fecha + 'T12:00:00Z').getUTCDay()] : ''

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors -mb-1">
        <ChevronLeft className="size-4" /> Volver
      </button>

      <div>
        <h2 className="text-xl font-bold text-gray-900">Reagendar cita</h2>
        <p className="text-sm text-gray-500 mt-1">{cita.servicio_nombre} · {cita.profesional_nombre}</p>
      </div>

      {/* Date picker */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Elige una fecha
        </label>
        <input
          type="date"
          value={fecha}
          min={minFecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fecha && <p className="text-xs text-gray-400 mt-1">{nombreDia} {fecha.split('-').reverse().join('/')}</p>}
      </div>

      {/* Slots */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Horario disponible
        </label>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="size-4 animate-spin" /> Cargando horarios…
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">No hay horarios disponibles para este día.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {slots.map((s) => {
              const h = s.inicio.slice(11, 16)
              const selected = slotElegido?.inicio === s.inicio
              return (
                <button
                  key={s.inicio}
                  onClick={() => setSlotElegido(s)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-colors border ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {h}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
          <AlertTriangle className="size-4 shrink-0" /> {errorMsg}
        </div>
      )}

      <button
        onClick={handleReagendar}
        disabled={!slotElegido || enviando}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[15px] transition-colors"
      >
        {enviando ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Reagendando…</span>
        ) : slotElegido ? (
          `Confirmar nuevo horario — ${slotElegido.inicio.slice(11, 16)}`
        ) : (
          'Selecciona un horario'
        )}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const searchParams = useSearchParams()
  const accionAuto = searchParams.get('accion') as 'confirmar' | 'reagendar' | 'cancelar' | null
  const [vista, setVista] = useState<Vista>('loading')
  const [cita, setCita] = useState<CitaInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaHora, setNuevaHora] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const handleConfirmar = useCallback(async () => {
    setConfirmando(true)
    const res = await fetch('/api/cita/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json()
    setConfirmando(false)
    if (json.ok) setVista('confirmada')
    else setVista('error')
  }, [token])

  const handleCancelar = useCallback(async () => {
    setCancelando(true)
    const res = await fetch('/api/book/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json()
    setCancelando(false)
    if (json.ok) setVista('cancelada')
    else { setErrorMsg(json.error ?? 'Error al cancelar.'); setVista('error') }
  }, [token])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .rpc('get_cita_por_token', { p_token: token })
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrorMsg('Token inválido o expirado.')
          setVista('error')
          return
        }
        const r = data as {
          ok: boolean; error?: string; estado?: string
          cita_id: string; inicio: string; fin: string
          clinica_id: string; profesional_id: string; servicio_id: string
          servicio_duracion: number
          paciente_nombre: string; paciente_email?: string; paciente_telefono?: string
          servicio_nombre: string; profesional_nombre: string
          clinica_nombre: string; clinica_logo_url?: string; clinica_telefono?: string
        }
        if (!r.ok) {
          setErrorMsg(r.error ?? 'Token inválido.')
          setVista('error')
          return
        }
        if (['cancelada', 'completada', 'no_asistio'].includes(r.estado ?? '')) {
          setVista('ya_procesada')
          setCita({
            cita_id: r.cita_id, rawInicio: r.inicio, rawFin: r.fin,
            clinica_id: r.clinica_id, profesional_id: r.profesional_id,
            clinica_nombre: r.clinica_nombre, clinica_logo_url: r.clinica_logo_url,
            clinica_telefono: r.clinica_telefono,
            paciente_nombre: r.paciente_nombre,
            servicio_nombre: r.servicio_nombre, servicio_duracion: r.servicio_duracion,
            profesional_nombre: r.profesional_nombre,
            ...formatFecha(r.inicio),
            hora_fin: r.fin.slice(11, 16),
          })
          return
        }
        const { fecha, hora } = formatFecha(r.inicio)
        setCita({
          cita_id: r.cita_id, rawInicio: r.inicio, rawFin: r.fin,
          clinica_id: r.clinica_id, profesional_id: r.profesional_id,
          clinica_nombre: r.clinica_nombre, clinica_logo_url: r.clinica_logo_url,
          clinica_telefono: r.clinica_telefono,
          paciente_nombre: r.paciente_nombre,
          servicio_nombre: r.servicio_nombre, servicio_duracion: r.servicio_duracion,
          profesional_nombre: r.profesional_nombre,
          fecha, hora, hora_fin: r.fin.slice(11, 16),
        })
        // Auto-execute action from ?accion= param
        if (accionAuto === 'confirmar') { handleConfirmar(); return }
        if (accionAuto === 'cancelar')  { handleCancelar(); return }
        if (accionAuto === 'reagendar') { setVista('reagendar'); return }
        setVista('acciones')
      })
  }, [token, accionAuto, handleConfirmar, handleCancelar])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (vista === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando tu cita…</p>
        </div>
      </Shell>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (vista === 'error') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="size-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Ocurrió un problema</h1>
          <p className="text-sm text-red-500 max-w-xs">{errorMsg}</p>
        </div>
      </Shell>
    )
  }

  // ── Ya procesada ─────────────────────────────────────────────────────────────
  if (vista === 'ya_procesada') {
    return (
      <Shell clinicaLogo={cita?.clinica_logo_url} clinicaNombre={cita?.clinica_nombre}>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Esta cita ya fue procesada</h1>
          <p className="text-sm text-gray-500 max-w-xs">Ya no es posible realizar cambios en esta reserva.</p>
        </div>
      </Shell>
    )
  }

  if (!cita) return null

  // ── Confirmada ───────────────────────────────────────────────────────────────
  if (vista === 'confirmada') {
    return (
      <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="size-9 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">¡Asistencia confirmada!</h1>
            <p className="text-sm text-gray-500 mt-1">Te esperamos el {cita.fecha} a las {cita.hora}.</p>
          </div>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-3">
            <InfoRow icon={<Calendar className="size-4 text-blue-500" />} label="Fecha" value={cita.fecha} />
            <InfoRow icon={<Clock className="size-4 text-blue-500" />} label="Hora" value={`${cita.hora} – ${cita.hora_fin}`} />
            <InfoRow icon={<Stethoscope className="size-4 text-blue-500" />} label="Servicio" value={cita.servicio_nombre} />
            <InfoRow icon={<User className="size-4 text-blue-500" />} label="Profesional" value={cita.profesional_nombre} />
          </div>
          {cita.clinica_telefono && (
            <a
              href={`https://wa.me/${cita.clinica_telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              ¿Necesitas algo más? Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </Shell>
    )
  }

  // ── Reagendada ───────────────────────────────────────────────────────────────
  if (vista === 'reagendada') {
    return (
      <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <CheckCircle2 className="size-9 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cita reagendada</h1>
            <p className="text-sm text-gray-500 mt-1">Tu nueva cita es el {nuevaFecha} a las {nuevaHora}.</p>
          </div>
          {cita.clinica_telefono && (
            <a
              href={`https://wa.me/${cita.clinica_telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              ¿Tienes dudas? Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </Shell>
    )
  }

  // ── Cancelada ────────────────────────────────────────────────────────────────
  if (vista === 'cancelada') {
    return (
      <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <XCircle className="size-9 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cita cancelada</h1>
            <p className="text-sm text-gray-500 mt-1">Hemos cancelado tu reserva y te enviamos un email.</p>
          </div>
          <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-3">
            <InfoRow icon={<Calendar className="size-4 text-blue-500" />} label="Fecha" value={cita.fecha} />
            <InfoRow icon={<Clock className="size-4 text-blue-500" />} label="Hora" value={`${cita.hora} – ${cita.hora_fin}`} />
            <InfoRow icon={<Stethoscope className="size-4 text-blue-500" />} label="Servicio" value={cita.servicio_nombre} />
          </div>
          {cita.clinica_telefono && (
            <a
              href={`https://wa.me/${cita.clinica_telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              ¿Quieres reagendar? Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </Shell>
    )
  }

  // ── Reagendar (slot picker) ───────────────────────────────────────────────────
  if (vista === 'reagendar') {
    return (
      <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
        <SlotPicker
          cita={cita}
          token={token}
          onSuccess={(f, h) => { setNuevaFecha(f); setNuevaHora(h); setVista('reagendada') }}
          onBack={() => setVista('acciones')}
        />
      </Shell>
    )
  }

  // ── Acciones (main view) ──────────────────────────────────────────────────────
  return (
    <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
      <div className="flex flex-col gap-5">
        {/* Cita details */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Hola, <strong className="text-gray-800">{cita.paciente_nombre}</strong></p>
          <h1 className="text-xl font-bold text-gray-900">Tu cita en {cita.clinica_nombre}</h1>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
          <InfoRow icon={<Calendar className="size-4 text-blue-500" />} label="Fecha" value={cita.fecha} />
          <InfoRow icon={<Clock className="size-4 text-blue-500" />} label="Hora" value={`${cita.hora} – ${cita.hora_fin}`} />
          <InfoRow icon={<Stethoscope className="size-4 text-blue-500" />} label="Servicio" value={cita.servicio_nombre} />
          <InfoRow icon={<User className="size-4 text-blue-500" />} label="Profesional" value={cita.profesional_nombre} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleConfirmar}
            disabled={confirmando || cancelando}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2"
          >
            {confirmando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-5" />}
            Confirmar asistencia
          </button>

          <button
            onClick={() => setVista('reagendar')}
            disabled={confirmando || cancelando}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="size-5" />
            Reagendar
          </button>

          <button
            onClick={handleCancelar}
            disabled={confirmando || cancelando}
            className="w-full py-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 font-medium text-[14px] transition-colors flex items-center justify-center gap-2"
          >
            {cancelando ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Cancelar cita
          </button>
        </div>
      </div>
    </Shell>
  )
}
