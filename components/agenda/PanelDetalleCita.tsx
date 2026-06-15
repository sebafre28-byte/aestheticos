'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO, differenceInMinutes, formatDistanceToNow, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  X, Edit2, MessageCircle, CheckCircle, CheckCircle2, Clock,
  User, Scissors, Calendar, FileText, History, Phone, ClipboardEdit, Loader2,
  XCircle, UserX, CalendarClock, Mail, Repeat2, Banknote, Star, CalendarCheck, Trash2, Plus, DoorOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'
import { actualizarEstadoCita, getHistorialPaciente, editarCita, getAuditCita, getCitasFuturasPaciente, type AuditLogRow } from '@/lib/agenda/queries'
import type { PagoCitaFields } from '@/lib/cobros/queries'
import { SeccionCobroCita } from './SeccionCobroCita'
import { useDialogA11y } from './useDialogA11y'
import { useRol } from '@/lib/auth/useRol'
import { getNotasClinicas, crearNotaClinica, eliminarNotaClinica, type NotaClinica } from '@/lib/pacientes/queries'
import { createClient } from '@/lib/supabase/client'
import { getClinicaBasica, getClinicaConfig } from '@/lib/onboarding/queries'
import MiniPanelFichas from '@/components/fichas/MiniPanelFichas'
import WizardIniciarCita from '@/components/agenda/WizardIniciarCita'
import { SeccionConsentimiento } from './SeccionConsentimiento'

// Configuración visual del badge prominente de estado
const estadoConfig: Record<EstadoCita, {
  descripcion: string
  textColor: string
  bgColor: string
  borderColor: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  pendiente: {
    descripcion: 'Pendiente de confirmar',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock,
  },
  confirmada: {
    descripcion: 'Confirmada',
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    icon: CheckCircle,
  },
  en_sala: {
    descripcion: 'En sala',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: DoorOpen,
  },
  completada: {
    descripcion: 'Completada',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircle2,
  },
  cancelada: {
    descripcion: 'Cancelada',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  no_asistio: {
    descripcion: 'No asistió',
    textColor: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: UserX,
  },
}

// Badge pequeño para el historial
const historialBadge: Record<EstadoCita, { label: string; className: string }> = {
  pendiente:  { label: 'Pendiente',  className: 'bg-amber-50 text-amber-600' },
  confirmada: { label: 'Confirmada', className: 'bg-teal-50 text-teal-600' },
  en_sala:    { label: 'En sala',    className: 'bg-green-50 text-green-700' },
  completada: { label: 'Completada', className: 'bg-blue-50 text-blue-600' },
  cancelada:  { label: 'Cancelada',  className: 'bg-red-50 text-red-500' },
  no_asistio: { label: 'No asistió', className: 'bg-red-100 text-red-700' },
}

// Acciones relevantes según el estado actual
type AccionEstado = {
  label: string
  estado: EstadoCita
  icon: React.ComponentType<{ className?: string }>
  className: string
}

function getAcciones(estado: EstadoCita): AccionEstado[] {
  switch (estado) {
    case 'pendiente':
      return [
        {
          label: 'Confirmar', estado: 'confirmada', icon: CheckCircle,
          className: 'bg-teal-500 hover:bg-teal-600 text-white border-0',
        },
        {
          label: 'Cancelar', estado: 'cancelada', icon: XCircle,
          className: 'border border-red-200 text-red-500 hover:bg-red-50 bg-white',
        },
      ]
    case 'confirmada':
      return [
        {
          label: 'Llegó ✓', estado: 'en_sala', icon: DoorOpen,
          className: 'bg-green-500 hover:bg-green-600 text-white border-0',
        },
        {
          label: 'Completar', estado: 'completada', icon: CheckCircle2,
          className: 'bg-blue-500 hover:bg-blue-600 text-white border-0',
        },
        {
          label: 'No asistió', estado: 'no_asistio', icon: UserX,
          className: 'border border-red-200 text-red-500 hover:bg-red-50 bg-white',
        },
        {
          label: 'Cancelar', estado: 'cancelada', icon: XCircle,
          className: 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white',
        },
      ]
    case 'en_sala':
      return [
        {
          label: 'Completar', estado: 'completada', icon: CheckCircle2,
          className: 'bg-blue-500 hover:bg-blue-600 text-white border-0',
        },
        {
          label: 'No asistió', estado: 'no_asistio', icon: UserX,
          className: 'border border-red-200 text-red-500 hover:bg-red-50 bg-white',
        },
        {
          label: 'Cancelar', estado: 'cancelada', icon: XCircle,
          className: 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white',
        },
      ]
    case 'completada':
      return [
        {
          label: 'Reabrir como pendiente', estado: 'pendiente', icon: Clock,
          className: 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white',
        },
      ]
    case 'cancelada':
      return [
        {
          label: 'Reactivar como pendiente', estado: 'pendiente', icon: Clock,
          className: 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white',
        },
      ]
    case 'no_asistio':
      return [
        {
          label: 'Reactivar como pendiente', estado: 'pendiente', icon: Clock,
          className: 'border border-gray-200 text-gray-500 hover:bg-gray-50 bg-white',
        },
      ]
  }
}

// Colores de avatar basados en el nombre
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)',
  'linear-gradient(135deg, #14B8A6 0%, #0B132B 100%)',
  'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
  'linear-gradient(135deg, #D97706 0%, #DC2626 100%)',
  'linear-gradient(135deg, #059669 0%, #0B132B 100%)',
  'linear-gradient(135deg, #0B132B 0%, #2563EB 100%)',
]

function getAvatarGradient(nombre: string): string {
  const idx = nombre.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

type Props = {
  cita: CitaConRelaciones
  isVistaProfe?: boolean
  onCerrar: () => void
  onEditar: (cita: CitaConRelaciones) => void
  onEstadoActualizado: (citaId: string, nuevoEstado: EstadoCita) => void
  onPagoActualizado?: (citaId: string, pago: PagoCitaFields) => void
}

export function PanelDetalleCita({
  cita,
  isVistaProfe = false,
  onCerrar,
  onEditar,
  onEstadoActualizado,
  onPagoActualizado,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(panelRef, onCerrar)
  const [estadoActual, setEstadoActual] = useState<EstadoCita>(cita.estado)
  const [actualizando, setActualizando] = useState<EstadoCita | null>(null)
  const [historial, setHistorial] = useState<CitaConRelaciones[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [citasFuturas, setCitasFuturas] = useState<CitaConRelaciones[]>([])
  const [audit, setAudit] = useState<AuditLogRow[]>([])

  const [mostrarNota, setMostrarNota] = useState(false)
  const [textoNota, setTextoNota] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [notasClinicas, setNotasClinicas] = useState<NotaClinica[]>([])
  const [confirmarCambio, setConfirmarCambio] = useState<AccionEstado | null>(null)
  const [wizardAbierto, setWizardAbierto] = useState(false)
  const [wizardActivo, setWizardActivo] = useState(true)
  const [feedback, setFeedback] = useState<{ rating: string; respuestas?: Record<string, string>; comentario?: string | null } | null | undefined>(undefined)
  const { rol } = useRol()

  useEffect(() => {
    getClinicaConfig().then(cfg => {
      setWizardActivo(cfg.wizard_pasos?.activo !== false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('feedback_citas')
      .select('rating, respuestas, comentario')
      .eq('cita_id', cita.id)
      .maybeSingle()
      .then(({ data }) => setFeedback(data ?? null))
  }, [cita.id])
  const puedeEscribirNotas = rol === 'admin' || rol === 'profesional'

  const paciente = cita.pacientes
  const profesional = cita.profesionales
  const servicio = cita.servicios

  const horaInicio = cita.inicio.slice(11, 16)
  const horaFin = cita.fin.slice(11, 16)
  const fechaFormateada = format(parseISO(cita.inicio), "EEEE d 'de' MMMM", { locale: es })
  const duracion = differenceInMinutes(parseISO(cita.fin), parseISO(cita.inicio))
  const esFutura = !isPast(parseISO(cita.fin))

  const estadoInfo = estadoConfig[estadoActual]
  const IconoEstado = estadoInfo.icon
  const acciones = getAcciones(estadoActual)

  useEffect(() => {
    if (!paciente?.id) return
    getHistorialPaciente(paciente.id).then((h) => {
      const sinActual = h.filter((c) => c.id !== cita.id)
      setHistorial(sinActual.slice(0, 5))
      setCargandoHistorial(false)
    })
    getCitasFuturasPaciente(paciente.id).then((futuras) => {
      setCitasFuturas(futuras.filter((c) => c.id !== cita.id))
    })
  }, [paciente?.id, cita.id])

  useEffect(() => {
    getAuditCita(cita.id).then(setAudit)
  }, [cita.id])

  useEffect(() => {
    if (!paciente?.id) return
    getNotasClinicas(paciente.id).then(setNotasClinicas)
  }, [paciente?.id])

  // Métricas del paciente derivadas del historial
  const totalVisitas = historial.length + 1 // +1 la actual
  const gastoHistorial = historial.reduce((sum, h) => {
    if (h.pago_estado === 'pagado' || h.pago_estado === 'parcial') {
      return sum + (h.pago_monto ?? 0)
    }
    return sum
  }, 0)
  const gastoCitaActual =
    (cita.pago_estado === 'pagado' || cita.pago_estado === 'parcial') ? (cita.pago_monto ?? 0) : 0
  const gastoTotal = gastoHistorial + gastoCitaActual
  const esClienteFrecuente = totalVisitas > 5
  const ultimaVisita = historial[0]?.inicio ?? null

  async function cambiarEstado(nuevoEstado: EstadoCita) {
    setConfirmarCambio(null)
    setActualizando(nuevoEstado)
    setEstadoActual(nuevoEstado)
    onEstadoActualizado(cita.id, nuevoEstado)
    const ok = await actualizarEstadoCita(cita.id, nuevoEstado)
    if (!ok) {
      setEstadoActual(cita.estado)
      onEstadoActualizado(cita.id, cita.estado)
    } else if (nuevoEstado === 'cancelada') {
      // Enviar emails de cancelación al paciente y al admin en background
      enviarEmailsCancelacion().catch(() => {})
    }
    setActualizando(null)
  }

  async function enviarEmailsCancelacion() {
    const clinica = await getClinicaBasica()
    if (!clinica) return

    const inicio = parseISO(cita.inicio)
    const datos = {
      paciente_nombre:   paciente?.nombre ?? 'Paciente',
      paciente_email:    paciente?.email ?? undefined,
      paciente_telefono: paciente?.telefono ?? undefined,
      servicio_nombre:   servicio?.nombre ?? 'Servicio',
      profesional_nombre: cita.profesionales?.nombre ?? '',
      fecha: format(inicio, "EEEE d 'de' MMMM yyyy", { locale: es }),
      hora:  format(inicio, 'HH:mm'),
      clinica_nombre:    clinica.nombre,
      clinica_email:     clinica.email ?? undefined,
      clinica_telefono:  clinica.telefono ?? undefined,
      canal: 'agenda' as const,
    }

    const base = window.location.origin

    // Email al paciente (solo si tiene email)
    if (datos.paciente_email) {
      fetch(`${base}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'cancelacion_cita', destinatario: datos.paciente_email, datos }),
      }).catch(() => {})
    }

    // Email al admin
    if (clinica.email) {
      fetch(`${base}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'cancelacion_cita', destinatario: clinica.email, datos }),
      }).catch(() => {})
    }
  }

  function handleAccion(accion: AccionEstado) {
    if (accion.estado === 'cancelada' || accion.estado === 'no_asistio') {
      setConfirmarCambio(accion)
    } else {
      cambiarEstado(accion.estado)
    }
  }

  async function guardarNota() {
    if (!textoNota.trim() || !paciente?.id) return
    setGuardandoNota(true)
    const ok = await crearNotaClinica({
      paciente_id: paciente.id,
      contenido: textoNota.trim(),
      cita_id: cita.id,
    })
    if (ok) {
      setTextoNota('')
      setMostrarNota(false)
      getNotasClinicas(paciente.id).then(setNotasClinicas)
    }
    setGuardandoNota(false)
  }

  async function borrarNota(id: string) {
    if (!paciente?.id) return
    await eliminarNotaClinica(id)
    setNotasClinicas(prev => prev.filter(n => n.id !== id))
  }

  function abrirWhatsApp() {
    if (!paciente?.telefono) return
    const num = paciente.telefono.replace(/\D/g, '')
    let mensaje: string

    if (esFutura && (estadoActual === 'pendiente' || estadoActual === 'confirmada')) {
      mensaje = `Hola ${paciente.nombre}, te recordamos tu cita el ${fechaFormateada} a las ${horaInicio} para ${servicio?.nombre ?? 'tu servicio'}. ¡Te esperamos! 😊`
    } else if (!esFutura && estadoActual === 'completada') {
      mensaje = `Hola ${paciente.nombre}, esperamos que te haya ido muy bien en tu cita de ${servicio?.nombre ?? 'tu servicio'}. ¿Cómo te encuentras? Estamos para cualquier consulta. 🌟`
    } else if (estadoActual === 'cancelada') {
      mensaje = `Hola ${paciente.nombre}, queremos ofrecerte una nueva fecha para ${servicio?.nombre ?? 'tu servicio'}. ¿Cuándo te acomoda? Con gusto reagendamos tu cita. 📅`
    } else {
      mensaje = `Hola ${paciente.nombre}, te recordamos tu cita el ${fechaFormateada} a las ${horaInicio} para ${servicio?.nombre ?? 'tu servicio'}.`
    }

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  return (
    <>
      {/* Overlay semitransparente */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onCerrar} />

      {/* Panel lateral derecho */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isVistaProfe ? 'Detalle de mi cita' : 'Detalle de cita'}
        className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-slide-in-right"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isVistaProfe ? 'Mi cita' : 'Detalle de cita'}
          </h2>
          <div className="flex items-center gap-1">
            {!isVistaProfe && (
              <button
                onClick={() => onEditar(cita)}
                title="Reagendar / editar"
                className="h-8 px-2.5 rounded-lg hover:bg-blue-50 flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB] transition-colors"
              >
                <CalendarClock className="size-3.5" />
                Reagendar
              </button>
            )}
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="size-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Badge de estado prominente */}
        <div className={`px-5 py-3 border-b flex items-center gap-3 shrink-0 ${estadoInfo.bgColor} ${estadoInfo.borderColor}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/70">
            <IconoEstado className={`size-5 ${estadoInfo.textColor}`} />
          </div>
          <p className={`text-[14px] font-bold flex-1 ${estadoInfo.textColor}`}>
            {estadoInfo.descripcion}
          </p>
        </div>

        {/* Acciones rápidas fijas — visible sin scroll */}
        {!isVistaProfe && (
          <div className="px-5 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50/60">
            <div className="flex gap-2 flex-wrap">
              {acciones.map((accion) => {
                const IconAccion = accion.icon
                const cargando = actualizando === accion.estado
                return (
                  <button
                    key={accion.estado}
                    onClick={() => handleAccion(accion)}
                    disabled={!!actualizando}
                    className={`h-8 px-3 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 disabled:opacity-60 ${accion.className}`}
                  >
                    {cargando
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <IconAccion className="size-3.5" />
                    }
                    {accion.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Paciente enriquecido ── */}
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-start gap-3">
              {/* Avatar grande con gradiente basado en nombre */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white text-[14px] font-bold"
                style={{ background: getAvatarGradient(paciente?.nombre ?? 'P') }}
              >
                {paciente?.nombre?.slice(0, 2).toUpperCase() ?? 'PA'}
              </div>

              <div className="flex-1 min-w-0">
                {/* Nombre + badge cliente frecuente */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[15px] font-bold text-gray-900">{paciente?.nombre ?? '—'}</p>
                  {esClienteFrecuente && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      <Star className="size-2.5 fill-amber-500 text-amber-500" />
                      Frecuente
                    </span>
                  )}
                </div>

                {/* Teléfono */}
                {paciente?.telefono && (
                  <div className="flex items-center gap-1 mt-1">
                    <Phone className="size-3 text-gray-400" />
                    <p className="text-[12px] text-gray-500">{paciente.telefono}</p>
                  </div>
                )}

                {/* Email */}
                {paciente?.email && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail className="size-3 text-gray-400" />
                    <p className="text-[12px] text-gray-500 truncate">{paciente.email}</p>
                  </div>
                )}

                {/* Métricas: visitas + gasto */}
                {!cargandoHistorial && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Repeat2 className="size-3 text-gray-400" />
                      {totalVisitas} {totalVisitas === 1 ? 'visita' : 'visitas'}
                    </span>
                    {gastoTotal > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                        <Banknote className="size-3 text-teal-500" />
                        $ {gastoTotal.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>
                )}

                {/* Última visita */}
                {ultimaVisita && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Última visita:{' '}
                    {formatDistanceToNow(parseISO(ultimaVisita), { locale: es, addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Información de la cita ── */}
          <div className="px-5 py-4 space-y-3 border-b border-gray-50">
            <DetalleItem
              icon={<Calendar className="size-3.5 text-gray-400" />}
              label="Fecha"
              value={fechaFormateada}
            />
            <DetalleItem
              icon={<Clock className="size-3.5 text-gray-400" />}
              label="Horario"
              value={`${horaInicio} — ${horaFin} (${duracion} min)`}
            />
            <DetalleItem
              icon={<Scissors className="size-3.5 text-gray-400" />}
              label="Servicio"
              value={
                servicio
                  ? `${servicio.nombre}${!isVistaProfe && servicio.precio ? ` · $${servicio.precio.toLocaleString('es-CL')}` : ''}`
                  : '—'
              }
            />
            <DetalleItem
              icon={<User className="size-3.5 text-gray-400" />}
              label="Profesional"
              value={`${profesional?.nombre ?? '—'}${profesional?.especialidad ? ` · ${profesional.especialidad}` : ''}`}
            />
            {(cita.recurrence_kind ?? 'none') !== 'none' && (
              <DetalleItem
                icon={<Calendar className="size-3.5 text-gray-400" />}
                label="Recurrencia"
                value={`Serie ${cita.recurrence_kind}`}
              />
            )}
          </div>

          <SeccionConsentimiento cita={cita} />

          {!isVistaProfe && onPagoActualizado && (
            <SeccionCobroCita cita={cita} onPagoActualizado={onPagoActualizado} />
          )}

          {/* ── Feedback del paciente ── */}
          {feedback && (
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Feedback paciente</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  feedback.rating === 'excelente' ? 'bg-green-100 text-green-700' :
                  feedback.rating === 'regular' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {feedback.rating === 'excelente' ? '😊 Excelente' : feedback.rating === 'regular' ? '😐 Regular' : '😞 Mala'}
                </span>
              </div>
              {feedback.respuestas && Object.keys(feedback.respuestas).length > 0 && (
                <div className="space-y-1 mb-2">
                  {Object.entries(feedback.respuestas).map(([k, v]) => (
                    <p key={k} className="text-[12px] text-gray-500"><span className="text-gray-400">{k}:</span> {v}</p>
                  ))}
                </div>
              )}
              {feedback.comentario && (
                <p className="text-[12px] text-gray-600 italic bg-gray-50 rounded-lg px-3 py-2">"{feedback.comentario}"</p>
              )}
            </div>
          )}

          {/* ── Notas clínicas ── */}
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardEdit className="size-3.5 text-blue-500" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Notas clínicas
                </p>
              </div>
              {puedeEscribirNotas && !mostrarNota && (
                <button
                  onClick={() => setMostrarNota(true)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#2563EB] hover:text-blue-700 transition-colors"
                >
                  <Plus className="size-3" />
                  Agregar
                </button>
              )}
            </div>

            {mostrarNota && puedeEscribirNotas && (
              <div className="space-y-2 mb-3">
                <textarea
                  value={textoNota}
                  onChange={(e) => setTextoNota(e.target.value)}
                  placeholder="Evolución, observaciones, tratamiento aplicado..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 placeholder:text-gray-400"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={guardarNota}
                    disabled={guardandoNota || !textoNota.trim()}
                    className="text-[12px] text-white bg-[#2563EB] hover:bg-blue-700 border-0"
                  >
                    {guardandoNota && <Loader2 className="size-3 animate-spin mr-1" />}
                    Guardar nota
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setMostrarNota(false); setTextoNota('') }} className="text-[12px]">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {notasClinicas.length === 0 ? (
              <p className="text-[12px] text-gray-400 italic">Sin notas clínicas</p>
            ) : (
              <div className="space-y-2">
                {notasClinicas.map((nota) => (
                  <article key={nota.id} className="border border-gray-100 rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] text-gray-400">
                        {nota.profesionales?.nombre && `${nota.profesionales.nombre} · `}
                        {format(parseISO(nota.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                        {nota.cita_id === cita.id && (
                          <span className="ml-1 text-blue-400 font-medium">· esta cita</span>
                        )}
                      </span>
                      {puedeEscribirNotas && (
                        <button
                          onClick={() => borrarNota(nota.id)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="size-3 text-red-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-700 whitespace-pre-wrap mt-1">{nota.contenido}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* ── Próximas citas del mismo paciente ── */}
          {citasFuturas.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <CalendarCheck className="size-3.5 text-teal-500" />
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Próximas citas
                </p>
              </div>
              <div className="space-y-1.5">
                {citasFuturas.map((fc) => {
                  const fechaCorta = format(parseISO(fc.inicio), 'EEE d MMM', { locale: es })
                  const hora = fc.inicio.slice(11, 16)
                  const colorProfe = fc.profesionales?.color ?? '#6B7280'
                  return (
                    <div key={fc.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: colorProfe }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-gray-700 truncate">
                          {fc.servicios?.nombre ?? '—'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {fechaCorta} · {hora} · {fc.profesionales?.nombre ?? '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Fichas clínicas (mini panel) ── */}
          {paciente?.id && <MiniPanelFichas pacienteId={paciente.id} />}

          {/* ── Historial del paciente ── */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="size-3.5 text-gray-400" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Últimas visitas
              </p>
            </div>

            {cargandoHistorial ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <Loader2 className="size-3.5 animate-spin" />
                Cargando historial…
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-[13px] text-gray-700 font-medium">
                  Primera visita de este paciente 🎉
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  No hay visitas anteriores registradas
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {historial.map((h) => {
                  const fechaRelativa = formatDistanceToNow(parseISO(h.inicio), {
                    locale: es,
                    addSuffix: true,
                  })
                  const badge = historialBadge[h.estado]
                  return (
                    <div key={h.id} className="py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-gray-700 truncate">
                            {h.servicios?.nombre ?? '—'}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {fechaRelativa} · {h.profesionales?.nombre}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-50">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Auditoría
            </p>
            {audit.length === 0 ? (
              <p className="text-[12px] text-gray-400">Sin eventos de auditoría.</p>
            ) : (
              <div className="space-y-1">
                {audit.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="text-[11px] text-gray-500 border-b border-gray-50 pb-1">
                    <span className="font-semibold text-gray-700">{entry.accion}</span>
                    <span className="ml-1">{formatDistanceToNow(parseISO(entry.created_at), { locale: es, addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer con acciones principales */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          {/* Botón Iniciar / Completar cita — solo para pendiente/confirmada */}
          {(estadoActual === 'pendiente' || estadoActual === 'confirmada') && (
            wizardActivo ? (
              <Button
                size="sm"
                onClick={() => setWizardAbierto(true)}
                className="w-full text-[12px] gap-1.5 border-0 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle className="size-3.5" />
                Iniciar cita
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => cambiarEstado('completada')}
                className="w-full text-[12px] gap-1.5 border-0 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle2 className="size-3.5" />
                Completar cita
              </Button>
            )
          )}
          <div className="flex gap-2">
            {!isVistaProfe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditar(cita)}
                className="flex-1 text-[12px] gap-1.5"
              >
                <Edit2 className="size-3.5" />
                Editar cita
              </Button>
            )}
            {paciente?.telefono && (
              <Button
                size="sm"
                onClick={abrirWhatsApp}
                className={`text-[12px] gap-1.5 bg-teal-500 hover:bg-teal-600 text-white border-0 ${isVistaProfe ? 'flex-1' : ''}`}
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Modal de confirmación para acciones destructivas */}
      {confirmarCambio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmarCambio(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="size-5 text-red-500" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-gray-900">
                  {confirmarCambio.estado === 'cancelada' ? 'Cancelar cita' : 'Marcar como no asistió'}
                </p>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {confirmarCambio.estado === 'cancelada'
                    ? '¿Seguro que quieres cancelar esta cita? No se puede deshacer fácilmente.'
                    : `¿${paciente?.nombre ?? 'El paciente'} no asistió a esta cita?`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmarCambio(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => cambiarEstado(confirmarCambio.estado)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {confirmarCambio.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Iniciar Cita */}
      {wizardAbierto && (
        <WizardIniciarCita
          cita={cita}
          rolUsuario={(rol as 'admin' | 'profesional' | 'recepcionista' | 'coordinador') ?? 'admin'}
          onCerrar={() => setWizardAbierto(false)}
          onCompletada={(citaId) => {
            setEstadoActual('completada')
            onEstadoActualizado(citaId, 'completada')
            setWizardAbierto(false)
          }}
        />
      )}
    </>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function DetalleItem({
  icon,
  label,
  value,
  multiline = false,
  muted = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  multiline?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-[13px] mt-0.5 ${multiline ? 'whitespace-pre-wrap' : 'truncate'} ${muted ? 'text-gray-400 italic' : 'text-gray-700'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
