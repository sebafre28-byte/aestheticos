'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2, Calendar, Clock, User, Stethoscope, AlertTriangle } from 'lucide-react'

type Estado = 'loading' | 'confirming' | 'cancelled' | 'already_done' | 'error'

interface CitaInfo {
  paciente_nombre: string
  servicio_nombre: string
  profesional_nombre: string
  clinica_nombre: string
  clinica_logo_url?: string
  fecha: string
  hora: string
  hora_fin: string
}

function formatFecha(inicio: string): { fecha: string; hora: string; hora_fin: string } {
  const date = new Date(inicio.slice(0, 10) + 'T12:00:00Z')
  const fecha = date.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })
  const hora = inicio.slice(11, 16)
  return { fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1), hora, hora_fin: '' }
}

export default function CancelarCitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [estado, setEstado] = useState<Estado>('loading')
  const [cita, setCita] = useState<CitaInfo | null>(null)
  const [rawInicio, setRawInicio] = useState('')
  const [rawFin, setRawFin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Validate token by fetching cita info without cancelling
    const supabase = createClient()
    supabase
      .from('citas')
      .select(`
        id, inicio, fin, estado,
        pacientes!inner(nombre),
        servicios!inner(nombre),
        profesionales!inner(nombre),
        clinicas!inner(nombre, logo_url)
      `)
      .eq('cancel_token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setEstado('error')
          setErrorMsg('Token inválido o expirado.')
          return
        }
        const d = data as unknown as {
          inicio: string; fin: string; estado: string;
          pacientes: { nombre: string };
          servicios: { nombre: string };
          profesionales: { nombre: string };
          clinicas: { nombre: string; logo_url: string | null };
        }
        if (['cancelada', 'completada', 'no_asistio'].includes(d.estado)) {
          setEstado('already_done')
          return
        }
        const { fecha, hora } = formatFecha(d.inicio)
        setCita({
          paciente_nombre: d.pacientes.nombre,
          servicio_nombre: d.servicios.nombre,
          profesional_nombre: d.profesionales.nombre,
          clinica_nombre: d.clinicas.nombre,
          clinica_logo_url: d.clinicas.logo_url ?? undefined,
          fecha,
          hora,
          hora_fin: d.fin.slice(11, 16),
        })
        setRawInicio(d.inicio)
        setRawFin(d.fin)
        setEstado('confirming')
      })
  }, [token])

  async function handleCancelar() {
    setEstado('loading')
    const res = await fetch('/api/book/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const json = await res.json()
    if (json.ok) {
      setEstado('cancelled')
    } else {
      setEstado('error')
      setErrorMsg(json.error ?? 'No se pudo cancelar la cita.')
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (estado === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Verificando tu cita…</p>
        </div>
      </Shell>
    )
  }

  // ── Already done ─────────────────────────────────────────────────────────────
  if (estado === 'already_done') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Esta cita ya fue procesada</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            La cita ya fue cancelada o completada anteriormente.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (estado === 'error') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="size-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">No pudimos procesar tu solicitud</h1>
          <p className="text-sm text-red-500 max-w-xs">{errorMsg}</p>
        </div>
      </Shell>
    )
  }

  // ── Cancelled ────────────────────────────────────────────────────────────────
  if (estado === 'cancelled' && cita) {
    return (
      <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cita cancelada</h1>
            <p className="text-sm text-gray-500 mt-1">
              Hemos cancelado tu reserva y te enviamos un email de confirmación.
            </p>
          </div>
          <div className="w-full max-w-sm bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-3 mt-2">
            <InfoRow icon={<Calendar className="size-4 text-blue-500" />} label="Fecha" value={cita.fecha} />
            <InfoRow icon={<Clock className="size-4 text-blue-500" />} label="Hora" value={`${cita.hora} – ${cita.hora_fin}`} />
            <InfoRow icon={<Stethoscope className="size-4 text-blue-500" />} label="Servicio" value={cita.servicio_nombre} />
            <InfoRow icon={<User className="size-4 text-blue-500" />} label="Profesional" value={cita.profesional_nombre} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ¿Quieres reagendar? Contáctanos directamente con <strong>{cita.clinica_nombre}</strong>.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Confirming ───────────────────────────────────────────────────────────────
  if (!cita) return null

  return (
    <Shell clinicaLogo={cita.clinica_logo_url} clinicaNombre={cita.clinica_nombre}>
      <div className="flex flex-col gap-5">

        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">¿Estás seguro que quieres cancelar?</p>
            <p className="text-xs text-amber-700 mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        {/* Cita details */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tu reserva</p>
          </div>
          <div className="p-4 space-y-3">
            <InfoRow icon={<Calendar className="size-4 text-blue-500" />} label="Fecha" value={cita.fecha} />
            <InfoRow icon={<Clock className="size-4 text-blue-500" />} label="Hora" value={`${cita.hora} – ${cita.hora_fin}`} />
            <InfoRow icon={<Stethoscope className="size-4 text-blue-500" />} label="Servicio" value={cita.servicio_nombre} />
            <InfoRow icon={<User className="size-4 text-blue-500" />} label="Profesional" value={cita.profesional_nombre} />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCancelar}
          className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-[15px] transition-colors shadow-sm"
        >
          Confirmar cancelación
        </button>
        <p className="text-xs text-center text-gray-400">
          Hola <strong className="text-gray-600">{cita.paciente_nombre}</strong>, esta acción cancelará tu cita en <strong className="text-gray-600">{cita.clinica_nombre}</strong>.
        </p>
      </div>
    </Shell>
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

function Shell({ children, clinicaLogo, clinicaNombre }: {
  children: React.ReactNode
  clinicaLogo?: string
  clinicaNombre?: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {clinicaLogo ? (
            <img src={clinicaLogo} alt={clinicaNombre} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
              <span className="text-white font-bold text-base">{clinicaNombre?.charAt(0) ?? 'C'}</span>
            </div>
          )}
          {clinicaNombre && (
            <span className="font-bold text-gray-800 text-lg">{clinicaNombre}</span>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-white/60 p-6">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-semibold text-gray-500">SimpliClinic</span>
        </p>
      </div>
    </div>
  )
}
