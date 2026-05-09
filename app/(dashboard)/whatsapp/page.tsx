"use client"

import { useState } from "react"
import {
  MessageCircle,
  CheckCheck,
  Check,
  Clock,
  TrendingDown,
  Send,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react"

const conversaciones = [
  {
    paciente: "Ana García",
    initials: "AG",
    ultimoMensaje: "Recordatorio: cita mañana a las 09:00 ✓",
    hora: "hace 2 h",
    estado: "leido",
    citaPendiente: "Mañana 09:00",
  },
  {
    paciente: "Sofía Mendoza",
    initials: "SM",
    ultimoMensaje: "Confirma tu cita de hoy a las 10:30",
    hora: "hace 3 h",
    estado: "entregado",
    citaPendiente: "Hoy 10:30",
  },
  {
    paciente: "Carmen Ruiz",
    initials: "CR",
    ultimoMensaje: "¡Hola! Perfecto, ahí estaré. Gracias.",
    hora: "hace 1 h",
    estado: "leido",
    citaPendiente: "Jueves 11:00",
  },
  {
    paciente: "Pedro Castro",
    initials: "PC",
    ultimoMensaje: "Tu cita fue cancelada. Reagenda aquí 🔗",
    hora: "hace 5 h",
    estado: "enviado",
    citaPendiente: null,
  },
  {
    paciente: "Valentina Soto",
    initials: "VS",
    ultimoMensaje: "¿Puedo cambiar la hora a las 16:00?",
    hora: "hace 45 min",
    estado: "no_leido",
    citaPendiente: "Hoy 15:30",
  },
  {
    paciente: "Isabel Morales",
    initials: "IM",
    ultimoMensaje: "Recordatorio enviado para el viernes",
    hora: "hace 4 h",
    estado: "entregado",
    citaPendiente: "Viernes 15:30",
  },
  {
    paciente: "Lucía Fernández",
    initials: "LF",
    ultimoMensaje: "Confirmada ✓ ¡Muchas gracias!",
    hora: "hace 6 h",
    estado: "leido",
    citaPendiente: "Lunes 13:00",
  },
]

const recordatorios = [
  {
    id: "r1",
    label: "Recordatorio 24 h antes",
    descripcion: "Mensaje automático el día anterior a la cita",
    defaultActivo: true,
  },
  {
    id: "r2",
    label: "Recordatorio 2 h antes",
    descripcion: "Aviso el mismo día, 2 horas antes",
    defaultActivo: true,
  },
  {
    id: "r3",
    label: "Confirmación de cita",
    descripcion: "Solicita confirmación 48 h antes",
    defaultActivo: true,
  },
  {
    id: "r4",
    label: "Post-cita: feedback",
    descripcion: "Encuesta de satisfacción al finalizar",
    defaultActivo: false,
  },
  {
    id: "r5",
    label: "Reagendamiento automático",
    descripcion: "Ofrece nueva fecha si cancela",
    defaultActivo: false,
  },
]

const estadoIcono = {
  leido: <CheckCheck className="size-3.5 text-blue-400" />,
  entregado: <CheckCheck className="size-3.5 text-gray-400" />,
  enviado: <Check className="size-3.5 text-gray-300" />,
  no_leido: <Clock className="size-3.5 text-amber-400" />,
}

function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        activo ? "bg-[#7C3AED]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          activo ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}

export default function WhatsAppPage() {
  const [conectado, setConectado] = useState(true)
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(recordatorios.map((r) => [r.id, r.defaultActivo]))
  )

  function flipToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const activosCount = Object.values(toggles).filter(Boolean).length

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">WhatsApp Business</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Gestión de mensajes y recordatorios automáticos
          </p>
        </div>

        {/* Estado de conexión */}
        <button
          onClick={() => setConectado((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
            conectado
              ? "bg-emerald-50 border-emerald-100 text-[#10B981] hover:bg-emerald-100"
              : "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
          }`}
        >
          {conectado ? (
            <>
              <Wifi className="size-3.5" />
              +56 9 1234 5678 · Conectado
            </>
          ) : (
            <>
              <WifiOff className="size-3.5" />
              Desconectado · Reconectar
            </>
          )}
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-8 h-8 bg-[#25D366]/10 rounded-lg flex items-center justify-center mb-3">
            <Send className="size-4 text-[#25D366]" />
          </div>
          <p className="text-[24px] font-bold text-gray-900 leading-none">24</p>
          <p className="text-[12px] text-gray-500 mt-1.5">Mensajes enviados hoy</p>
          <p className="text-[11px] mt-1 font-medium text-[#10B981]">+6 vs ayer</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center mb-3">
            <CheckCheck className="size-4 text-[#7C3AED]" />
          </div>
          <p className="text-[24px] font-bold text-gray-900 leading-none">87%</p>
          <p className="text-[12px] text-gray-500 mt-1.5">Tasa de confirmación</p>
          <p className="text-[11px] mt-1 font-medium text-[#10B981]">+4% este mes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center mb-3">
            <TrendingDown className="size-4 text-sky-600" />
          </div>
          <p className="text-[24px] font-bold text-gray-900 leading-none">11</p>
          <p className="text-[12px] text-gray-500 mt-1.5">No-shows evitados</p>
          <p className="text-[11px] mt-1 font-medium text-[#10B981]">este mes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
            <MessageCircle className="size-4 text-amber-600" />
          </div>
          <p className="text-[24px] font-bold text-gray-900 leading-none">7</p>
          <p className="text-[12px] text-gray-500 mt-1.5">Conversaciones activas</p>
          <p className="text-[11px] mt-1 font-medium text-amber-500">1 sin responder</p>
        </div>
      </div>

      {/* Conversaciones + Recordatorios */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Lista de conversaciones */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Conversaciones recientes</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {conversaciones.length} pacientes
              </p>
            </div>
            <button className="text-[12px] text-[#7C3AED] font-medium flex items-center gap-0.5 hover:underline">
              Ver todas <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {conversaciones.map((conv, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    conv.estado === "no_leido"
                      ? "bg-[#7C3AED]/10"
                      : "bg-gray-100"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      conv.estado === "no_leido" ? "text-[#7C3AED]" : "text-gray-500"
                    }`}
                  >
                    {conv.initials}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className={`text-[13px] font-medium truncate ${
                        conv.estado === "no_leido" ? "text-gray-900 font-semibold" : "text-gray-700"
                      }`}
                    >
                      {conv.paciente}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0">{conv.hora}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {estadoIcono[conv.estado as keyof typeof estadoIcono]}
                    <p className="text-[12px] text-gray-400 truncate">{conv.ultimoMensaje}</p>
                  </div>
                </div>

                {/* Badge cita */}
                {conv.citaPendiente && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-[#7C3AED] shrink-0">
                    {conv.citaPendiente}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-50">
            <button className="w-full h-8 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-[12px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <Send className="size-3.5" />
              Enviar recordatorios pendientes (3)
            </button>
          </div>
        </div>

        {/* Panel de recordatorios automáticos */}
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Recordatorios automáticos</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {activosCount} de {recordatorios.length} activos
              </p>
            </div>
            <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
              {activosCount > 0 ? (
                <Bell className="size-3.5 text-[#7C3AED]" />
              ) : (
                <BellOff className="size-3.5 text-gray-400" />
              )}
            </div>
          </div>

          <div className="flex-1 divide-y divide-gray-50">
            {recordatorios.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-5 py-4 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">{rec.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                    {rec.descripcion}
                  </p>
                </div>
                <Toggle activo={toggles[rec.id]} onChange={() => flipToggle(rec.id)} />
              </div>
            ))}
          </div>

          {/* Plantilla del mensaje */}
          <div className="p-4 border-t border-gray-50 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Plantilla activa
            </p>
            <div className="bg-[#f0fdf4] rounded-lg p-3 border border-emerald-100">
              <p className="text-[12px] text-gray-700 leading-relaxed">
                Hola <span className="font-semibold text-[#7C3AED]">{"{nombre}"}</span>, te
                recordamos tu cita en{" "}
                <span className="font-semibold text-[#7C3AED]">Clínica Bella</span> el{" "}
                <span className="font-semibold text-[#7C3AED]">{"{fecha}"}</span> a las{" "}
                <span className="font-semibold text-[#7C3AED]">{"{hora}"}</span>. ¿Confirmas
                asistencia?
              </p>
            </div>
            <button className="w-full h-7 text-[11px] font-medium text-[#7C3AED] hover:bg-violet-50 rounded-lg transition-colors">
              Editar plantilla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
