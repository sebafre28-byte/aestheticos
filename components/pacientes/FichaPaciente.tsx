'use client'

import { useEffect, useMemo, useState } from 'react'
import { differenceInYears, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Clock3, MessageCircle, Phone, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { actualizarNotasPaciente, getPacienteDetalle, type HistorialCitaPaciente, type PacienteRow } from '@/lib/pacientes/queries'

type Tab = 'informacion' | 'historial' | 'notas'

type Props = {
  pacienteId: string
  onClose: () => void
  onEditar: (paciente: PacienteRow) => void
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

export function FichaPaciente({ pacienteId, onClose, onEditar }: Props) {
  const [tab, setTab] = useState<Tab>('informacion')
  const [paciente, setPaciente] = useState<PacienteRow | null>(null)
  const [historial, setHistorial] = useState<HistorialCitaPaciente[]>([])
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState('')
  const [guardandoNotas, setGuardandoNotas] = useState(false)

  useEffect(() => {
    let active = true
    getPacienteDetalle(pacienteId).then((data) => {
      if (!active) return
      setPaciente(data.paciente)
      setHistorial(data.historial)
      setNotas(data.paciente?.notas ?? '')
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [pacienteId])

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const stats = useMemo(() => {
    const total = historial.length
    const completadas = historial.filter((h) => h.estado === 'completada').length
    const canceladas = historial.filter((h) => h.estado === 'cancelada' || h.estado === 'no_asistio').length
    return { total, completadas, canceladas }
  }, [historial])

  async function guardarNotas() {
    if (!paciente) return
    setGuardandoNotas(true)
    const ok = await actualizarNotasPaciente(paciente.id, notas)
    setGuardandoNotas(false)
    if (ok) {
      setPaciente({ ...paciente, notas })
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
        <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right p-6">
          <p className="text-sm text-gray-500">Cargando ficha del paciente...</p>
        </div>
      </>
    )
  }

  if (!paciente) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#2563EB]/10 text-[#2563EB] font-bold text-sm">
                {iniciales(paciente.nombre)}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-gray-900">{paciente.nombre}</p>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${paciente.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {paciente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="size-4 text-gray-500" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {(['informacion', 'historial', 'notas'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                  tab === key ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {key === 'informacion' ? 'Información' : key === 'historial' ? 'Historial' : 'Notas'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'informacion' && (
            <div className="space-y-4">
              <InfoRow icon={<User className="size-3.5 text-gray-400" />} label="RUT" value={paciente.rut ?? '—'} />
              <InfoRow icon={<Phone className="size-3.5 text-gray-400" />} label="Teléfono" value={paciente.telefono ?? '—'} />
              <InfoRow icon={<MessageCircle className="size-3.5 text-gray-400" />} label="Email" value={paciente.email ?? '—'} />
              <InfoRow icon={<CalendarDays className="size-3.5 text-gray-400" />} label="Nacimiento" value={paciente.fecha_nacimiento ? format(parseISO(paciente.fecha_nacimiento), "d 'de' MMMM, yyyy", { locale: es }) : '—'} />
              <InfoRow icon={<Clock3 className="size-3.5 text-gray-400" />} label="Edad" value={getEdad(paciente.fecha_nacimiento)} />

              <div className="grid grid-cols-3 gap-2 pt-2">
                <StatCard label="Total citas" value={stats.total.toString()} />
                <StatCard label="Completadas" value={stats.completadas.toString()} />
                <StatCard label="Canceladas" value={stats.canceladas.toString()} />
              </div>
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-2">
              {historial.length === 0 ? (
                <p className="text-[13px] text-gray-400">No hay historial de citas.</p>
              ) : (
                historial.map((item) => (
                  <article key={item.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">{item.servicios?.nombre ?? 'Servicio'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {format(parseISO(item.inicio), "d MMM yyyy '·' HH:mm", { locale: es })}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.profesionales?.nombre ?? 'Profesional'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.estado}</span>
                        <p className="text-[12px] text-gray-700 mt-1">${(item.servicios?.precio ?? 0).toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

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
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Historial</p>
                {historial.filter((h) => h.notas).length === 0 ? (
                  <p className="text-[12px] text-gray-400">No hay notas clínicas históricas.</p>
                ) : (
                  historial
                    .filter((h) => h.notas)
                    .map((h) => (
                      <div key={h.id} className="mb-2 p-2 rounded-lg border border-gray-100 bg-gray-50">
                        <p className="text-[11px] text-gray-400">
                          {format(parseISO(h.inicio), "d MMM yyyy", { locale: es })}
                        </p>
                        <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{h.notas}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <Button variant="outline" onClick={() => onEditar(paciente)} className="flex-1">
            Editar
          </Button>
          <Button onClick={abrirWhatsApp} className="flex-1 text-white bg-teal-500 hover:bg-teal-600">
            WhatsApp
          </Button>
        </div>
      </aside>
    </>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-2 bg-gray-50">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-[16px] font-semibold text-gray-900">{value}</p>
    </div>
  )
}
