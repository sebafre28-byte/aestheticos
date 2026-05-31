"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Building2, Bell, MessageCircle, Users, CreditCard, Shield,
  Check, Plus, Trash2, Wifi, WifiOff, Eye, EyeOff,
  LogOut, Loader2, AlertCircle, CheckCircle2, X, UserCog,
  ChevronDown, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getClinicaBasica, actualizarClinicaBasica, getClinicaConfig, actualizarClinicaConfig,
  crearProfesional, PLANTILLAS_DEFAULT, RECORDATORIOS_DEFAULT,
  type ClinicaBasica, type PlantillaWsp, type RecordatorioConfig,
  type HorarioDia, type HorariosConfig,
} from "@/lib/onboarding/queries"
import {
  getUsuariosClinica, invitarUsuario, actualizarRolUsuario, toggleActivoUsuario, eliminarUsuario,
  rolLabel, type UsuarioClinica, type RolUsuario,
} from "@/lib/usuarios/queries"
import { createClient } from "@/lib/supabase/client"
import type { ProfesionalRow } from "@/lib/agenda/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type SeccionId = "clinica" | "equipo" | "horarios" | "usuarios" | "whatsapp" | "recordatorios" | "plan" | "seguridad"

const NAV: { id: SeccionId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
  { id: "clinica",       label: "Datos de la clínica",   icon: Building2 },
  { id: "equipo",        label: "Equipo",                icon: Users },
  { id: "horarios",      label: "Horarios de atención",  icon: Clock },
  { id: "usuarios",      label: "Usuarios y roles",      icon: UserCog },
  { id: "whatsapp",      label: "WhatsApp Business",     icon: MessageCircle },
  { id: "recordatorios", label: "Recordatorios",         icon: Bell },
  { id: "plan",          label: "Plan y facturación",    icon: CreditCard, badge: "Pro", badgeColor: "bg-blue-50 text-[#2563EB]" },
  { id: "seguridad",     label: "Seguridad",             icon: Shield },
]

const COLORES_PROF = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#EF4444", "#0EA5E9", "#14B8A6"]

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

function FormField({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type}
        placeholder={placeholder} className="h-9 text-[13px]" />
    </div>
  )
}

function Feedback({ f }: { f: { tipo: "ok" | "error"; msg: string } | null }) {
  if (!f) return null
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-[13px] ${f.tipo === "ok" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-600"}`}>
      {f.tipo === "ok" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {f.msg}
    </div>
  )
}

// ─── Sección Clínica ─────────────────────────────────────────────────────────

function SeccionClinica() {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", direccion: "", sitio_web: "", logo_url: "" })
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getClinicaBasica().then((c) => {
      if (c) {
        setForm({
          nombre: c.nombre ?? "",
          email: c.email ?? "",
          telefono: c.telefono ?? "",
          direccion: c.direccion ?? "",
          sitio_web: c.sitio_web ?? "",
          logo_url: c.logo_url ?? "",
        })
        setClinicaId(c.id)
      }
      setCargando(false)
    })
  }, [])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !clinicaId) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ tipo: "error", msg: "La imagen no debe superar 2 MB." })
      return
    }
    setSubiendoLogo(true)
    setFeedback(null)
    const supabase = createClient()
    const path = `${clinicaId}/logo.jpg`
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setSubiendoLogo(false)
      if (uploadError.message?.toLowerCase().includes("bucket")) {
        setFeedback({ tipo: "error", msg: "Configura el bucket 'logos' en Supabase Storage." })
      } else {
        setFeedback({ tipo: "error", msg: `No se pudo subir el logo: ${uploadError.message}` })
      }
      return
    }
    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path)
    // Append cache-busting timestamp
    const urlConTimestamp = `${publicUrl}?t=${Date.now()}`
    setForm(p => ({ ...p, logo_url: urlConTimestamp }))
    // Persist immediately
    await supabase.from("clinicas").update({ logo_url: urlConTimestamp }).eq("id", clinicaId)
    setSubiendoLogo(false)
    setFeedback({ tipo: "ok", msg: "Logo actualizado correctamente." })
    setTimeout(() => setFeedback(null), 3000)
  }

  async function guardar(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setGuardando(true)
    setFeedback(null)
    const result = await actualizarClinicaBasica(form)
    setGuardando(false)
    if (result) {
      setFeedback({ tipo: "ok", msg: "Cambios guardados correctamente." })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar. Intenta nuevamente." })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <form onSubmit={guardar}>
      <SectionHeader title="Datos de la clínica" subtitle="Información que verán tus pacientes" />
      <div className="mb-6">
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}>
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{form.nombre ? form.nombre[0].toUpperCase() : "C"}</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              disabled={subiendoLogo}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {subiendoLogo ? <><Loader2 className="size-3 animate-spin" />Subiendo…</> : "Cambiar imagen"}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">PNG o JPG · Máx 2 MB</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField label="Nombre de la clínica" value={form.nombre} onChange={(v) => setForm(p => ({ ...p, nombre: v }))} required placeholder="Ej: Clínica Bella" />
        <FormField label="Email de contacto" value={form.email} onChange={(v) => setForm(p => ({ ...p, email: v }))} type="email" placeholder="admin@tuclinica.cl" />
        <FormField label="Teléfono" value={form.telefono} onChange={(v) => setForm(p => ({ ...p, telefono: v }))} placeholder="+56 9 1234 5678" />
        <FormField label="Sitio web" value={form.sitio_web} onChange={(v) => setForm(p => ({ ...p, sitio_web: v }))} placeholder="https://tuclinica.cl" />
      </div>
      <div className="mb-6">
        <FormField label="Dirección" value={form.direccion} onChange={(v) => setForm(p => ({ ...p, direccion: v }))} placeholder="Av. Ejemplo 1234, Santiago" />
      </div>
      <Feedback f={feedback} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-8 text-[13px] border-gray-200 text-gray-600"
          onClick={() => getClinicaBasica().then((c) => {
            if (c) setForm({ nombre: c.nombre ?? "", email: c.email ?? "", telefono: c.telefono ?? "", direccion: c.direccion ?? "", sitio_web: c.sitio_web ?? "", logo_url: c.logo_url ?? "" })
          })}>
          Descartar
        </Button>
        <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}

// ─── Modal agregar profesional ────────────────────────────────────────────────

function ModalAgregarProfesional({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({ nombre: "", especialidad: "", telefono: "", email: "", color: "#2563EB" })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError("El nombre es requerido."); return }
    setGuardando(true)
    setError(null)
    const result = await crearProfesional(form)
    setGuardando(false)
    if (result) {
      onCreado()
      onClose()
    } else {
      setError("No se pudo crear el profesional. Intenta nuevamente.")
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-gray-900">Agregar profesional</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="size-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Nombre <span className="text-red-400">*</span></Label>
              <Input ref={inputRef} value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Dra. Ana García" className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Especialidad</Label>
                <Input value={form.especialidad} onChange={(e) => setForm(p => ({ ...p, especialidad: e.target.value }))}
                  placeholder="Ej: Estética facial" className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+56 9 1234 5678" className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Email</Label>
              <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                type="email" placeholder="ana@tuclinica.cl" className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="mb-2 block text-[12px] font-medium text-gray-700">Color identificador</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORES_PROF.map((c) => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-[12px] text-red-600">
                <AlertCircle className="size-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9 text-[13px]">Cancelar</Button>
              <Button type="submit" disabled={guardando} className="flex-1 h-9 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Agregar profesional"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Sección Equipo ───────────────────────────────────────────────────────────

function SeccionEquipo() {
  const [profesionales, setProfesionales] = useState<ProfesionalRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [abrirModal, setAbrirModal] = useState(false)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("profesionales").select("*").order("nombre", { ascending: true })
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
    if (!confirm("¿Seguro que quieres eliminar este profesional?")) return
    setEliminando(id)
    const supabase = createClient()
    await supabase.from("profesionales").delete().eq("id", id)
    await cargar()
    setEliminando(null)
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <SectionHeader
        title="Equipo y profesionales"
        subtitle="Administra los profesionales de tu clínica"
        action={
          <Button onClick={() => setAbrirModal(true)} className="h-8 text-[13px] gap-1.5 border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
            <Plus className="size-3.5" /> Agregar
          </Button>
        }
      />

      {profesionales.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Users className="size-8 text-gray-300 mx-auto" />
          <p className="text-[14px] font-medium text-gray-600">Sin profesionales registrados</p>
          <button onClick={() => setAbrirModal(true)} className="text-[13px] text-[#2563EB] font-medium hover:underline">
            Agrega el primer miembro del equipo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profesionales.map((p) => {
            const initials = p.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
            return (
              <div key={p.id} className={`bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4 ${!p.activo ? "opacity-60" : ""}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-[12px] font-bold" style={{ backgroundColor: p.color }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900">{p.nombre}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{p.especialidad ?? "Sin especialidad"}</p>
                  {p.telefono && <p className="text-[11px] text-gray-400 mt-0.5">{p.telefono}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.activo ? "bg-emerald-50 text-[#10B981]" : "bg-gray-100 text-gray-500"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  <Toggle activo={p.activo} onChange={() => toggleActivo(p)} />
                  <button onClick={() => eliminar(p.id)} disabled={eliminando === p.id}
                    className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group">
                    {eliminando === p.id ? <Loader2 className="size-3.5 animate-spin text-gray-400" /> : <Trash2 className="size-3.5 text-gray-300 group-hover:text-red-400" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {abrirModal && <ModalAgregarProfesional onClose={() => setAbrirModal(false)} onCreado={cargar} />}
    </div>
  )
}

// ─── Sección WhatsApp ─────────────────────────────────────────────────────────

function SeccionWhatsApp() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const twilioFrom = (process as any).env?.NEXT_PUBLIC_TWILIO_WHATSAPP_FROM as string | undefined
  const conectado = !!twilioFrom

  const [plantillas, setPlantillas] = useState<PlantillaWsp[]>(PLANTILLAS_DEFAULT)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [textoEdit, setTextoEdit] = useState("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)

  useEffect(() => {
    getClinicaConfig().then((cfg) => {
      if (cfg.plantillas?.length) setPlantillas(cfg.plantillas)
      setCargando(false)
    })
  }, [])

  function iniciarEdicion(pl: PlantillaWsp) {
    setEditandoId(pl.id)
    setTextoEdit(pl.texto)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setTextoEdit("")
  }

  async function guardarPlantilla(id: string) {
    const nuevas = plantillas.map((p) => p.id === id ? { ...p, texto: textoEdit } : p)
    setGuardando(true)
    setFeedback(null)
    const cfg = await getClinicaConfig()
    const ok = await actualizarClinicaConfig({ ...cfg, plantillas: nuevas })
    setGuardando(false)
    if (ok) {
      setPlantillas(nuevas)
      setEditandoId(null)
      setFeedback({ tipo: "ok", msg: "Plantilla guardada." })
      setTimeout(() => setFeedback(null), 2500)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar." })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <SectionHeader title="WhatsApp Business" subtitle="Conexión y plantillas de mensajes" />

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${conectado ? "bg-[#25D366]/10" : "bg-gray-200"}`}>
            {conectado ? <Wifi className="size-5 text-[#25D366]" /> : <WifiOff className="size-5 text-gray-400" />}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-900">{conectado ? twilioFrom : "Sin número conectado"}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{conectado ? "Número configurado vía Twilio Sandbox" : "Configura TWILIO_WHATSAPP_FROM en las variables de entorno"}</p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${conectado ? "bg-emerald-50 text-[#10B981]" : "bg-red-50 text-red-400"}`}>
            {conectado ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </div>

      <Feedback f={feedback} />

      <p className="text-[13px] font-semibold text-gray-900 mb-3">Plantillas de mensajes</p>
      <div className="space-y-3">
        {plantillas.map((pl) => (
          <div key={pl.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-gray-900">{pl.nombre}</p>
              <button onClick={() => editandoId === pl.id ? cancelarEdicion() : iniciarEdicion(pl)}
                className="text-[12px] text-[#2563EB] font-medium hover:underline">
                {editandoId === pl.id ? "Cancelar" : "Editar"}
              </button>
            </div>
            {editandoId === pl.id ? (
              <div>
                <textarea value={textoEdit} onChange={(e) => setTextoEdit(e.target.value)} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-gray-400">Variables: {"{nombre}"} {"{fecha}"} {"{hora}"} {"{clinica}"}</p>
                  <Button onClick={() => guardarPlantilla(pl.id)} disabled={guardando}
                    className="h-7 text-[12px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                    {guardando ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
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
  )
}

// ─── Sección Recordatorios ────────────────────────────────────────────────────

const RECORDATORIO_LABELS: Record<string, { label: string; descripcion: string }> = {
  r1: { label: "Recordatorio 24 h antes", descripcion: "Se envía el día anterior a la cita" },
  r2: { label: "Recordatorio 2 h antes",  descripcion: "Aviso el mismo día, 2 horas antes" },
  r3: { label: "Solicitar confirmación",   descripcion: "Pide SI/NO de confirmación" },
  r4: { label: "Encuesta post-cita",       descripcion: "Se envía 1 hora después de la cita" },
}

function SeccionRecordatorios() {
  const [recordatorios, setRecordatorios] = useState<RecordatorioConfig[]>(RECORDATORIOS_DEFAULT)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)

  useEffect(() => {
    getClinicaConfig().then((cfg) => {
      if (cfg.recordatorios?.length) setRecordatorios(cfg.recordatorios)
      setCargando(false)
    })
  }, [])

  function toggleRec(id: string) {
    setRecordatorios((prev) => prev.map((r) => r.id === id ? { ...r, activo: !r.activo } : r))
  }

  function setHoras(id: string, horasAntes: number) {
    setRecordatorios((prev) => prev.map((r) => r.id === id ? { ...r, horasAntes } : r))
  }

  async function guardar() {
    setGuardando(true)
    setFeedback(null)
    const cfg = await getClinicaConfig()
    const ok = await actualizarClinicaConfig({ ...cfg, recordatorios })
    setGuardando(false)
    if (ok) {
      setFeedback({ tipo: "ok", msg: "Configuración guardada." })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar." })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <SectionHeader title="Recordatorios automáticos" subtitle="Configura cuándo se envían los mensajes automáticos" />
      <div className="space-y-3 mb-6">
        {recordatorios.map((rec) => {
          const meta = RECORDATORIO_LABELS[rec.id]
          return (
            <div key={rec.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-900">{meta?.label ?? rec.id}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{meta?.descripcion}</p>
                </div>
                <Toggle activo={rec.activo} onChange={() => toggleRec(rec.id)} />
              </div>
              {rec.activo && rec.horasAntes > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                  <label className="text-[12px] text-gray-500">Enviar</label>
                  <select value={rec.horasAntes} onChange={(e) => setHoras(rec.id, Number(e.target.value))}
                    className="h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none">
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={24}>24 horas</option>
                    <option value={48}>48 horas</option>
                  </select>
                  <label className="text-[12px] text-gray-500">antes de la cita</label>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Feedback f={feedback} />
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar configuración"}
        </Button>
      </div>
    </div>
  )
}

// ─── Sección Plan ─────────────────────────────────────────────────────────────

function SeccionPlan() {
  const [clinica, setClinica] = useState<ClinicaBasica | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => { getClinicaBasica().then((c) => { setClinica(c); setCargando(false) }) }, [])

  const planLabel = clinica?.plan === "pro" ? "Pro" : clinica?.plan === "enterprise" ? "Enterprise" : "Starter"

  return (
    <div>
      <SectionHeader title="Plan y facturación" subtitle="Gestiona tu suscripción" />
      {cargando ? (
        <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>
      ) : (
        <div className="rounded-xl border-2 border-[#2563EB]/20 bg-gradient-to-br from-blue-50 to-white p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold bg-[#2563EB] text-white px-2 py-0.5 rounded-full">Plan {planLabel}</span>
            <span className="text-[11px] font-medium bg-emerald-50 text-[#10B981] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="size-2.5" /> Activo
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-2">Administra tu plan desde el panel de Vercel o contáctanos.</p>
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
  const [passwords, setPasswords] = useState({ nueva: "", confirmar: "" })

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwords.nueva !== passwords.confirmar) { setFeedback({ tipo: "error", msg: "Las contraseñas no coinciden." }); return }
    if (passwords.nueva.length < 8) { setFeedback({ tipo: "error", msg: "La contraseña debe tener al menos 8 caracteres." }); return }
    setGuardando(true)
    setFeedback(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwords.nueva })
    setGuardando(false)
    if (error) {
      setFeedback({ tipo: "error", msg: error.message })
    } else {
      setFeedback({ tipo: "ok", msg: "Contraseña actualizada correctamente." })
      setPasswords({ nueva: "", confirmar: "" })
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
            <Input type="password" value={passwords.nueva} onChange={(e) => setPasswords((p) => ({ ...p, nueva: e.target.value }))}
              placeholder="Mínimo 8 caracteres" className="h-9 text-[13px]" />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Confirmar contraseña</Label>
            <div className="relative">
              <Input type={mostrarPassword ? "text" : "password"} value={passwords.confirmar}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmar: e.target.value }))}
                placeholder="Repetir contraseña" className="h-9 text-[13px] pr-9" />
              <button type="button" onClick={() => setMostrarPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Feedback f={feedback} />
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

// ─── Sección Usuarios y Roles ─────────────────────────────────────────────────

const ROL_COLORS: Record<RolUsuario, string> = {
  admin: "bg-blue-50 text-[#2563EB]",
  profesional: "bg-purple-50 text-purple-700",
  recepcionista: "bg-amber-50 text-amber-700",
}

function ModalInvitarUsuario({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [form, setForm] = useState({ nombre: "", email: "", rol: "recepcionista" as RolUsuario })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError("El nombre es requerido."); return }
    if (!form.email.trim()) { setError("El email es requerido."); return }
    setGuardando(true)
    setError(null)
    const result = await invitarUsuario(form)
    setGuardando(false)
    if (result.ok) { onCreado(); onClose() }
    else setError(result.error ?? "No se pudo agregar el usuario.")
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-gray-900">Agregar usuario</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="size-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Nombre <span className="text-red-400">*</span></Label>
              <Input ref={inputRef} value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Ana García" className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Email <span className="text-red-400">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@tuclinica.cl" className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Rol</Label>
              <div className="relative">
                <select value={form.rol} onChange={(e) => setForm(p => ({ ...p, rol: e.target.value as RolUsuario }))}
                  className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 pr-8 text-[13px] text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]">
                  <option value="admin">Administrador — acceso total</option>
                  <option value="profesional">Profesional — agenda y pacientes</option>
                  <option value="recepcionista">Recepcionista — agenda y cobros</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[12px]">
                <AlertCircle className="size-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="h-8 text-[13px] border-gray-200 text-gray-600">Cancelar</Button>
              <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Agregar usuario"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function SeccionUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioClinica[]>([])
  const [cargando, setCargando] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<UsuarioClinica | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)

  const cargar = useCallback(() => {
    setCargando(true)
    getUsuariosClinica().then((data) => { setUsuarios(data); setCargando(false) })
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleCambiarRol(u: UsuarioClinica, rol: RolUsuario) {
    setProcesando(u.id)
    await actualizarRolUsuario(u.id, rol)
    await cargar()
    setProcesando(null)
  }

  async function handleToggleActivo(u: UsuarioClinica) {
    setProcesando(u.id)
    await toggleActivoUsuario(u.id, !u.activo)
    await cargar()
    setProcesando(null)
  }

  async function handleEliminar() {
    if (!confirmEliminar) return
    setProcesando(confirmEliminar.id)
    await eliminarUsuario(confirmEliminar.id)
    setConfirmEliminar(null)
    await cargar()
    setProcesando(null)
  }

  return (
    <div>
      <SectionHeader
        title="Usuarios y roles"
        subtitle="Controla quién accede y con qué permisos"
        action={
          <button onClick={() => setShowModal(true)}
            className="h-8 px-3 rounded-lg text-[12px] font-semibold text-white flex items-center gap-1.5 transition-colors"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
            <Plus className="size-3.5" /> Agregar usuario
          </button>
        }
      />

      {cargando ? (
        <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : usuarios.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-6 text-center">No hay usuarios configurados.</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${u.activo ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                style={{ background: u.activo ? "linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)" : "#94A3B8" }}>
                {u.nombre[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{u.nombre}</p>
                <p className="text-[11px] text-gray-400 truncate">{u.email ?? "Sin email"}</p>
              </div>
              <div className="shrink-0">
                <div className="relative">
                  <select
                    value={u.rol}
                    disabled={procesando === u.id}
                    onChange={(e) => handleCambiarRol(u, e.target.value as RolUsuario)}
                    className={`h-7 rounded-full text-[11px] font-medium px-2.5 pr-6 border-0 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer ${ROL_COLORS[u.rol]}`}>
                    <option value="admin">Administrador</option>
                    <option value="profesional">Profesional</option>
                    <option value="recepcionista">Recepcionista</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none opacity-60" />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggleActivo(u)} disabled={procesando === u.id}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${u.activo ? "text-gray-500 hover:bg-gray-200" : "text-emerald-600 hover:bg-emerald-50"}`}>
                  {u.activo ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => setConfirmEliminar(u)} disabled={procesando === u.id}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-[12px] font-medium text-blue-700">Sobre los roles</p>
        <ul className="text-[11px] text-blue-600 mt-1 space-y-0.5">
          <li>• <strong>Administrador</strong>: acceso total, configuración, reportes</li>
          <li>• <strong>Profesional</strong>: agenda propia, pacientes, sin configuración</li>
          <li>• <strong>Recepcionista</strong>: agenda completa, cobros, sin configuración</li>
        </ul>
      </div>

      {showModal && <ModalInvitarUsuario onClose={() => setShowModal(false)} onCreado={cargar} />}

      {confirmEliminar && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmEliminar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2">¿Eliminar usuario?</h3>
              <p className="text-[13px] text-gray-500 mb-5">
                Se eliminará a <strong>{confirmEliminar.nombre}</strong> de la clínica. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmEliminar(null)} className="h-8 text-[13px] border-gray-200">Cancelar</Button>
                <Button onClick={handleEliminar} className="h-8 text-[13px] border-0 bg-red-500 hover:bg-red-600 text-white">Eliminar</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sección Horarios ────────────────────────────────────────────────────────

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const HORARIOS_DEFAULT: HorariosConfig = {
  lunes:     { activo: true,  desde: '09:00', hasta: '18:00' },
  martes:    { activo: true,  desde: '09:00', hasta: '18:00' },
  miércoles: { activo: true,  desde: '09:00', hasta: '18:00' },
  jueves:    { activo: true,  desde: '09:00', hasta: '18:00' },
  viernes:   { activo: true,  desde: '09:00', hasta: '18:00' },
  sábado:    { activo: true,  desde: '09:00', hasta: '14:00' },
  domingo:   { activo: false, desde: '09:00', hasta: '18:00' },
}

function SeccionHorarios() {
  const [horarios, setHorarios] = useState<HorariosConfig>(HORARIOS_DEFAULT)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)

  useEffect(() => {
    getClinicaConfig().then((cfg) => {
      if (cfg.horarios && Object.keys(cfg.horarios).length > 0) setHorarios(cfg.horarios)
      setCargando(false)
    })
  }, [])

  function toggleDia(dia: string) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }))
  }

  function setHora(dia: string, campo: 'desde' | 'hasta', valor: string) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
  }

  async function guardar() {
    setGuardando(true)
    setFeedback(null)
    const cfg = await getClinicaConfig()
    const ok = await actualizarClinicaConfig({ ...cfg, horarios })
    setGuardando(false)
    if (ok) {
      setFeedback({ tipo: "ok", msg: "Horarios guardados correctamente." })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar. Intenta nuevamente." })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <SectionHeader title="Horarios de atención" subtitle="Define los días y horarios en que atiendes pacientes" />
      <div className="space-y-2 mb-6">
        {DIAS.map((dia) => {
          const h = horarios[dia] ?? { activo: false, desde: '09:00', hasta: '18:00' }
          return (
            <div key={dia} className={`bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-4 transition-opacity ${!h.activo ? "opacity-60" : ""}`}>
              <Toggle activo={h.activo} onChange={() => toggleDia(dia)} />
              <span className="w-24 text-[13px] font-medium text-gray-800 capitalize shrink-0">{dia}</span>
              {h.activo ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={h.desde}
                    onChange={(e) => setHora(dia, 'desde', e.target.value)}
                    className="h-8 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                  <span className="text-[12px] text-gray-400">–</span>
                  <input
                    type="time"
                    value={h.hasta}
                    onChange={(e) => setHora(dia, 'hasta', e.target.value)}
                    className="h-8 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
              ) : (
                <span className="text-[12px] text-gray-400 flex-1">Cerrado</span>
              )}
            </div>
          )
        })}
      </div>
      <Feedback f={feedback} />
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar horarios"}
        </Button>
      </div>
    </div>
  )
}

// ─── Header card ─────────────────────────────────────────────────────────────

function ClinicaHeaderCard() {
  const [clinica, setClinica] = useState<ClinicaBasica | null>(null)

  useEffect(() => { getClinicaBasica().then(setClinica) }, [])

  const nombre = clinica?.nombre ?? "Tu clínica"
  const planLabel = clinica?.plan === "pro" ? "Pro" : clinica?.plan === "enterprise" ? "Enterprise" : "Starter"

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shrink-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}>
        {clinica?.logo_url ? (
          <Image src={clinica.logo_url} width={40} height={40} className="w-10 h-10 rounded-xl object-cover" alt="logo" />
        ) : (
          <span className="text-white text-base font-bold">{nombre[0]?.toUpperCase() ?? "C"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-900 leading-tight">{nombre}</p>
        <p className="text-[12px] text-gray-500 truncate">
          {[clinica?.email, clinica?.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>
      <span className="text-[11px] font-medium bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full shrink-0">
        Plan {planLabel}
      </span>
    </div>
  )
}

// ─── Cerrar sesión ────────────────────────────────────────────────────────────

function BtnCerrarSesion() {
  async function cerrar() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }
  return (
    <button onClick={cerrar} className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
      <LogOut className="size-[15px] shrink-0" /> Cerrar sesión
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const [activa, setActiva] = useState<SeccionId>("clinica")

  const SECCIONES: Record<SeccionId, React.ReactNode> = {
    clinica:       <SeccionClinica />,
    equipo:        <SeccionEquipo />,
    horarios:      <SeccionHorarios />,
    usuarios:      <SeccionUsuarios />,
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
              <button key={item.id} onClick={() => setActiva(item.id)}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors text-left ${isActive ? "bg-blue-50 text-[#2563EB]" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
                <Icon className={`size-[15px] shrink-0 ${isActive ? "text-[#2563EB]" : "text-gray-400"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}>{item.badge}</span>
                )}
              </button>
            )
          })}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <BtnCerrarSesion />
          </div>
        </nav>

        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 overflow-auto">
          {SECCIONES[activa]}
        </div>
      </div>
    </div>
  )
}
