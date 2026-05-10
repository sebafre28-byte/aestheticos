"use client"

import { useState } from "react"
import {
  Building2,
  Bell,
  MessageCircle,
  Users,
  CreditCard,
  Shield,
  Check,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Smartphone,
  LogOut,
  Download,
  ChevronRight,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types & data ────────────────────────────────────────────────────────────

type SeccionId = "clinica" | "equipo" | "whatsapp" | "recordatorios" | "plan" | "seguridad"

const NAV: { id: SeccionId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
  { id: "clinica",       label: "Datos de la clínica",         icon: Building2 },
  { id: "equipo",        label: "Equipo y profesionales",       icon: Users,        badge: "3",           badgeColor: "bg-gray-100 text-gray-500" },
  { id: "whatsapp",      label: "WhatsApp Business",            icon: MessageCircle, badge: "Conectado",  badgeColor: "bg-emerald-50 text-[#10B981]" },
  { id: "recordatorios", label: "Recordatorios automáticos",    icon: Bell },
  { id: "plan",          label: "Plan y facturación",           icon: CreditCard,   badge: "Pro",         badgeColor: "bg-blue-50 text-[#2563EB]" },
  { id: "seguridad",     label: "Seguridad",                    icon: Shield },
]

const profesionales = [
  { id: "1", nombre: "Dra. Ana López",    initials: "AL", rol: "Médico estético",   horario: "Lun – Vie · 09:00–18:00", citas: 124, color: "bg-[#2563EB]/10 text-[#2563EB]" },
  { id: "2", nombre: "Est. Clara Torres", initials: "CT", rol: "Esteticista",       horario: "Lun – Sáb · 09:00–17:00", citas: 89,  color: "bg-emerald-50 text-[#10B981]" },
  { id: "3", nombre: "María González",   initials: "MG", rol: "Administradora",    horario: "Lun – Vie · 08:00–18:00", citas: 0,   color: "bg-amber-50 text-amber-600" },
]

const plantillas = [
  { id: "t1", nombre: "Recordatorio 24 h", texto: "Hola {nombre}, te recordamos tu cita en Clínica Bella el {fecha} a las {hora}. ¿Confirmas asistencia? Responde SI o NO." },
  { id: "t2", nombre: "Confirmación",      texto: "¡Tu cita del {fecha} a las {hora} está confirmada! Te esperamos en {direccion}. Si necesitas reagendar escríbenos." },
  { id: "t3", nombre: "Post-cita",         texto: "Hola {nombre}, ¿cómo te fue con tu tratamiento? Nos encantaría conocer tu opinión. Valoración: {link}" },
]

const recordatorioConfig = [
  { id: "r1", label: "Recordatorio 24 h antes",    descripcion: "Se envía el día anterior a la cita",        activo: true,  horasAntes: 24 },
  { id: "r2", label: "Recordatorio 2 h antes",     descripcion: "Aviso el mismo día, 2 horas antes",         activo: true,  horasAntes: 2 },
  { id: "r3", label: "Solicitar confirmación",     descripcion: "Pide confirmación 48 h antes",              activo: true,  horasAntes: 48 },
  { id: "r4", label: "Encuesta post-cita",         descripcion: "Se envía 1 hora después de la cita",        activo: false, horasAntes: -1 },
  { id: "r5", label: "Reagendamiento automático",  descripcion: "Ofrece nueva fecha si el paciente cancela", activo: false, horasAntes: 0 },
]

const facturas = [
  { id: "f1", fecha: "1 mayo, 2026",  monto: "$29.990", estado: "Pagada" },
  { id: "f2", fecha: "1 abril, 2026", monto: "$29.990", estado: "Pagada" },
  { id: "f3", fecha: "1 marzo, 2026", monto: "$29.990", estado: "Pagada" },
]

const sesiones = [
  { id: "s1", dispositivo: "MacBook Pro · Chrome",  ubicacion: "Santiago, Chile", fecha: "Ahora mismo",   esActual: true },
  { id: "s2", dispositivo: "iPhone 15 · Safari",    ubicacion: "Santiago, Chile", fecha: "Hace 2 horas",  esActual: false },
  { id: "s3", dispositivo: "Windows · Chrome",       ubicacion: "Providencia, CL", fecha: "Hace 3 días",  esActual: false },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${activo ? "bg-[#2563EB]" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${activo ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  )
}

function Field({ label, value, type = "text", placeholder }: { label: string; value: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        defaultValue={value}
        type={type}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors bg-white"
      />
    </div>
  )
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-[16px] font-semibold text-gray-900">{title}</h2>
        <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

function SeccionClinica() {
  return (
    <div>
      <SectionHeader title="Datos de la clínica" subtitle="Información pública que verán tus pacientes" />

      {/* Logo */}
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Logo</label>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}
          >
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <div>
            <button className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cambiar imagen
            </button>
            <p className="text-[11px] text-gray-400 mt-1">PNG o JPG · Máx 2 MB · Recomendado 256×256</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Nombre de la clínica" value="Clínica Bella" />
        <Field label="Email de contacto" value="admin@clinicabella.cl" type="email" />
        <Field label="Teléfono" value="+56 9 1234 5678" />
        <Field label="Sitio web" value="www.clinicabella.cl" />
      </div>

      <div className="mb-4">
        <Field label="Dirección" value="Av. Providencia 1234, Oficina 502, Santiago" />
      </div>

      {/* Horarios */}
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-gray-700 mb-3">Horarios de atención</label>
        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {[
            { dia: "Lunes – Viernes", apertura: "09:00", cierre: "18:00", abierto: true },
            { dia: "Sábado",           apertura: "09:00", cierre: "14:00", abierto: true },
            { dia: "Domingo",          apertura: "",       cierre: "",       abierto: false },
          ].map((h) => (
            <div key={h.dia} className="flex items-center gap-4 px-4 py-3 bg-white">
              <span className="text-[13px] font-medium text-gray-700 w-36 shrink-0">{h.dia}</span>
              {h.abierto ? (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="size-3.5 text-gray-400 shrink-0" />
                  <input defaultValue={h.apertura} className="w-20 h-7 px-2 rounded-md border border-gray-200 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
                  <span className="text-[12px] text-gray-400">–</span>
                  <input defaultValue={h.cierre} className="w-20 h-7 px-2 rounded-md border border-gray-200 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
                </div>
              ) : (
                <span className="text-[12px] text-gray-400 flex-1">Cerrado</span>
              )}
              <Toggle activo={h.abierto} onChange={() => {}} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-8 text-[13px] border-gray-200 text-gray-600">Descartar</Button>
        <Button className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

function SeccionEquipo() {
  return (
    <div>
      <SectionHeader
        title="Equipo y profesionales"
        subtitle="Administra el acceso y los horarios de tu equipo"
        action={
          <Button className="h-8 text-[13px] gap-1.5 border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
            <Plus className="size-3.5" /> Agregar
          </Button>
        }
      />

      <div className="space-y-3">
        {profesionales.map((p) => (
          <div key={p.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${p.color}`}>
              <span className="text-[12px] font-bold">{p.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">{p.nombre}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">{p.rol}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="size-3" /> {p.horario}
                </span>
                {p.citas > 0 && (
                  <span className="text-[11px] text-gray-400">{p.citas} citas realizadas</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select className="h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30">
                <option>Admin</option>
                <option>Profesional</option>
                <option>Solo lectura</option>
              </select>
              <button className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group">
                <Trash2 className="size-3.5 text-gray-300 group-hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[13px] font-medium text-[#2563EB]">Plan Pro · 3 / 5 profesionales</p>
        <p className="text-[12px] text-blue-500 mt-0.5">Puedes agregar 2 profesionales más en tu plan actual.</p>
        <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  )
}

function SeccionWhatsApp() {
  const [conectado, setConectado] = useState(true)
  const [editandoPlantilla, setEditandoPlantilla] = useState<string | null>(null)

  return (
    <div>
      <SectionHeader title="WhatsApp Business" subtitle="Gestiona la conexión y las plantillas de mensajes" />

      {/* Estado conexión */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${conectado ? "bg-[#25D366]/10" : "bg-gray-200"}`}>
            {conectado ? <Wifi className="size-5 text-[#25D366]" /> : <WifiOff className="size-5 text-gray-400" />}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-900">
              {conectado ? "+56 9 1234 5678" : "Sin número conectado"}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {conectado ? "Número de WhatsApp Business verificado" : "Conecta un número para enviar recordatorios"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conectado && (
              <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full">
                Conectado
              </span>
            )}
            <button
              onClick={() => setConectado((v) => !v)}
              className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${
                conectado
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-[#2563EB] text-[#2563EB] hover:bg-blue-50"
              }`}
            >
              {conectado ? "Desconectar" : "Conectar número"}
            </button>
          </div>
        </div>
      </div>

      {/* Plantillas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-gray-900">Plantillas de mensajes</p>
          <button className="text-[12px] text-[#2563EB] font-medium hover:underline flex items-center gap-0.5">
            <Plus className="size-3.5" /> Nueva plantilla
          </button>
        </div>
        <div className="space-y-3">
          {plantillas.map((pl) => (
            <div key={pl.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-gray-900">{pl.nombre}</p>
                <button
                  onClick={() => setEditandoPlantilla(editandoPlantilla === pl.id ? null : pl.id)}
                  className="text-[12px] text-[#2563EB] font-medium hover:underline"
                >
                  {editandoPlantilla === pl.id ? "Cancelar" : "Editar"}
                </button>
              </div>
              {editandoPlantilla === pl.id ? (
                <div>
                  <textarea
                    defaultValue={pl.texto}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-gray-400">Variables: {"{nombre}"} {"{fecha}"} {"{hora}"} {"{direccion}"} {"{link}"}</p>
                    <Button className="h-7 text-[12px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-gray-500 leading-relaxed">{pl.texto}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeccionRecordatorios() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(recordatorioConfig.map((r) => [r.id, r.activo]))
  )

  return (
    <div>
      <SectionHeader title="Recordatorios automáticos" subtitle="Configura cuándo y cómo se envían los mensajes automáticos" />

      <div className="space-y-3 mb-6">
        {recordatorioConfig.map((rec) => (
          <div key={rec.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-900">{rec.label}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">{rec.descripcion}</p>
              </div>
              <Toggle activo={toggles[rec.id]} onChange={() => setToggles((p) => ({ ...p, [rec.id]: !p[rec.id] }))} />
            </div>
            {toggles[rec.id] && rec.horasAntes > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                <label className="text-[12px] text-gray-500">Enviar</label>
                <select
                  defaultValue={rec.horasAntes}
                  className="h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={72}>72 horas</option>
                </select>
                <label className="text-[12px] text-gray-500">antes de la cita</label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          Guardar configuración
        </Button>
      </div>
    </div>
  )
}

function SeccionPlan() {
  return (
    <div>
      <SectionHeader title="Plan y facturación" subtitle="Gestiona tu suscripción y métodos de pago" />

      {/* Plan actual */}
      <div className="rounded-xl border-2 border-[#2563EB]/20 bg-gradient-to-br from-blue-50 to-white p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold bg-[#2563EB] text-white px-2 py-0.5 rounded-full">Plan Pro</span>
              <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="size-2.5" /> Activo
              </span>
            </div>
            <p className="text-[24px] font-bold text-gray-900 mt-2">$29.990 <span className="text-[14px] font-normal text-gray-500">/ mes</span></p>
            <p className="text-[12px] text-gray-500 mt-1">Próxima renovación: 1 de junio, 2026</p>
          </div>
          <button className="h-8 px-3 rounded-lg border border-[#2563EB]/30 text-[12px] font-medium text-[#2563EB] hover:bg-blue-50 transition-colors">
            Cambiar plan
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-blue-100">
          {[
            { label: "Profesionales", uso: "3 / 5" },
            { label: "Pacientes", uso: "142 / ∞" },
            { label: "Mensajes WhatsApp", uso: "312 / 500" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-[13px] font-semibold text-gray-900">{m.uso}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Método de pago */}
      <div className="mb-6">
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Método de pago</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-7 bg-white rounded-md border border-gray-200 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-blue-600">VISA</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-gray-900">•••• •••• •••• 4242</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Vence 12/2027</p>
          </div>
          <button className="text-[12px] font-medium text-[#2563EB] hover:underline shrink-0">Cambiar</button>
        </div>
      </div>

      {/* Historial */}
      <div>
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Historial de facturas</p>
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {facturas.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1">
                <p className="text-[13px] text-gray-900">{f.fecha}</p>
              </div>
              <p className="text-[13px] font-semibold text-gray-900">{f.monto}</p>
              <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full">{f.estado}</span>
              <button className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <Download className="size-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeccionSeguridad() {
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [dos_fa, setDos_fa] = useState(false)

  return (
    <div>
      <SectionHeader title="Seguridad" subtitle="Controla el acceso y la seguridad de tu cuenta" />

      {/* Cambiar contraseña */}
      <div className="mb-6">
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Contraseña</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
          <Field label="Contraseña actual" value="" type="password" placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nueva contraseña" value="" type="password" placeholder="Mínimo 8 caracteres" />
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  placeholder="Repetir contraseña"
                  className="w-full h-9 px-3 pr-9 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors bg-white"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
              Actualizar contraseña
            </Button>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div className="mb-6">
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Autenticación de dos factores</p>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${dos_fa ? "bg-[#2563EB]/10" : "bg-gray-200"}`}>
              <Smartphone className={`size-4 ${dos_fa ? "text-[#2563EB]" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Autenticación por app</p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {dos_fa
                  ? "Activo · Se requiere código al iniciar sesión"
                  : "Agrega una capa extra de seguridad a tu cuenta"}
              </p>
            </div>
          </div>
          <Toggle activo={dos_fa} onChange={() => setDos_fa((v) => !v)} />
        </div>
      </div>

      {/* Sesiones activas */}
      <div>
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Sesiones activas</p>
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {sesiones.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-4 py-3.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${s.esActual ? "bg-[#10B981]" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">{s.dispositivo}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{s.ubicacion} · {s.fecha}</p>
              </div>
              {s.esActual ? (
                <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full shrink-0">Sesión actual</span>
              ) : (
                <button className="h-7 px-2.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5 transition-colors group shrink-0">
                  <LogOut className="size-3.5 text-gray-300 group-hover:text-red-400" />
                  <span className="text-[12px] text-gray-400 group-hover:text-red-400">Cerrar</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const SECCIONES: Record<SeccionId, React.ReactNode> = {
  clinica:       <SeccionClinica />,
  equipo:        <SeccionEquipo />,
  whatsapp:      <SeccionWhatsApp />,
  recordatorios: <SeccionRecordatorios />,
  plan:          <SeccionPlan />,
  seguridad:     <SeccionSeguridad />,
}

export default function ConfiguracionPage() {
  const [activa, setActiva] = useState<SeccionId>("clinica")

  return (
    <div className="p-6 h-full flex flex-col gap-5 max-w-[1000px]">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-[18px] font-semibold text-gray-900">Configuración</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Administra tu clínica y preferencias del sistema</p>
      </div>

      {/* Clinic card compacta */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}
        >
          <span className="text-white text-base font-bold">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 leading-tight">Clínica Bella</p>
          <p className="text-[12px] text-gray-500 truncate">admin@clinicabella.cl · +56 9 1234 5678</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full">Plan Pro</span>
          <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="size-2.5" /> Activo
          </span>
        </div>
      </div>

      {/* Nav + Content */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Sidebar nav */}
        <nav className="w-[200px] shrink-0 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = activa === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiva(item.id)}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors text-left ${
                  isActive
                    ? "bg-blue-50 text-[#2563EB]"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon className={`size-[15px] shrink-0 ${isActive ? "text-[#2563EB]" : "text-gray-400"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          {/* Zona de peligro en nav */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <button className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="size-[15px] shrink-0" />
              Eliminar cuenta
            </button>
          </div>
        </nav>

        {/* Panel de contenido */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 overflow-auto">
          {SECCIONES[activa]}
        </div>
      </div>
    </div>
  )
}
