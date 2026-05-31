'use client'

import { useEffect, useMemo, useState } from 'react'
import { differenceInYears, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarDays,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  actualizarFichaClinica,
  actualizarNotasPaciente,
  getPacienteDetalle,
  type HistorialCitaPaciente,
  type PacienteRow,
} from '@/lib/pacientes/queries'

type Tab = 'informacion' | 'historial' | 'salud' | 'notas'

type Props = {
  pacienteId: string
  onClose: () => void
  onEditar: (paciente: PacienteRow) => void
  onToggleActivo?: (paciente: PacienteRow) => void
  onEliminar?: (paciente: PacienteRow) => void
  onNuevaCita?: (pacienteId: string) => void
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function getEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return '—'
  return `${differenceInYears(new Date(), parseISO(fechaNacimiento))} años`
}

function formatCLP(v: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v)
}

const GENERO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiero no decir',
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]

function avatarGradient(nombre: string) {
  const idx = nombre.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

function estadoBadge(estado: string) {
  switch (estado) {
    case 'pendiente':
      return 'bg-amber-50 text-amber-700'
    case 'confirmada':
      return 'bg-teal-50 text-teal-700'
    case 'completada':
      return 'bg-blue-50 text-blue-700'
    case 'cancelada':
      return 'bg-red-50 text-red-500 line-through'
    case 'no_asistio':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function estadoLabel(estado: string) {
  switch (estado) {
    case 'pendiente': return 'Pendiente'
    case 'confirmada': return 'Confirmada'
    case 'completada': return 'Completada'
    case 'cancelada': return 'Cancelada'
    case 'no_asistio': return 'No asistió'
    default: return estado
  }
}

function PagoBadge({ monto, estado }: { monto: number | null; estado: string | null }) {
  if (estado === 'pagado') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
        Pagado {monto != null ? formatCLP(monto) : ''}
      </span>
    )
  }
  if (estado === 'parcial') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
        Parcial {monto != null ? formatCLP(monto) : ''}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Sin cobro
    </span>
  )
}

export function FichaPaciente({
  pacienteId,
  onClose,
  onEditar,
  onToggleActivo,
  onEliminar,
  onNuevaCita,
}: Props) {
  const [tab, setTab] = useState<Tab>('informacion')
  const [paciente, setPaciente] = useState<PacienteRow | null>(null)
  const [historial, setHistorial] = useState<HistorialCitaPaciente[]>([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState('')
  const [guardandoNotas, setGuardandoNotas] = useState(false)
  const [alergias, setAlergias] = useState('')
  const [condiciones, setCondiciones] = useState('')
  const [guardandoSalud, setGuardandoSalud] = useState(false)
  const [saludGuardada, setSaludGuardada] = useState(false)

  useEffect(() => {
    let active = true
    getPacienteDetalle(pacienteId).then((data) => {
      if (!active) return
      setPaciente(data.paciente)
      setHistorial(data.historial)
      setNotas(data.paciente?.notas ?? '')
      setAlergias(data.paciente?.alergias ?? '')
      setCondiciones(data.paciente?.condiciones ?? '')
      setLoading(false)
    })
    return () => { active = false }
  }, [pacienteId])

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const stats = useMemo(() => {
    const totalCitas = historial.length
    const completadas = historial.filter((h) => h.estado === 'completada').length
    const canceladas = historial.filter((h) => h.estado === 'cancelada' || h.estado === 'no_asistio').length
    const totalGastado = historial
      .filter((h) => h.pago_estado === 'pagado' || h.pago_estado === 'parcial')
      .reduce((sum, h) => sum + (h.pago_monto ?? 0), 0)
    const tasaAsistencia = Math.round((completadas / Math.max(totalCitas - canceladas, 1)) * 100)
    const ticketPromedio = totalGastado / Math.max(completadas, 1)
    return { totalCitas, completadas, canceladas, totalGastado, tasaAsistencia, ticketPromedio }
  }, [historial])

  const now = new Date().toISOString()
  const proximaCita = historial.find(
    (h) => h.inicio > now && h.estado !== 'cancelada' && h.estado !== 'no_asistio'
  )

  async function guardarNotas() {
    if (!paciente) return
    setGuardandoNotas(true)
    const ok = await actualizarNotasPaciente(paciente.id, notas)
    setGuardandoNotas(false)
    if (ok) setPaciente({ ...paciente, notas })
  }

  async function guardarSalud() {
    if (!paciente) return
    setGuardandoSalud(true)
    const ok = await actualizarFichaClinica(paciente.id, { alergias, condiciones })
    setGuardandoSalud(false)
    if (ok) {
      setPaciente({ ...paciente, alergias, condiciones })
      setSaludGuardada(true)
      setTimeout(() => setSaludGuardada(false), 2000)
    }
  }

  function abrirWhatsApp() {
    if (!paciente?.telefono) return
    const phone = paciente.telefono.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right p-6">
          <p className="text-sm text-gray-500">Cargando ficha del paciente...</p>
        </div>
      </>
    )
  }

  if (!paciente) return null

  const gradient = avatarGradient(paciente.nombre)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'informacion', label: 'Información' },
    { key: 'historial', label: 'Historial' },
    { key: 'salud', label: 'Salud' },
    { key: 'notas', label: 'Notas' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} text-white font-bold text-lg flex-shrink-0`}>
                {iniciales(paciente.nombre)}
              </div>
              <div>
                <p className="text-[16px] font-bold text-gray-900 leading-tight">{paciente.nombre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${paciente.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {paciente.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Cliente desde {format(parseISO(paciente.created_at), 'MMM yyyy', { locale: es })}
                  </span>
                </div>
                {proximaCita && (
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                    <CalendarDays className="size-3" />
                    Próxima cita: {format(parseISO(proximaCita.inicio), "d MMM HH:mm", { locale: es })}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Citas', value: stats.totalCitas.toString() },
              { label: 'Total gastado', value: formatCLP(stats.totalGastado) },
              { label: 'Asistencia', value: `${stats.tasaAsistencia}%` },
              { label: 'Ticket prom.', value: formatCLP(stats.ticketPromedio) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{s.label}</p>
                <p className="text-[16px] font-bold text-gray-900 mt-0.5 leading-tight truncate">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                  tab === key ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ---- INFORMACIÓN ---- */}
          {tab === 'informacion' && (
            <div className="space-y-4">
              <InfoRow icon={<User className="size-3.5 text-gray-400" />} label="RUT" value={paciente.rut ?? '—'} />
              <InfoRow
                icon={<Phone className="size-3.5 text-gray-400" />}
                label="Teléfono"
                value={
                  paciente.telefono
                    ? <a href={`tel:${paciente.telefono}`} className="text-[#2563EB] hover:underline">{paciente.telefono}</a>
                    : '—'
                }
              />
              <InfoRow
                icon={<Mail className="size-3.5 text-gray-400" />}
                label="Email"
                value={
                  paciente.email
                    ? <a href={`mailto:${paciente.email}`} className="text-[#2563EB] hover:underline">{paciente.email}</a>
                    : '—'
                }
              />
              <InfoRow
                icon={<CalendarDays className="size-3.5 text-gray-400" />}
                label="Nacimiento"
                value={
                  paciente.fecha_nacimiento
                    ? `${format(parseISO(paciente.fecha_nacimiento), "d 'de' MMMM, yyyy", { locale: es })} · ${getEdad(paciente.fecha_nacimiento)}`
                    : '—'
                }
              />
              <InfoRow
                icon={<User className="size-3.5 text-gray-400" />}
                label="Género"
                value={paciente.genero ? (GENERO_LABELS[paciente.genero] ?? paciente.genero) : '—'}
              />
              {paciente.direccion && (
                <InfoRow
                  icon={<MessageCircle className="size-3.5 text-gray-400" />}
                  label="Dirección"
                  value={paciente.direccion}
                />
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => onEditar(paciente)} className="flex-1 text-[13px]">
                  Editar datos
                </Button>
                {paciente.telefono && (
                  <Button onClick={abrirWhatsApp} className="flex-1 text-white bg-teal-500 hover:bg-teal-600 text-[13px]">
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ---- HISTORIAL ---- */}
          {tab === 'historial' && (
            <div className="space-y-2">
              {proximaCita && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 mb-4">
                  <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Próxima cita</p>
                  <p className="text-[13px] font-semibold text-blue-900">
                    {format(parseISO(proximaCita.inicio), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
                  </p>
                  <p className="text-[12px] text-blue-700 mt-0.5">{proximaCita.servicios?.nombre ?? 'Servicio'}</p>
                  <p className="text-[11px] text-blue-500 mt-0.5">{proximaCita.profesionales?.nombre ?? ''}</p>
                </div>
              )}

              {historial.filter((h) => h.inicio <= now || h.estado === 'cancelada' || h.estado === 'no_asistio').length === 0 && !proximaCita ? (
                <div className="flex flex-col items-center py-12 text-gray-300">
                  <CalendarDays className="size-10 mb-3" />
                  <p className="text-[13px] text-gray-400">Sin citas registradas</p>
                </div>
              ) : (
                historial
                  .filter((h) => !(h.inicio > now && h.estado !== 'cancelada' && h.estado !== 'no_asistio'))
                  .map((item) => {
                    const dotColor = item.profesionales?.color ?? '#9CA3AF'
                    return (
                      <article key={item.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: dotColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[13px] font-semibold text-gray-900">{item.servicios?.nombre ?? 'Servicio'}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {format(parseISO(item.inicio), "d MMM yyyy · HH:mm", { locale: es })}
                                </p>
                                <p className="text-[11px] text-gray-400">{item.profesionales?.nombre ?? ''}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${estadoBadge(item.estado)}`}>
                                  {estadoLabel(item.estado)}
                                </span>
                                <PagoBadge monto={item.pago_monto} estado={item.pago_estado} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })
              )}
            </div>
          )}

          {/* ---- SALUD ---- */}
          {tab === 'salud' && (
            <div className="space-y-4">
              {alergias === '' && condiciones === '' ? (
                <div className="flex flex-col items-center py-8 text-gray-300 mb-4">
                  <Stethoscope className="size-10 mb-3" />
                  <p className="text-[13px] text-gray-400 font-medium">Agregar información de salud</p>
                  <p className="text-[12px] text-gray-400 mt-1">Completa los campos a continuación</p>
                </div>
              ) : null}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Alergias
                </label>
                <textarea
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  rows={3}
                  placeholder="Ej: Penicilina, látex..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Condiciones médicas
                </label>
                <textarea
                  value={condiciones}
                  onChange={(e) => setCondiciones(e.target.value)}
                  rows={3}
                  placeholder="Ej: Diabetes tipo 2, hipertensión..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
              <Button
                onClick={guardarSalud}
                disabled={guardandoSalud}
                className="w-full text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {guardandoSalud ? 'Guardando...' : saludGuardada ? '✓ Guardado' : 'Guardar ficha clínica'}
              </Button>
              <p className="text-[11px] text-gray-400 text-center">
                Esta información es confidencial y solo visible para el equipo médico.
              </p>
            </div>
          )}

          {/* ---- NOTAS ---- */}
          {tab === 'notas' && (
            <div className="space-y-3">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={8}
                placeholder="Escribe notas clínicas del paciente..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
              <Button
                onClick={guardarNotas}
                disabled={guardandoNotas}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {guardandoNotas ? 'Guardando...' : 'Guardar notas'}
              </Button>
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas por cita</p>
                {historial.filter((h) => h.notas).length === 0 ? (
                  <p className="text-[12px] text-gray-400">No hay notas clínicas históricas.</p>
                ) : (
                  historial
                    .filter((h) => h.notas)
                    .map((h) => (
                      <div key={h.id} className="mb-2 p-2 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-[11px] text-gray-400">
                            {format(parseISO(h.inicio), "d MMM yyyy", { locale: es })}
                          </p>
                          {h.profesionales?.nombre && (
                            <p className="text-[11px] text-gray-400">{h.profesionales.nombre}</p>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{h.notas}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          {onNuevaCita && (
            <Button
              onClick={() => onNuevaCita(paciente.id)}
              className="w-full text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              <CalendarDays className="size-4 mr-2" />
              Nueva cita
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEditar(paciente)} className="flex-1 text-[12px]">
              Editar
            </Button>
            {paciente.telefono && (
              <Button onClick={abrirWhatsApp} className="flex-1 text-white bg-teal-500 hover:bg-teal-600 text-[12px]">
                WhatsApp
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onToggleActivo && (
              <Button
                variant="outline"
                onClick={() => onToggleActivo(paciente)}
                className="flex-1 text-[12px]"
              >
                {paciente.activo
                  ? <><UserX className="size-3.5 mr-1.5 text-amber-400" />Desactivar</>
                  : <><UserCheck className="size-3.5 mr-1.5 text-emerald-500" />Activar</>}
              </Button>
            )}
            {onEliminar && (
              <Button
                variant="outline"
                onClick={() => onEliminar(paciente)}
                className="flex-1 text-[12px] text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-gray-700">{value}</p>
      </div>
    </div>
  )
}
