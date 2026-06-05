"use client"

import { PlanGate } from '@/components/subscriptions/PlanGate'
import { TrialFeatureBanner } from '@/components/subscriptions/TrialFeatureBanner'
import { useState, useEffect, useCallback } from "react"
import {
  MessageCircle, CheckCheck, Check, Clock, Send, Bell, BellOff,
  Wifi, WifiOff, ChevronRight, Loader2, AlertCircle, RefreshCw,
} from "lucide-react"
import {
  getConversaciones,
  getWhatsappStats,
  tipoMensajeLabel,
  horaRelativa,
  type ConversacionResumen,
  type WhatsappStats,
} from "@/lib/whatsapp/queries"

const estadoIcono = {
  enviado:    <Check className="size-3.5 text-gray-300" />,
  respondido: <CheckCheck className="size-3.5 text-blue-400" />,
  fallido:    <AlertCircle className="size-3.5 text-red-400" />,
}

const recordatorios = [
  { id: "r1", label: "Recordatorio 24 h antes",  descripcion: "Mensaje automático el día anterior a la cita", defaultActivo: true },
  { id: "r2", label: "Recordatorio 2 h antes",   descripcion: "Aviso el mismo día, 2 horas antes",            defaultActivo: true },
  { id: "r3", label: "Confirmación de cita",      descripcion: "Solicita confirmación 48 h antes",             defaultActivo: true },
  { id: "r4", label: "Post-cita: feedback",       descripcion: "Encuesta de satisfacción al finalizar",        defaultActivo: false },
]

function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        activo ? "bg-[#2563EB]" : "bg-gray-200"
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

function iniciales(nombre: string | null, telefono: string): string {
  if (nombre) {
    const partes = nombre.trim().split(" ")
    return partes.length >= 2
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : nombre.slice(0, 2).toUpperCase()
  }
  return telefono.slice(-2)
}

export default function WhatsAppPage() {
  const [conectado] = useState(!!process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_FROM)
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(recordatorios.map((r) => [r.id, r.defaultActivo]))
  )
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([])
  const [stats, setStats] = useState<WhatsappStats | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [convs, st] = await Promise.all([getConversaciones(), getWhatsappStats()])
      setConversaciones(convs)
      setStats(st)
    } catch {
      setError("No se pudo cargar la información de WhatsApp.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function flipToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const activosCount = Object.values(toggles).filter(Boolean).length
  const twilioFrom = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_FROM ?? null

  return (
    <PlanGate feature="whatsapp">
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <TrialFeatureBanner feature="whatsapp" />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">WhatsApp Business</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Gestión de mensajes y recordatorios automáticos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            disabled={cargando}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`size-3.5 text-gray-500 ${cargando ? "animate-spin" : ""}`} />
          </button>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold ${
              conectado
                ? "bg-emerald-50 border-emerald-100 text-[#10B981]"
                : "bg-red-50 border-red-100 text-red-500"
            }`}
          >
            {conectado ? (
              <>
                <Wifi className="size-3.5" />
                {twilioFrom ?? "WhatsApp conectado"}
              </>
            ) : (
              <>
                <WifiOff className="size-3.5" />
                Desconectado
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Estadísticas */}
      {cargando && !stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Send className="size-4 text-[#25D366]" />}
            iconBg="bg-[#25D366]/10"
            valor={stats?.enviados_hoy ?? 0}
            label="Mensajes enviados hoy"
          />
          <StatCard
            icon={<CheckCheck className="size-4 text-[#2563EB]" />}
            iconBg="bg-blue-50"
            valor={`${stats?.tasa_confirmacion ?? 0}%`}
            label="Tasa de respuesta (7 días)"
          />
          <StatCard
            icon={<Clock className="size-4 text-amber-600" />}
            iconBg="bg-amber-50"
            valor={stats?.sin_respuesta ?? 0}
            label="Sin respuesta esta semana"
          />
          <StatCard
            icon={<MessageCircle className="size-4 text-sky-600" />}
            iconBg="bg-sky-50"
            valor={stats?.conversaciones_activas ?? 0}
            label="Contactos activos (7 días)"
          />
        </div>
      )}

      {/* Conversaciones + Recordatorios */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Lista de conversaciones */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Conversaciones recientes</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {cargando ? "Cargando..." : `${conversaciones.length} contactos últimos 30 días`}
              </p>
            </div>
            <button className="text-[12px] text-[#2563EB] font-medium flex items-center gap-0.5 hover:underline">
              Ver todas <ChevronRight className="size-3.5" />
            </button>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[13px] text-gray-400">
              <Loader2 className="size-4 animate-spin" />
              Cargando conversaciones…
            </div>
          ) : conversaciones.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageCircle className="size-8 text-gray-300 mx-auto" />
              <p className="text-[14px] font-medium text-gray-600">Sin mensajes enviados aún</p>
              <p className="text-[12px] text-gray-400">
                Los recordatorios automáticos aparecerán aquí cuando se envíen.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversaciones.slice(0, 10).map((conv, i) => {
                const initials = iniciales(conv.paciente_nombre, conv.telefono)
                const estadoKey = conv.ultimo_mensaje_estado as keyof typeof estadoIcono
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      !conv.respondio ? "bg-[#2563EB]/10" : "bg-gray-100"
                    }`}>
                      <span className={`text-[11px] font-bold ${!conv.respondio ? "text-[#2563EB]" : "text-gray-500"}`}>
                        {initials}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[13px] font-medium truncate ${!conv.respondio ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                          {conv.paciente_nombre ?? conv.telefono}
                        </span>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {horaRelativa(conv.ultimo_mensaje_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {estadoIcono[estadoKey] ?? estadoIcono.enviado}
                        <p className="text-[12px] text-gray-400 truncate">
                          {tipoMensajeLabel(conv.ultimo_mensaje_tipo)}
                          {conv.respondio && " · Respondió"}
                        </p>
                      </div>
                    </div>

                    {conv.cita_id && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] shrink-0">
                        Con cita
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              {activosCount > 0 ? (
                <Bell className="size-3.5 text-[#2563EB]" />
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
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{rec.descripcion}</p>
                </div>
                <Toggle activo={toggles[rec.id]} onChange={() => flipToggle(rec.id)} />
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-50 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Plantilla activa
            </p>
            <div className="bg-[#f0fdf4] rounded-lg p-3 border border-emerald-100">
              <p className="text-[12px] text-gray-700 leading-relaxed">
                Hola <span className="font-semibold text-[#2563EB]">{"{nombre}"}</span>, te
                recordamos tu cita el{" "}
                <span className="font-semibold text-[#2563EB]">{"{fecha}"}</span> a las{" "}
                <span className="font-semibold text-[#2563EB]">{"{hora}"}</span>. Responde{" "}
                <span className="font-semibold">SI</span> para confirmar o{" "}
                <span className="font-semibold">NO</span> para cancelar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PlanGate>
  )
}

function StatCard({
  icon, iconBg, valor, label,
}: {
  icon: React.ReactNode
  iconBg: string
  valor: string | number
  label: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[24px] font-bold text-gray-900 leading-none">{valor}</p>
      <p className="text-[12px] text-gray-500 mt-1.5">{label}</p>
    </div>
  )
}
