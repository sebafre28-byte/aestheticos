'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, differenceInMinutes, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, MessageCircle, ClipboardCheck, RefreshCw, Calendar } from 'lucide-react'
import type { CitaConRelaciones } from '@/lib/agenda/queries'
import { getCitasPendientes48h, actualizarEstadoCita } from '@/lib/agenda/queries'
import { useRol } from '@/lib/auth/useRol'
import { useRouter } from 'next/navigation'

function tiempoRestante(inicio: string): { texto: string; urgente: boolean } {
  const diff = differenceInMinutes(parseISO(inicio), new Date())
  if (diff <= 0) return { texto: 'En curso', urgente: false }
  if (diff < 60) return { texto: `En ${diff} min`, urgente: true }
  if (diff < 120) return { texto: 'En 1 hora', urgente: diff < 90 }
  if (diff < 1440) return { texto: `En ${Math.floor(diff / 60)} horas`, urgente: false }
  return { texto: `Mañana ${inicio.slice(11, 16)}`, urgente: false }
}

function CitaCard({ cita, onConfirmar, confirmando }: {
  cita: CitaConRelaciones
  onConfirmar: (id: string) => void
  confirmando: string | null
}) {
  const { texto, urgente } = tiempoRestante(cita.inicio)
  const hora = cita.inicio.slice(11, 16)
  const horaFin = cita.fin?.slice(11, 16)

  function abrirWhatsApp() {
    const tel = cita.pacientes?.telefono?.replace(/\D/g, '')
    if (!tel) return
    const fecha = format(parseISO(cita.inicio), "EEEE d 'de' MMMM", { locale: es })
    const msg = encodeURIComponent(`Hola ${cita.pacientes?.nombre}, te recordamos tu cita el ${fecha} a las ${hora} para ${cita.servicios?.nombre ?? 'tu servicio'}. ¿Puedes confirmar asistencia?`)
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
  }

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${urgente ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
      {/* Hora */}
      <div className="shrink-0 text-center w-14">
        <p className="text-[15px] font-bold text-gray-900 leading-tight">{hora}</p>
        {horaFin && <p className="text-[11px] text-gray-400">{horaFin}</p>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-900 truncate">{cita.pacientes?.nombre ?? '—'}</p>
        <p className="text-[12px] text-gray-500 truncate">{cita.servicios?.nombre ?? '—'}</p>
        {cita.profesionales?.nombre && (
          <p className="text-[11px] text-gray-400 mt-0.5">con {cita.profesionales.nombre}</p>
        )}
        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgente ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
          {texto}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex gap-1.5 shrink-0">
        {cita.pacientes?.telefono && (
          <button
            onClick={abrirWhatsApp}
            title="Enviar WhatsApp"
            className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="size-3.5 text-green-600" />
          </button>
        )}
        <button
          onClick={() => onConfirmar(cita.id)}
          disabled={confirmando === cita.id}
          title="Confirmar cita"
          className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="size-3.5 text-blue-600" />
        </button>
      </div>
    </div>
  )
}

export default function PendientesPage() {
  const { rol } = useRol()
  const router = useRouter()
  const [citas, setCitas] = useState<CitaConRelaciones[]>([])
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const datos = await getCitasPendientes48h()
      setCitas(datos)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function confirmar(citaId: string) {
    setConfirmando(citaId)
    setCitas(prev => prev.filter(c => c.id !== citaId))
    try {
      const ok = await actualizarEstadoCita(citaId, 'confirmada')
      if (!ok) await cargar()
    } catch { await cargar() }
    finally { setConfirmando(null) }
  }

  const hoyStr = format(new Date(), 'yyyy-MM-dd')
  const mananaStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const grupos = [
    { label: 'Hoy', citas: citas.filter(c => c.inicio.slice(0, 10) === hoyStr) },
    { label: 'Mañana', citas: citas.filter(c => c.inicio.slice(0, 10) === mananaStr) },
    { label: 'Próximos días', citas: citas.filter(c => c.inicio.slice(0, 10) > mananaStr) },
  ].filter(g => g.citas.length > 0)

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="size-5 text-blue-500" />
            Pendientes de confirmar
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {cargando ? 'Cargando...' : citas.length === 0
              ? 'Todo al día ✓'
              : `${citas.length} cita${citas.length !== 1 ? 's' : ''} sin confirmar (próximas 48 h)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={() => router.push('/agenda')}
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Calendar className="size-3.5" />
            Ver agenda
          </button>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : citas.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-[16px] font-semibold text-gray-900">¡Todo confirmado!</p>
          <p className="text-[13px] text-gray-400 mt-1">No hay citas pendientes en las próximas 48 horas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(grupo => (
            <div key={grupo.label}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{grupo.label}</p>
              <div className="space-y-2">
                {grupo.citas.map(cita => (
                  <CitaCard
                    key={cita.id}
                    cita={cita}
                    onConfirmar={confirmar}
                    confirmando={confirmando}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
