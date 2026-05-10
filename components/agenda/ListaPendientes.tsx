'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, differenceInMinutes, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown, ChevronUp, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react'
import type { CitaConRelaciones } from '@/lib/agenda/queries'
import { getCitasPendientes48h, actualizarEstadoCita } from '@/lib/agenda/queries'

type Props = {
  onCitaConfirmada: (citaId: string) => void
}

// Calcula texto de tiempo restante y si es urgente (< 60 min)
function tiempoRestante(inicio: string): { texto: string; urgente: boolean } {
  const ahora = new Date()
  const fechaInicio = parseISO(inicio)
  const diffMin = differenceInMinutes(fechaInicio, ahora)

  if (diffMin <= 0) return { texto: 'En curso o pasada', urgente: false }
  if (diffMin < 60) return { texto: `En ${diffMin} min`, urgente: true }
  if (diffMin < 120) return { texto: 'En 1 hora', urgente: diffMin < 90 }
  if (diffMin < 1440) return { texto: `En ${Math.floor(diffMin / 60)} horas`, urgente: false }
  return { texto: `Mañana ${inicio.slice(11, 16)}`, urgente: false }
}

export function ListaPendientes({ onCitaConfirmada }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [citas, setCitas] = useState<CitaConRelaciones[]>([])
  const [cargando, setCargando] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  useEffect(() => {
    cargarPendientes()
  }, [])

  async function cargarPendientes() {
    setCargando(true)
    const datos = await getCitasPendientes48h()
    setCitas(datos)
    setCargando(false)
  }

  async function confirmarCita(citaId: string) {
    setConfirmando(citaId)
    setCitas((prev) => prev.filter((c) => c.id !== citaId))
    onCitaConfirmada(citaId)
    const ok = await actualizarEstadoCita(citaId, 'confirmada')
    if (!ok) cargarPendientes()
    setConfirmando(null)
  }

  function abrirWhatsApp(cita: CitaConRelaciones) {
    const tel = cita.pacientes?.telefono?.replace(/\D/g, '')
    if (!tel) return
    const fecha = format(parseISO(cita.inicio), "EEEE d 'de' MMMM", { locale: es })
    const hora = cita.inicio.slice(11, 16)
    const mensaje = encodeURIComponent(
      `Hola ${cita.pacientes?.nombre}, te recordamos tu cita el ${fecha} a las ${hora} para ${cita.servicios?.nombre ?? 'tu servicio'}. ¿Puedes confirmar asistencia?`
    )
    window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank')
  }

  // Agrupar por día
  const hoyStr = format(new Date(), 'yyyy-MM-dd')
  const mananaStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const citasHoy = citas.filter((c) => c.inicio.slice(0, 10) === hoyStr)
  const citasManana = citas.filter((c) => c.inicio.slice(0, 10) === mananaStr)
  const citasOtras = citas.filter((c) => {
    const d = c.inicio.slice(0, 10)
    return d !== hoyStr && d !== mananaStr
  })

  const grupos: { label: string; citas: CitaConRelaciones[] }[] = []
  if (citasHoy.length > 0) grupos.push({ label: `Hoy (${citasHoy.length})`, citas: citasHoy })
  if (citasManana.length > 0) grupos.push({ label: `Mañana (${citasManana.length})`, citas: citasManana })
  if (citasOtras.length > 0) grupos.push({ label: `Próximas (${citasOtras.length})`, citas: citasOtras })

  // Detectar citas urgentes (próximas 60 min)
  const hayUrgentes = citas.some((c) => {
    const diff = differenceInMinutes(parseISO(c.inicio), new Date())
    return diff >= 0 && diff <= 60
  })

  const totalPendientes = citas.length

  return (
    <div className="relative">
      {/* Botón con badge */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors border ${
          abierto
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <AlertCircle className={`size-3.5 ${totalPendientes > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
        Pendientes
        {totalPendientes > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalPendientes}
          </span>
        )}
        {/* Indicador pulsante si hay urgentes */}
        {hayUrgentes && !abierto && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        {abierto ? (
          <ChevronUp className="size-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="size-3.5 text-gray-400" />
        )}
      </button>

      {/* Panel desplegable */}
      {abierto && (
        <div className="absolute top-full right-0 mt-1 w-[440px] bg-white border border-gray-100 rounded-xl shadow-2xl z-30 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Citas por confirmar</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Próximas 48 horas</p>
            </div>
            <button
              onClick={cargarPendientes}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Actualizar
            </button>
          </div>

          {/* Lista agrupada */}
          <div className="max-h-[420px] overflow-y-auto">
            {cargando ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[12px] text-gray-400">Cargando…</p>
              </div>
            ) : citas.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="size-8 text-teal-300 mx-auto mb-2" />
                <p className="text-[13px] font-medium text-gray-700">¡Todo confirmado!</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  No hay citas pendientes en las próximas 48h
                </p>
              </div>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.label}>
                  {/* Encabezado del grupo */}
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {grupo.label}
                    </p>
                  </div>

                  {/* Citas del grupo */}
                  <div className="divide-y divide-gray-50">
                    {grupo.citas.map((cita) => {
                      const horaInicio = cita.inicio.slice(11, 16)
                      const fechaStr = format(parseISO(cita.inicio), 'd MMM', { locale: es })
                      const tieneTelefono = !!cita.pacientes?.telefono
                      const { texto: restante, urgente } = tiempoRestante(cita.inicio)

                      return (
                        <div
                          key={cita.id}
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${
                            urgente ? 'bg-red-50/40' : ''
                          }`}
                        >
                          {/* Hora */}
                          <div className="w-14 shrink-0 text-right">
                            <p className="text-[12px] font-bold text-gray-700">{horaInicio}</p>
                            <p className="text-[10px] text-gray-400">{fechaStr}</p>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900 truncate">
                              {cita.pacientes?.nombre ?? '—'}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {cita.servicios?.nombre} · {cita.profesionales?.nombre}
                            </p>
                            {/* Tiempo restante */}
                            <p className={`text-[10px] font-medium mt-0.5 ${urgente ? 'text-red-500' : 'text-gray-400'}`}>
                              {restante}
                            </p>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 shrink-0">
                            {tieneTelefono && (
                              <button
                                onClick={() => abrirWhatsApp(cita)}
                                title="Enviar WhatsApp"
                                className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center transition-colors group"
                              >
                                <MessageCircle className="size-3.5 text-gray-400 group-hover:text-emerald-500" />
                              </button>
                            )}
                            <button
                              onClick={() => confirmarCita(cita.id)}
                              disabled={confirmando === cita.id}
                              title="Confirmar cita"
                              className="h-7 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 text-[11px] font-semibold transition-colors flex items-center gap-1 disabled:opacity-60"
                            >
                              {confirmando === cita.id ? (
                                <div className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle className="size-3" />
                              )}
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
