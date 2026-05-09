import {
  Calendar,
  MessageCircle,
  TrendingDown,
  DollarSign,
  ChevronRight,
} from "lucide-react"

const metricas = [
  {
    label: "Citas hoy",
    valor: "12",
    cambio: "+2 vs ayer",
    positivo: true,
    icon: Calendar,
    colorFondo: "bg-violet-50",
    colorIcono: "text-[#7C3AED]",
  },
  {
    label: "Recordatorios WhatsApp",
    valor: "8",
    cambio: "enviados hoy",
    positivo: true,
    icon: MessageCircle,
    colorFondo: "bg-emerald-50",
    colorIcono: "text-[#10B981]",
  },
  {
    label: "No-shows evitados",
    valor: "3",
    cambio: "este mes",
    positivo: true,
    icon: TrendingDown,
    colorFondo: "bg-sky-50",
    colorIcono: "text-sky-600",
  },
  {
    label: "Ingresos del mes",
    valor: "$1.240.000",
    cambio: "+18% vs mes anterior",
    positivo: true,
    icon: DollarSign,
    colorFondo: "bg-amber-50",
    colorIcono: "text-amber-600",
  },
]

const citasHoy = [
  {
    hora: "09:00",
    paciente: "Ana García",
    servicio: "Botox Premium",
    profesional: "Dra. López",
    estado: "confirmada",
    initials: "AG",
  },
  {
    hora: "10:30",
    paciente: "Sofía Mendoza",
    servicio: "Limpieza Facial",
    profesional: "Est. Torres",
    estado: "confirmada",
    initials: "SM",
  },
  {
    hora: "11:00",
    paciente: "Carmen Ruiz",
    servicio: "Ácido Hialurónico",
    profesional: "Dra. López",
    estado: "pendiente",
    initials: "CR",
  },
  {
    hora: "14:00",
    paciente: "Valentina Soto",
    servicio: "Peeling Químico",
    profesional: "Est. Torres",
    estado: "confirmada",
    initials: "VS",
  },
  {
    hora: "15:30",
    paciente: "Isabel Morales",
    servicio: "Microdermoabrasión",
    profesional: "Dra. López",
    estado: "pendiente",
    initials: "IM",
  },
]

const mensajes = [
  {
    paciente: "Ana García",
    texto: "Recordatorio: cita mañana a las 09:00 ✓",
    estado: "leido",
    hora: "hace 2 h",
    initials: "AG",
  },
  {
    paciente: "Sofía Mendoza",
    texto: "Confirma tu cita de hoy a las 10:30",
    estado: "entregado",
    hora: "hace 3 h",
    initials: "SM",
  },
  {
    paciente: "Pedro Castro",
    texto: "Tu cita fue cancelada. Reagenda aquí 🔗",
    estado: "enviado",
    hora: "hace 5 h",
    initials: "PC",
  },
  {
    paciente: "Carmen Ruiz",
    texto: "¡Tu cita del jueves está confirmada!",
    estado: "pendiente",
    hora: "hace 1 h",
    initials: "CR",
  },
]

const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
  leido: { bg: "bg-blue-50", text: "text-blue-600", label: "Leído" },
  entregado: { bg: "bg-emerald-50", text: "text-[#10B981]", label: "Entregado" },
  enviado: { bg: "bg-gray-100", text: "text-gray-500", label: "Enviado" },
  pendiente: { bg: "bg-amber-50", text: "text-amber-600", label: "Pendiente" },
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-semibold text-gray-900">Dashboard</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Viernes, 9 de mayo de 2026</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4">
        {metricas.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="mb-3">
                <div className={`w-8 h-8 ${m.colorFondo} rounded-lg flex items-center justify-center`}>
                  <Icon className={`size-4 ${m.colorIcono}`} />
                </div>
              </div>
              <p className="text-[24px] font-bold text-gray-900 leading-none">{m.valor}</p>
              <p className="text-[12px] text-gray-500 mt-1.5">{m.label}</p>
              <p className={`text-[11px] mt-1 font-medium ${m.positivo ? "text-[#10B981]" : "text-red-500"}`}>
                {m.cambio}
              </p>
            </div>
          )
        })}
      </div>

      {/* Agenda + WhatsApp */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Agenda del día */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Agenda del día</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">12 citas programadas</p>
            </div>
            <a
              href="/agenda"
              className="text-[12px] text-[#7C3AED] font-medium flex items-center gap-0.5 hover:underline"
            >
              Ver completa <ChevronRight className="size-3.5" />
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {citasHoy.map((cita, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
              >
                <span className="text-[12px] font-semibold text-gray-600 w-10 shrink-0">
                  {cita.hora}
                </span>
                <div className="w-7 h-7 bg-[#7C3AED]/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-[#7C3AED]">{cita.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">{cita.paciente}</p>
                  <p className="text-[12px] text-gray-400 truncate">
                    {cita.servicio} · {cita.profesional}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    cita.estado === "confirmada"
                      ? "bg-emerald-50 text-[#10B981]"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {cita.estado === "confirmada" ? "Confirmada" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel WhatsApp */}
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center">
                <MessageCircle className="size-3 text-white" />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-900">WhatsApp</h2>
            </div>
            <span className="text-[11px] bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full font-medium">
              8 enviados
            </span>
          </div>

          <div className="flex-1 divide-y divide-gray-50">
            {mensajes.map((msg, i) => {
              const badge = estadoBadge[msg.estado]
              return (
                <div key={i} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-gray-500">{msg.initials}</span>
                    </div>
                    <span className="text-[13px] font-medium text-gray-900 flex-1 truncate">
                      {msg.paciente}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0">{msg.hora}</span>
                  </div>
                  <p className="text-[12px] text-gray-500 truncate pl-7">{msg.texto}</p>
                  <div className="pl-7 mt-1">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 border-t border-gray-50">
            <button className="w-full h-8 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-[12px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <MessageCircle className="size-3.5" />
              Enviar recordatorios pendientes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
