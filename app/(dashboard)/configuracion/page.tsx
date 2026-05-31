"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Building2, Bell, MessageCircle, Users, CreditCard, Shield,
  Check, Plus, Trash2, Wifi, WifiOff, Eye, EyeOff, Smartphone,
  LogOut, Download, Clock, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getClinicaBasica, actualizarClinicaBasica, getClinicaId } from "@/lib/onboarding/queries"
import { createClient } from "@/lib/supabase/client"
import type { ProfesionalRow } from "@/lib/agenda/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type SeccionId = "clinica" | "equipo" | "whatsapp" | "recordatorios" | "plan" | "seguridad"

const NAV: { id: SeccionId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
  { id: "clinica",       label: "Datos de la clínica",      icon: Building2 },
  { id: "equipo",        label: "Equipo y profesionales",    icon: Users },
  { id: "whatsapp",      label: "WhatsApp Business",         icon: MessageCircle },
  { id: "recordatorios", label: "Recordatorios",             icon: Bell },
  { id: "plan",          label: "Plan y facturación",        icon: CreditCard, badge: "Pro", badgeColor: "bg-blue-50 text-[#2563EB]" },
  { id: "seguridad",     label: "Seguridad",                 icon: Shield },
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

function FormField({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="h-9 text-[13px]"
      />
    </div>
  )
}

// ─── Sección Clínica ─────────────────────────────────────────────────────────

function SeccionClinica() {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [email, setEmail] = useState("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)

  useEffect(() => {
    getClinicaBasica().then((c) => {
      if (c) {
        setNombre(c.nombre ?? "")
        setTelefono(c.telefono ?? "")
        setDireccion(c.direccion ?? "")
        setEmail((c as typeof c & { email?: string }).email ?? "")
      }
      setCargando(false)
    })
  }, [])

  async function guardar(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    setFeedback(null)
    const result = await actualizarClinicaBasica({ nombre, telefono, direccion })
    setGuardando(false)
    if (result) {
      setFeedback({ tipo: "ok", msg: "Cambios guardados correctamente." })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar. Intenta nuevamente." })
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <form onSubmit={guardar}>
      <SectionHeader title="Datos de la clínica" subtitle="Información que verán tus pacientes" />

      <div className="mb-6">
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Logo</label>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}
          >
            <span className="text-white text-2xl font-bold">
              {nombre ? nombre[0].toUpperCase() : "C"}
            </span>
          </div>
          <div>
            <button type="button" className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cambiar imagen
            </button>
            <p className="text-[11px] text-gray-400 mt-1">PNG o JPG · Máx 2 MB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField label="Nombre de la clínica" value={nombre} onChange={setNombre} required placeholder="Ej: Clínica Bella" />
        <FormField label="Email de contacto" value={email} onChange={setEmail} type="email" placeholder="admin@tuclinica.cl" />
        <FormField label="Teléfono" value={telefono} onChange={setTelefono} placeholder="+56 9 1234 5678" />
      </div>
      <div className="mb-6">
        <FormField label="Dirección" value={direccion} onChange={setDireccion} placeholder="Av. Ejemplo 1234, Santiago" />
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-[13px] ${
          feedback.tipo === "ok"
            ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
            : "bg-red-50 border border-red-100 text-red-600"
        }`}>
          {feedback.tipo === "ok"
            ? <CheckCircle2 className="size-4 shrink-0" />
            : <AlertCircle className="size-4 shrink-0" />}
          {feedback.msg}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-8 text-[13px] border-gray-200 text-gray-600"
          onClick={() => { getClinicaBasica().then((c) => { if (c) { setNombre(c.nombre ?? ""); setTelefono(c.telefono ?? ""); setDireccion(c.direccion ?? "") } }) }}>
          Descartar
        </Button>
        <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}

// ─── Sección Equipo ───────────────────────────────────────────────────────────

const PROF_COLORS = [
  "bg-[#2563EB]/10 text-[#2563EB]",
  "bg-emerald-50 text-[#10B981]",
  "bg-amber-50 text-amber-600",
  "bg-purple-50 text-purple-600",
  "bg-pink-50 text-pink-600",
]

function SeccionEquipo() {
  const [profesionales, setProfesionales] = useState<ProfesionalRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("profesionales")
      .select("*")
      .order("nombre", { ascending: true })
    setProfesionales((data ?? []) as ProfesionalRow[])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function toggleActivo(prof: ProfesionalRow) {
    const supabase = createClient()
    await supabase.from("profesionales").update({ activo: !prof.activo }).eq("id", prof.id)
    cargar()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este profesional? Se perderán sus datos.")) return
    setEliminando(id)
    const supabase = createClient()
    await supabase.from("profesionales").delete().eq("id", id)
    await cargar()
    setEliminando(null)
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        title="Equipo y profesionales"
        subtitle="Administra los profesionales de tu clínica"
        action={
          <Button className="h-8 text-[13px] gap-1.5 border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
            <Plus className="size-3.5" /> Agregar
          </Button>
        }
      />

      {profesionales.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Users className="size-8 text-gray-300 mx-auto" />
          <p className="text-[14px] font-medium text-gray-600">Sin profesionales registrados</p>
          <p className="text-[12px] text-gray-400">Agrega el primer miembro del equipo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profesionales.map((p, i) => {
            const colorClass = PROF_COLORS[i % PROF_COLORS.length]
            const initials = p.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
            return (
              <div key={p.id} className={`bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4 ${!p.activo ? "opacity-60" : ""}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                  <span className="text-[12px] font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900">{p.nombre}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{p.especialidad ?? "Sin especialidad"}</p>
                  {p.telefono && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.telefono}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.activo ? "bg-emerald-50 text-[#10B981]" : "bg-gray-100 text-gray-500"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  <Toggle activo={p.activo} onChange={() => toggleActivo(p)} />
                  <button
                    onClick={() => eliminar(p.id)}
                    disabled={eliminando === p.id}
                    className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                  >
                    {eliminando === p.id
                      ? <Loader2 className="size-3.5 animate-spin text-gray-400" />
                      : <Trash2 className="size-3.5 text-gray-300 group-hover:text-red-400" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sección WhatsApp ─────────────────────────────────────────────────────────

function SeccionWhatsApp() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const twilioFrom = (process as any).env?.NEXT_PUBLIC_TWILIO_WHATSAPP_FROM as string | undefined
  const conectado = !!twilioFrom

  const plantillas = [
    { id: "t1", nombre: "Recordatorio 24 h", texto: "Hola {nombre}, te recordamos tu cita en {clinica} el {fecha} a las {hora}. Responde SI para confirmar o NO para cancelar." },
    { id: "t2", nombre: "Recordatorio 2 h",  texto: "Hola {nombre}, tu cita en {clinica} es en 2 horas, a las {hora}. ¡Te esperamos!" },
    { id: "t3", nombre: "Post-cita",         texto: "Hola {nombre}, gracias por visitarnos en {clinica}. ¿Cómo fue tu experiencia?" },
  ]
  const [editandoPlantilla, setEditandoPlantilla] = useState<string | null>(null)

  return (
    <div>
      <SectionHeader title="WhatsApp Business" subtitle="Conexión y plantillas de mensajes" />

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${conectado ? "bg-[#25D366]/10" : "bg-gray-200"}`}>
            {conectado ? <Wifi className="size-5 text-[#25D366]" /> : <WifiOff className="size-5 text-gray-400" />}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-900">
              {conectado ? twilioFrom : "Sin número conectado"}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {conectado
                ? "Número configurado vía Twilio Sandbox"
                : "Configura TWILIO_WHATSAPP_FROM en las variables de entorno"}
            </p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${conectado ? "bg-emerald-50 text-[#10B981]" : "bg-red-50 text-red-400"}`}>
            {conectado ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Plantillas de mensajes</p>
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
                    <p className="text-[11px] text-gray-400">Variables: {"{nombre}"} {"{fecha}"} {"{hora}"} {"{clinica}"}</p>
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

// ─── Sección Recordatorios ────────────────────────────────────────────────────

const recordatorioConfig = [
  { id: "r1", label: "Recordatorio 24 h antes",  descripcion: "Se envía el día anterior a la cita",  activo: true,  horasAntes: 24 },
  { id: "r2", label: "Recordatorio 2 h antes",   descripcion: "Aviso el mismo día, 2 horas antes",   activo: true,  horasAntes: 2 },
  { id: "r3", label: "Solicitar confirmación",   descripcion: "Pide SI/NO de confirmación",           activo: true,  horasAntes: 48 },
  { id: "r4", label: "Encuesta post-cita",        descripcion: "Se envía 1 hora después de la cita",  activo: false, horasAntes: -1 },
]

function SeccionRecordatorios() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(recordatorioConfig.map((r) => [r.id, r.activo]))
  )

  return (
    <div>
      <SectionHeader title="Recordatorios automáticos" subtitle="Configura cuándo se envían los mensajes automáticos" />
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
                  className="h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
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

// ─── Sección Plan ─────────────────────────────────────────────────────────────

function SeccionPlan() {
  const [plan, setPlan] = useState<string>("starter")
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    getClinicaId().then(async (id) => {
      if (!id) { setCargando(false); return }
      const supabase = createClient()
      const { data } = await supabase.from("clinicas").select("plan").eq("id", id).single()
      if (data?.plan) setPlan(data.plan as string)
      setCargando(false)
    })
  }, [])

  const planLabel = plan === "pro" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Starter"

  return (
    <div>
      <SectionHeader title="Plan y facturación" subtitle="Gestiona tu suscripción" />

      {cargando ? (
        <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <div className="rounded-xl border-2 border-[#2563EB]/20 bg-gradient-to-br from-blue-50 to-white p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold bg-[#2563EB] text-white px-2 py-0.5 rounded-full">Plan {planLabel}</span>
                <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="size-2.5" /> Activo
                </span>
              </div>
              <p className="text-[13px] text-gray-500 mt-2">Administra tu plan desde el panel de Vercel o contáctanos.</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-[13px] font-medium text-amber-700">Facturación disponible próximamente</p>
        <p className="text-[12px] text-amber-600 mt-0.5">Integración con WebPay y Stripe en camino.</p>
      </div>
    </div>
  )
}

// ─── Sección Seguridad ────────────────────────────────────────────────────────

function SeccionSeguridad() {
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)
  const [passwords, setPasswords] = useState({ actual: "", nueva: "", confirmar: "" })

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwords.nueva !== passwords.confirmar) {
      setFeedback({ tipo: "error", msg: "Las contraseñas no coinciden." })
      return
    }
    if (passwords.nueva.length < 8) {
      setFeedback({ tipo: "error", msg: "La contraseña debe tener al menos 8 caracteres." })
      return
    }
    setGuardando(true)
    setFeedback(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwords.nueva })
    setGuardando(false)
    if (error) {
      setFeedback({ tipo: "error", msg: error.message })
    } else {
      setFeedback({ tipo: "ok", msg: "Contraseña actualizada correctamente." })
      setPasswords({ actual: "", nueva: "", confirmar: "" })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div>
      <SectionHeader title="Seguridad" subtitle="Controla el acceso a tu cuenta" />

      <div className="mb-6">
        <p className="text-[13px] font-semibold text-gray-900 mb-3">Cambiar contraseña</p>
        <form onSubmit={cambiarPassword} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Nueva contraseña</Label>
            <Input
              type="password"
              value={passwords.nueva}
              onChange={(e) => setPasswords((p) => ({ ...p, nueva: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                type={mostrarPassword ? "text" : "password"}
                value={passwords.confirmar}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmar: e.target.value }))}
                placeholder="Repetir contraseña"
                className="h-9 text-[13px] pr-9"
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
          {feedback && (
            <div className={`flex items-center gap-2 p-2.5 rounded-lg text-[12px] ${
              feedback.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}>
              {feedback.tipo === "ok" ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              {feedback.msg}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
              {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-[13px] font-medium text-amber-700">2FA y gestión de sesiones — próximamente</p>
        <p className="text-[12px] text-amber-600 mt-0.5">Autenticación de dos factores en desarrollo.</p>
      </div>
    </div>
  )
}

// ─── Clínica Header Card ─────────────────────────────────────────────────────

function ClinicaHeaderCard() {
  const [clinica, setClinica] = useState<{ nombre: string; telefono: string | null; email?: string | null } | null>(null)

  useEffect(() => {
    getClinicaBasica().then((c) => setClinica(c))
  }, [])

  const nombre = clinica?.nombre ?? "Tu clínica"
  const inicial = nombre[0]?.toUpperCase() ?? "C"

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shrink-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}
      >
        <span className="text-white text-base font-bold">{inicial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-900 leading-tight">{nombre}</p>
        <p className="text-[12px] text-gray-500 truncate">
          {[clinica?.email, clinica?.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>
      <span className="text-[11px] font-medium bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full shrink-0">
        Plan Starter
      </span>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const [activa, setActiva] = useState<SeccionId>("clinica")

  const SECCIONES: Record<SeccionId, React.ReactNode> = {
    clinica:       <SeccionClinica />,
    equipo:        <SeccionEquipo />,
    whatsapp:      <SeccionWhatsApp />,
    recordatorios: <SeccionRecordatorios />,
    plan:          <SeccionPlan />,
    seguridad:     <SeccionSeguridad />,
  }

  return (
    <div className="p-6 h-full flex flex-col gap-5 max-w-[1000px]">
      <div className="shrink-0">
        <h1 className="text-[18px] font-semibold text-gray-900">Configuración</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Administra tu clínica y preferencias del sistema</p>
      </div>

      <ClinicaHeaderCard />

      <div className="flex gap-5 flex-1 min-h-0">
        <nav className="w-[200px] shrink-0 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = activa === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiva(item.id)}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors text-left ${
                  isActive ? "bg-blue-50 text-[#2563EB]" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
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
          <div className="pt-3 mt-3 border-t border-gray-100">
            <button className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="size-[15px] shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </nav>

        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 overflow-auto">
          {SECCIONES[activa]}
        </div>
      </div>
    </div>
  )
}
