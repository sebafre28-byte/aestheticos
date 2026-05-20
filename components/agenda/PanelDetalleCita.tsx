'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO, differenceInMinutes, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  X, Edit2, MessageCircle, CheckCircle, CheckCircle2, Clock,
  User, Scissors, Calendar, FileText, History, Phone, ClipboardEdit, Loader2,
  XCircle, UserX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'
import { actualizarEstadoCita, getHistorialPaciente, editarCita, getAuditCita, type AuditLogRow } from '@/lib/agenda/queries'
import type { PagoCitaFields } from '@/lib/cobros/queries'
import { SeccionCobroCita } from './SeccionCobroCita'
import { useDialogA11y } from './useDialogA11y'

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
  const [audit, setAudit] = useState<AuditLogRow[]>([])

  const [mostrarNota, setMostrarNota] = useState(false)
  const [textoNota, setTextoNota] = useState(cita.notas ?? '')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [notaGuardada, setNotaGuardada] = useState(false)

  const paciente = cita.pacientes
  const profesional = cita.profesionales
  const servicio = cita.servicios

  const horaInicio = cita.inicio.slice(11, 16)
  const horaFin = cita.fin.slice(11, 16)
  const fechaFormateada = format(parseISO(cita.inicio), "EEEE d 'de' MMMM", { locale: es })
  const duracion = differenceInMinutes(parseISO(cita.fin), parseISO(cita.inicio))

  const estadoInfo = estadoConfig[estadoActual]
  const IconoEstado = estadoInfo.icon
  const acciones = getAcciones(estadoActual)

  useEffect(() => {
    if (!paciente?.id) return
    getHistorialPaciente(paciente.id).then((h) => {
      setHistorial(h.filter((c) => c.id !== cita.id).slice(0, 5))
      setCargandoHistorial(false)
    })
  }, [paciente?.id, cita.id])

  useEffect(() => {
    getAuditCita(cita.id).then(setAudit)
  }, [cita.id])

  async function cambiarEstado(nuevoEstado: EstadoCita) {
    setActualizando(nuevoEstado)
    setEstadoActual(nuevoEstado)
    onEstadoActualizado(cita.id, nuevoEstado)
    const ok = await actualizarEstadoCita(cita.id, nuevoEstado)
    if (!ok) {
      setEstadoActual(cita.estado)
      onEstadoActualizado(cita.id, cita.estado)
    }
    setActualizando(null)
  }

  async function guardarNota() {
    setGuardandoNota(true)
    const resultado = await editarCita(cita.id, { notas: textoNota || undefined })
    setGuardandoNota(false)
    if (resultado) {
      setNotaGuardada(true)
      setTimeout(() => setNotaGuardada(false), 2000)
    }
  }

  function abrirWhatsApp() {
    if (!paciente?.telefono) return
    const num = paciente.telefono.replace(/\D/g, '')
    const mensaje = encodeURIComponent(
      `Hola ${paciente.nombre}, te recordamos tu cita el ${fechaFormateada} a las ${horaInicio} para ${servicio?.nombre ?? 'tu servicio'}.`
    )
    window.open(`https://wa.me/${num}?text=${mensaje}`, '_blank')
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
        className="fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-slide-in-right"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isVistaProfe ? 'Mi cita' : 'Detalle de cita'}
          </h2>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Badge de estado prominente */}
        <div className={`px-5 py-3.5 border-b flex items-center gap-3 shrink-0 ${estadoInfo.bgColor} ${estadoInfo.borderColor}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/70`}>
            <IconoEstado className={`size-5 ${estadoInfo.textColor}`} />
          </div>
          <p className={`text-[15px] font-bold ${estadoInfo.textColor}`}>
            {estadoInfo.descripcion}
          </p>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Paciente ── */}
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-bold"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)' }}
              >
                {paciente?.nombre?.slice(0, 2).toUpperCase() ?? 'PA'}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">{paciente?.nombre ?? '—'}</p>
                {paciente?.telefono && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="size-3 text-gray-400" />
                    <p className="text-[12px] text-gray-500">{paciente.telefono}</p>
                  </div>
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
            <DetalleItem
              icon={<FileText className="size-3.5 text-gray-400" />}
              label="Notas"
              value={cita.notas ?? 'Sin notas'}
              multiline
              muted={!cita.notas}
            />
          </div>

          {!isVistaProfe && onPagoActualizado && (
            <SeccionCobroCita cita={cita} onPagoActualizado={onPagoActualizado} />
          )}

          {/* ── Cambiar estado (solo recepción) ── */}
          {!isVistaProfe && (
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Cambiar estado
              </p>
              <div className="flex flex-col gap-2">
                {acciones.map((accion) => {
                  const IconAccion = accion.icon
                  const cargando = actualizando === accion.estado
                  return (
                    <button
                      key={accion.estado}
                      onClick={() => cambiarEstado(accion.estado)}
                      disabled={!!actualizando}
                      className={`h-9 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${accion.className}`}
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

          {/* ── Nota clínica (solo vista profesional) ── */}
          {isVistaProfe && (
            <div className="px-5 py-4 border-b border-gray-50">
              {!mostrarNota ? (
                <button
                  onClick={() => setMostrarNota(true)}
                  className="flex items-center gap-2 text-[13px] font-medium text-[#2563EB] hover:text-blue-700 transition-colors"
                >
                  <ClipboardEdit className="size-4" />
                  Agregar nota clínica
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    Nota clínica
                  </p>
                  <textarea
                    value={textoNota}
                    onChange={(e) => setTextoNota(e.target.value)}
                    placeholder="Evolución, observaciones, tratamiento aplicado..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 placeholder:text-gray-400"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={guardarNota}
                      disabled={guardandoNota}
                      className="text-[12px] text-white bg-[#2563EB] hover:bg-blue-700 border-0"
                    >
                      {guardandoNota && <Loader2 className="size-3 animate-spin mr-1" />}
                      {notaGuardada ? '¡Guardado!' : 'Guardar nota'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMostrarNota(false)}
                      className="text-[12px]"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

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
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
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
