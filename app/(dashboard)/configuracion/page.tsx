"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Building2, Bell, MessageCircle, Users, CreditCard, Shield,
  Check, Plus, Trash2, Wifi, WifiOff, Eye, EyeOff,
  LogOut, Loader2, AlertCircle, CheckCircle2, X, UserCog,
  ChevronDown, Clock, Link2, ExternalLink, Copy, CalendarDays, Pencil,
} from "lucide-react"
import PlanesCard from "@/components/subscriptions/PlanesCard"
import { useSubscripcion } from "@/lib/subscriptions/useSubscripcion"
import { useAcceso } from "@/components/auth/RolGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getClinicaBasica, actualizarClinicaBasica, getClinicaConfig, actualizarClinicaConfig,
  crearProfesional, PLANTILLAS_DEFAULT, RECORDATORIOS_DEFAULT, TEMPLATE_RECORDATORIO_DEFAULT,
  type ClinicaBasica, type PlantillaWsp, type RecordatorioConfig, type RecordatoriosWspConfig,
  type HorarioDia, type HorariosConfig,
} from "@/lib/onboarding/queries"
import {
  getUsuariosClinica, invitarUsuario, actualizarRolUsuario, toggleActivoUsuario, eliminarUsuario,
  rolLabel, type UsuarioClinica, type RolUsuario,
} from "@/lib/usuarios/queries"
import { createClient } from "@/lib/supabase/client"
import {
  getProfesionales, getDisponibilidadProfesional, setDisponibilidadProfesional,
  type ProfesionalRow, type DisponibilidadRow,
} from "@/lib/agenda/queries"

// ─── Types ────────────────────────────────────────────────────────────────────

type SeccionId = "clinica" | "equipo" | "horarios" | "disponibilidad" | "usuarios" | "whatsapp" | "recordatorios" | "plan" | "seguridad"

const NAV: { id: SeccionId; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
  { id: "clinica",       label: "Datos de la clínica",   icon: Building2 },
  { id: "equipo",        label: "Equipo",                icon: Users },
  { id: "horarios",       label: "Horarios de atención",  icon: Clock },
  { id: "disponibilidad", label: "Disponibilidad",        icon: CalendarDays },
  { id: "usuarios",       label: "Usuarios y roles",      icon: UserCog },
  { id: "whatsapp",      label: "WhatsApp Business",     icon: MessageCircle },
  { id: "recordatorios", label: "Recordatorios",         icon: Bell },
  { id: "plan",          label: "Plan y facturación",    icon: CreditCard, badge: "Pro", badgeColor: "bg-blue-50 text-[#2563EB]" },
  { id: "seguridad",     label: "Seguridad",             icon: Shield },
]

const COLORES_PROF = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#EF4444", "#0EA5E9", "#14B8A6"]

// ─── Shared helpers ───────────────────────────────────────────────────────────

const MEDIAS_CONFIG = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2 pr-6 text-[12px] font-medium text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      {MEDIAS_CONFIG.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  )
}

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
  const [slug, setSlug] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
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
        setSlug(c.slug ?? null)
      }
      setCargando(false)
    })
  }, [])

  function getBookingUrl(): string {
    if (typeof window === "undefined" || !slug) return ""
    return `${window.location.origin}/book/${slug}`
  }

  async function copiarLink() {
    const url = getBookingUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

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
    console.log('[logo] subiendo a:', path, 'bucket: logos')
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      console.error('[logo] error upload:', uploadError)
      setSubiendoLogo(false)
      setFeedback({ tipo: "error", msg: `Error al subir logo: ${uploadError.message}` })
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
    window.dispatchEvent(new CustomEvent('clinica-updated'))
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
      window.dispatchEvent(new CustomEvent('clinica-updated'))
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
      {slug && (
        <div className="mb-6 p-4 rounded-xl border border-blue-100 bg-blue-50/40">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="size-4 text-[#2563EB]" />
            <p className="text-[13px] font-semibold text-[#2563EB]">Tu link de reservas</p>
          </div>
          <p className="text-[12px] text-gray-500 truncate mb-3">{getBookingUrl()}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiarLink}
              className="h-7 px-3 rounded-lg border border-blue-200 bg-white text-[12px] font-medium text-[#2563EB] hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              {copiado ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copiado ? "¡Copiado!" : "Copiar link"}
            </button>
            <a
              href={getBookingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-3 rounded-lg border border-blue-200 bg-white text-[12px] font-medium text-[#2563EB] hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="size-3" /> Ver página
            </a>
          </div>
        </div>
      )}
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

// ─── Modal crear/editar profesional ──────────────────────────────────────────

function ModalProfesional({
  onClose,
  onGuardado,
  profesionalExistente,
}: {
  onClose: () => void
  onGuardado: () => void
  profesionalExistente?: ProfesionalRow | null
}) {
  const esEdicion = !!profesionalExistente
  const [form, setForm] = useState({
    nombre: profesionalExistente?.nombre ?? "",
    especialidad: profesionalExistente?.especialidad ?? "",
    telefono: profesionalExistente?.telefono ?? "",
    email: profesionalExistente?.email ?? "",
    color: profesionalExistente?.color ?? "#2563EB",
    bio: profesionalExistente?.bio ?? "",
    foto_url: profesionalExistente?.foto_url ?? "",
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [serviciosClinica, setServiciosClinica] = useState<{ id: string; nombre: string; duracion_minutos: number; precio: number }[]>([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  // Step 2: availability after creating new professional
  const [paso, setPaso] = useState<1 | 2>(1)
  const [nuevoProfId, setNuevoProfId] = useState<string | null>(null)
  const [diasDisp, setDiasDisp] = useState<DiaDisponibilidad[]>(buildDisponibilidadVacia())
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    const supabase = createClient()
    // Cargar clinicaId
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from("clinicas").select("id").eq("owner_id", user.id).single()
      if (data) setClinicaId(data.id)
    })
    // Cargar servicios activos
    supabase.from("servicios").select("id, nombre, duracion_minutos, precio").eq("activo", true).order("nombre").then(({ data }) => {
      setServiciosClinica((data ?? []) as { id: string; nombre: string; duracion_minutos: number; precio: number }[])
    })
    // Cargar servicios asignados al profesional (si edición)
    if (profesionalExistente) {
      supabase.from("profesional_servicios").select("servicio_id").eq("profesional_id", profesionalExistente.id).then(({ data }) => {
        setServiciosSeleccionados((data ?? []).map((r: { servicio_id: string }) => r.servicio_id))
      })
    }
  }, [profesionalExistente])

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!clinicaId) { setError("Espera un momento e intenta de nuevo."); return }
    if (file.size > 5 * 1024 * 1024) { setError("La imagen no debe superar 5 MB."); return }
    setSubiendoFoto(true)
    setError(null)
    const supabase = createClient()
    const profId = profesionalExistente?.id ?? `temp-${Date.now()}`
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${clinicaId}/${profId}.${ext}`
    console.log('[foto] subiendo a:', path, 'bucket: profesionales')
    const { error: uploadError } = await supabase.storage
      .from("profesionales")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      console.error('[foto] error upload:', uploadError)
      setError(`Error al subir foto: ${uploadError.message} (${uploadError.name ?? uploadError.cause ?? ''})`)
      setSubiendoFoto(false)
      return
    }
    console.log('[foto] subida OK')
    const { data: { publicUrl } } = supabase.storage.from("profesionales").getPublicUrl(path)
    setForm(p => ({ ...p, foto_url: `${publicUrl}?t=${Date.now()}` }))
    setSubiendoFoto(false)
  }

  function toggleServicio(id: string) {
    setServiciosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError("El nombre es requerido."); return }
    if (serviciosSeleccionados.length === 0) { setError("Debes seleccionar al menos un servicio. Si no tienes servicios, crea uno primero en la sección Servicios."); return }
    setGuardando(true)
    setError(null)
    const supabase = createClient()

    let profId = profesionalExistente?.id ?? null

    if (esEdicion && profId) {
      const { error: updateError } = await supabase.from("profesionales").update({
        nombre: form.nombre.trim(),
        especialidad: form.especialidad.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        color: form.color,
        bio: form.bio.trim() || null,
        foto_url: form.foto_url || null,
      }).eq("id", profId)
      if (updateError) {
        setGuardando(false)
        setError("No se pudo actualizar el profesional.")
        return
      }
    } else {
      const result = await crearProfesional({
        nombre: form.nombre.trim(),
        especialidad: form.especialidad.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        color: form.color,
      })
      if (!result) {
        setGuardando(false)
        setError("No se pudo crear el profesional.")
        return
      }
      profId = result.id
      // Si se subió foto con temp id, actualizar la url
      if (form.foto_url || form.bio) {
        await supabase.from("profesionales").update({
          bio: form.bio.trim() || null,
          foto_url: form.foto_url || null,
        }).eq("id", profId)
      }
    }

    if (profId) {
      // Sync profesional_servicios: delete + insert
      await supabase.from("profesional_servicios").delete().eq("profesional_id", profId)
      if (serviciosSeleccionados.length > 0) {
        await supabase.from("profesional_servicios").insert(
          serviciosSeleccionados.map(sid => ({ profesional_id: profId, servicio_id: sid }))
        )
      }
    }

    setGuardando(false)

    if (!esEdicion && profId) {
      // Go to step 2 for new professionals
      setNuevoProfId(profId)
      setPaso(2)
    } else {
      onGuardado()
      onClose()
    }
  }

  async function handleGuardarHorario() {
    if (!nuevoProfId) return
    setGuardandoHorario(true)
    const rows: DisponibilidadRow[] = diasDisp.map(d => ({
      id: '',
      clinica_id: '',
      profesional_id: nuevoProfId,
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      activo: d.activo,
    }))
    await setDisponibilidadProfesional(nuevoProfId, rows)
    setGuardandoHorario(false)
    onGuardado()
    onClose()
  }

  const initials = form.nombre
    ? form.nombre.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?"

  if (paso === 2) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-semibold text-gray-900">Horario de atención</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="size-4 text-gray-400" />
              </button>
            </div>
            <p className="text-[13px] text-gray-500 mb-4">Configura los días y horarios en que este profesional atiende.</p>
            <div className="space-y-2">
              {diasDisp.map((d) => {
                const label = DIAS_SEMANA.find(x => x.num === d.dia_semana)?.label ?? ''
                return (
                  <div key={d.dia_semana} className={`bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-4 transition-opacity ${!d.activo ? 'opacity-60' : ''}`}>
                    <Toggle activo={d.activo} onChange={() => setDiasDisp(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, activo: !x.activo } : x))} />
                    <span className="text-[13px] font-medium text-gray-700 w-24 shrink-0">{label}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <TimeSelect value={d.hora_inicio} onChange={v => setDiasDisp(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, hora_inicio: v } : x))} />
                      <span className="text-[12px] text-gray-400">a</span>
                      <TimeSelect value={d.hora_fin} onChange={v => setDiasDisp(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, hora_fin: v } : x))} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
              <Button type="button" onClick={handleGuardarHorario} disabled={guardandoHorario} className="flex-1 h-9 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                {guardandoHorario ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar horario"}
              </Button>
            </div>
            <div className="flex justify-center mt-3">
              <button type="button" onClick={() => { onGuardado(); onClose() }} className="text-[12px] text-gray-400 hover:text-gray-600 underline">
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold text-gray-900">
              {esEdicion ? "Editar profesional" : "Agregar profesional"}
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="size-4 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna izquierda: foto + datos básicos */}
              <div className="space-y-4">
                {/* Foto */}
                <div>
                  <Label className="mb-2 block text-[12px] font-medium text-gray-700">Foto</Label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-white text-[14px] font-bold overflow-hidden relative hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: form.foto_url ? undefined : form.color }}
                    >
                      {form.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.foto_url} alt="foto" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </button>
                    <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                    <div>
                      <button
                        type="button"
                        disabled={subiendoFoto}
                        onClick={() => fotoInputRef.current?.click()}
                        className="h-7 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {subiendoFoto ? <><Loader2 className="size-3 animate-spin" />Subiendo…</> : "Cambiar foto"}
                      </button>
                      <p className="text-[11px] text-gray-400 mt-1">PNG o JPG</p>
                    </div>
                  </div>
                </div>

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
                  <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Bio</Label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
                    rows={2}
                    placeholder="Cuéntanos sobre la experiencia y enfoque de este profesional…"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                  />
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
              </div>

              {/* Columna derecha: servicios */}
              <div>
                <Label className="mb-2 block text-[12px] font-medium text-gray-700">Servicios que atiende</Label>
                {serviciosClinica.length === 0 ? (
                  <p className="text-[12px] text-gray-400">No hay servicios activos.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {serviciosClinica.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviciosSeleccionados.includes(s.id)}
                          onChange={() => toggleServicio(s.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]/20"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate">{s.nombre}</p>
                          <p className="text-[11px] text-gray-500">{s.duracion_minutos} min · ${s.precio.toLocaleString("es-CL")}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-[12px] text-red-600 mt-4">
                <AlertCircle className="size-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9 text-[13px]">Cancelar</Button>
              <Button type="submit" disabled={guardando} className="flex-1 h-9 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : esEdicion ? "Guardar cambios" : "Agregar profesional"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ─── Sección Equipo ───────────────────────────────────────────────────────────

type ProfesionalConServicios = ProfesionalRow & { servicios_nombres?: string[] }

function SeccionEquipo() {
  const [profesionales, setProfesionales] = useState<ProfesionalConServicios[]>([])
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [abrirModal, setAbrirModal] = useState(false)
  const [editandoProfesional, setEditandoProfesional] = useState<ProfesionalRow | null>(null)
  const { limite } = useSubscripcion()
  const limiteProfesionales = limite('profesionales')
  const alcanzadoLimite = profesionales.length >= limiteProfesionales

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("profesionales")
      .select("*, profesional_servicios(servicio_id, servicios(nombre))")
      .order("nombre", { ascending: true })
    const rows = (data ?? []).map((p: ProfesionalRow & { profesional_servicios?: { servicio_id: string; servicios?: { nombre: string } | null }[] }) => ({
      ...p,
      servicios_nombres: (p.profesional_servicios ?? []).map(ps => ps.servicios?.nombre ?? "").filter(Boolean),
    }))
    setProfesionales(rows)
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
        subtitle={`Administra los profesionales de tu clínica${limiteProfesionales < Infinity ? ` · ${profesionales.length}/${limiteProfesionales} en tu plan` : ''}`}
        action={
          alcanzadoLimite ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                Límite alcanzado ({limiteProfesionales})
              </span>
              <Button disabled className="h-8 text-[13px] gap-1.5 opacity-50 cursor-not-allowed border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
                <Plus className="size-3.5" /> Agregar
              </Button>
            </div>
          ) : (
            <Button onClick={() => setAbrirModal(true)} className="h-8 text-[13px] gap-1.5 border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          )
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
            const serviciosNombres = p.servicios_nombres ?? []
            const badgesVisibles = serviciosNombres.slice(0, 3)
            const extra = serviciosNombres.length - 3
            return (
              <div key={p.id} className={`bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4 ${!p.activo ? "opacity-60" : ""}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-[12px] font-bold overflow-hidden" style={{ backgroundColor: p.foto_url ? undefined : p.color }}>
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900">{p.nombre}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{p.especialidad ?? "Sin especialidad"}</p>
                  {badgesVisibles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badgesVisibles.map(nombre => (
                        <span key={nombre} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB]">{nombre}</span>
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">+{extra} más</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.activo ? "bg-emerald-50 text-[#10B981]" : "bg-gray-100 text-gray-500"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  <Toggle activo={p.activo} onChange={() => toggleActivo(p)} />
                  <button onClick={() => setEditandoProfesional(p)}
                    className="h-7 w-7 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors group">
                    <Pencil className="size-3.5 text-gray-300 group-hover:text-[#2563EB]" />
                  </button>
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

      {abrirModal && <ModalProfesional onClose={() => setAbrirModal(false)} onGuardado={cargar} />}
      {editandoProfesional && (
        <ModalProfesional
          onClose={() => setEditandoProfesional(null)}
          onGuardado={() => { setEditandoProfesional(null); cargar() }}
          profesionalExistente={editandoProfesional}
        />
      )}
    </div>
  )
}

// ─── Sección WhatsApp ─────────────────────────────────────────────────────────

function SeccionWhatsApp() {
  const twilioFrom = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_FROM
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

const VARIABLES_DISPONIBLES = [
  { key: "{nombre}",      desc: "Nombre del paciente" },
  { key: "{fecha}",       desc: "Fecha de la cita (ej: lunes 3 de junio)" },
  { key: "{hora}",        desc: "Hora de la cita (ej: 15:00)" },
  { key: "{servicio}",    desc: "Nombre del servicio" },
  { key: "{profesional}", desc: "Nombre del profesional" },
  { key: "{clinica}",     desc: "Nombre de la clínica" },
]

const EJEMPLO_PREVIEW = {
  nombre: "María González",
  fecha: "lunes 3 de junio",
  hora: "15:00",
  servicio: "Limpieza facial",
  profesional: "Dra. Ana García",
  clinica: "Clínica Bella",
}

function aplicarVariables(template: string, vars: typeof EJEMPLO_PREVIEW): string {
  return template
    .replace(/\{nombre\}/g, vars.nombre)
    .replace(/\{fecha\}/g, vars.fecha)
    .replace(/\{hora\}/g, vars.hora)
    .replace(/\{servicio\}/g, vars.servicio)
    .replace(/\{profesional\}/g, vars.profesional)
    .replace(/\{clinica\}/g, vars.clinica)
}

const OPCIONES_MINUTOS = [
  { label: "2 horas antes",  value: 120 },
  { label: "24 horas antes", value: 1440 },
  { label: "48 horas antes", value: 2880 },
  { label: "Personalizado",  value: -1 },
]

function SeccionRecordatorios() {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null)

  const [activo, setActivo] = useState(true)
  const [minutosAntes, setMinutosAntes] = useState(1440)
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(1440)
  const [minutosCustom, setMinutosCustom] = useState(60)
  const [template, setTemplate] = useState(TEMPLATE_RECORDATORIO_DEFAULT)

  useEffect(() => {
    getClinicaConfig().then((cfg) => {
      const wsp = cfg.recordatorios_wsp
      if (wsp) {
        setActivo(wsp.activo)
        setTemplate(wsp.template || TEMPLATE_RECORDATORIO_DEFAULT)
        const opcionFija = OPCIONES_MINUTOS.find(o => o.value === wsp.minutos_antes && o.value !== -1)
        if (opcionFija) {
          setOpcionSeleccionada(wsp.minutos_antes)
          setMinutosAntes(wsp.minutos_antes)
        } else {
          setOpcionSeleccionada(-1)
          setMinutosCustom(wsp.minutos_antes)
          setMinutosAntes(wsp.minutos_antes)
        }
      }
      setCargando(false)
    })
  }, [])

  function handleOpcionChange(val: number) {
    setOpcionSeleccionada(val)
    if (val !== -1) setMinutosAntes(val)
    else setMinutosAntes(minutosCustom)
  }

  function handleMinutosCustomChange(val: number) {
    setMinutosCustom(val)
    setMinutosAntes(val)
  }

  async function guardar() {
    setGuardando(true)
    setFeedback(null)
    const mins = opcionSeleccionada === -1 ? minutosCustom : opcionSeleccionada
    const nuevaConfig: RecordatoriosWspConfig = {
      activo,
      minutos_antes: mins,
      template,
    }
    const cfg = await getClinicaConfig()
    const ok = await actualizarClinicaConfig({ ...cfg, recordatorios_wsp: nuevaConfig })
    setGuardando(false)
    if (ok) {
      setFeedback({ tipo: "ok", msg: "Configuración guardada correctamente." })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: "error", msg: "No se pudo guardar." })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  const preview = aplicarVariables(template, EJEMPLO_PREVIEW)

  return (
    <div>
      <SectionHeader title="Recordatorios automáticos" subtitle="Configura el mensaje que recibirán tus pacientes" />

      {/* Toggle general */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Activar recordatorios automáticos</p>
          <p className="text-[12px] text-gray-500 mt-0.5">Envía mensajes de WhatsApp automáticamente antes de cada cita</p>
        </div>
        <Toggle activo={activo} onChange={() => setActivo(v => !v)} />
      </div>

      {activo && (
        <>
          {/* Cuándo enviar */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-3">¿Cuándo enviar el recordatorio?</p>
            <div className="flex flex-wrap gap-2">
              {OPCIONES_MINUTOS.map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => handleOpcionChange(op.value)}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${opcionSeleccionada === op.value ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            {opcionSeleccionada === -1 && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={minutosCustom}
                  onChange={(e) => handleMinutosCustomChange(Number(e.target.value))}
                  className="h-8 w-24 px-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
                <span className="text-[12px] text-gray-500">minutos antes de la cita</span>
              </div>
            )}
          </div>

          {/* Template + preview */}
          <div className="mb-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-1">Mensaje de recordatorio</p>
            <p className="text-[12px] text-gray-400 mb-3">Usa variables para personalizar el mensaje con los datos de cada cita</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VARIABLES_DISPONIBLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      title={v.desc}
                      onClick={() => setTemplate(t => t + v.key)}
                      className="h-6 px-2 rounded-md bg-blue-50 text-[11px] font-mono text-[#2563EB] border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTemplate(TEMPLATE_RECORDATORIO_DEFAULT)}
                  className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 underline"
                >
                  Restaurar plantilla por defecto
                </button>
              </div>

              {/* Preview */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">Vista previa</p>
                <div className="bg-[#ECE5DD] rounded-xl p-4 min-h-[200px]">
                  <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-sm">
                    <p className="text-[13px] text-gray-900 whitespace-pre-wrap leading-relaxed">{preview}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 text-right">15:00 ✓✓</p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 text-center">Ejemplo con datos ficticios</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
  return (
    <div>
      <SectionHeader title="Plan y facturación" subtitle="Gestiona tu suscripción de SimpliClinic" />
      <Suspense><PlanesCard /></Suspense>
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
    setHorarios((prev) => {
      const current = prev[dia] ?? { activo: false, desde: '09:00', hasta: '18:00' }
      return { ...prev, [dia]: { ...current, activo: !current.activo } }
    })
  }

  function setHora(dia: string, campo: 'desde' | 'hasta', valor: string) {
    setHorarios((prev) => {
      const current = prev[dia] ?? { activo: false, desde: '09:00', hasta: '18:00' }
      return { ...prev, [dia]: { ...current, [campo]: valor } }
    })
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
                  <TimeSelect value={h.desde} onChange={v => setHora(dia, 'desde', v)} />
                  <span className="text-[12px] text-gray-400">→</span>
                  <TimeSelect value={h.hasta} onChange={v => setHora(dia, 'hasta', v)} />
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

// ─── Sección Disponibilidad por profesional ───────────────────────────────────

const DIAS_SEMANA = [
  { num: 1, label: 'Lunes' },
  { num: 2, label: 'Martes' },
  { num: 3, label: 'Miércoles' },
  { num: 4, label: 'Jueves' },
  { num: 5, label: 'Viernes' },
  { num: 6, label: 'Sábado' },
  { num: 7, label: 'Domingo' },
]

type DiaDisponibilidad = {
  dia_semana: number
  activo: boolean
  hora_inicio: string
  hora_fin: string
}

function buildDisponibilidadVacia(): DiaDisponibilidad[] {
  return DIAS_SEMANA.map((d) => ({
    dia_semana: d.num,
    activo: d.num <= 5,
    hora_inicio: '09:00',
    hora_fin: '18:00',
  }))
}

function rowsToForm(rows: DisponibilidadRow[]): DiaDisponibilidad[] {
  return DIAS_SEMANA.map((d) => {
    const row = rows.find((r) => r.dia_semana === d.num)
    if (row) {
      return { dia_semana: d.num, activo: row.activo, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin }
    }
    return { dia_semana: d.num, activo: false, hora_inicio: '09:00', hora_fin: '18:00' }
  })
}

function SeccionDisponibilidad() {
  const [profesionales, setProfesionales] = useState<ProfesionalRow[]>([])
  const [profesionalId, setProfesionalId] = useState<string>('')
  const [dias, setDias] = useState<DiaDisponibilidad[]>(buildDisponibilidadVacia())
  const [cargando, setCargando] = useState(true)
  const [cargandoDias, setCargandoDias] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    getProfesionales().then((profs) => {
      setProfesionales(profs)
      if (profs.length > 0) setProfesionalId(profs[0].id)
      setCargando(false)
    })
  }, [])

  useEffect(() => {
    if (!profesionalId) return
    setCargandoDias(true)
    setFeedback(null)
    getDisponibilidadProfesional(profesionalId).then((rows) => {
      setDias(rowsToForm(rows))
      setCargandoDias(false)
    })
  }, [profesionalId])

  function toggleDia(num: number) {
    setDias((prev) => prev.map((d) => d.dia_semana === num ? { ...d, activo: !d.activo } : d))
  }

  function setHora(num: number, campo: 'hora_inicio' | 'hora_fin', valor: string) {
    setDias((prev) => prev.map((d) => d.dia_semana === num ? { ...d, [campo]: valor } : d))
  }

  async function guardar() {
    if (!profesionalId) return
    setGuardando(true)
    setFeedback(null)
    const filas: DisponibilidadRow[] = dias.map((d) => ({
      id: '',
      clinica_id: '',
      profesional_id: profesionalId,
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      activo: d.activo,
    }))
    const ok = await setDisponibilidadProfesional(profesionalId, filas)
    setGuardando(false)
    if (ok) {
      setFeedback({ tipo: 'ok', msg: 'Disponibilidad guardada correctamente.' })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: 'error', msg: 'No se pudo guardar. Intenta nuevamente.' })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  if (profesionales.length === 0) {
    return (
      <div>
        <SectionHeader title="Disponibilidad por profesional" subtitle="Configura el horario individual de cada profesional" />
        <div className="text-center py-12">
          <CalendarDays className="size-8 text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No hay profesionales registrados.</p>
        </div>
      </div>
    )
  }

  const profesionalActual = profesionales.find((p) => p.id === profesionalId)

  return (
    <div>
      <SectionHeader title="Disponibilidad por profesional" subtitle="Configura el horario individual de cada profesional" />

      <div className="flex gap-2 flex-wrap mb-6">
        {profesionales.map((p) => {
          const initials = p.nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
          const isSelected = p.id === profesionalId
          return (
            <button
              key={p.id}
              onClick={() => setProfesionalId(p.id)}
              className={`flex items-center gap-2 h-9 pl-2 pr-3 rounded-xl border text-[13px] font-medium transition-colors ${isSelected ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: p.color }}>
                {initials}
              </span>
              {p.nombre}
            </button>
          )
        })}
      </div>

      {profesionalActual && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-[13px] font-semibold text-gray-700 mb-3">
            Horario de {profesionalActual.nombre}
          </p>
          {cargandoDias ? (
            <div className="flex items-center gap-2 py-6 justify-center text-[13px] text-gray-400">
              <Loader2 className="size-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <div className="space-y-2">
              {dias.map((d) => {
                const diaLabel = DIAS_SEMANA.find((x) => x.num === d.dia_semana)?.label ?? ''
                return (
                  <div key={d.dia_semana} className={`bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-4 transition-opacity ${!d.activo ? 'opacity-60' : ''}`}>
                    <Toggle activo={d.activo} onChange={() => toggleDia(d.dia_semana)} />
                    <span className="w-24 text-[13px] font-medium text-gray-800 shrink-0">{diaLabel}</span>
                    {d.activo ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={d.hora_inicio}
                          onChange={(e) => setHora(d.dia_semana, 'hora_inicio', e.target.value)}
                          className="h-8 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        />
                        <span className="text-[12px] text-gray-400">–</span>
                        <input
                          type="time"
                          value={d.hora_fin}
                          onChange={(e) => setHora(d.dia_semana, 'hora_fin', e.target.value)}
                          className="h-8 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        />
                      </div>
                    ) : (
                      <span className="text-[12px] text-gray-400 flex-1">No trabaja este día</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Feedback f={feedback} />
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando || cargandoDias} className="h-8 text-[13px] border-0 text-white" style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : "Guardar disponibilidad"}
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

function ConfiguracionInner() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") as SeccionId | null
  const VALID_TABS = new Set<SeccionId>(["clinica","equipo","horarios","disponibilidad","usuarios","whatsapp","recordatorios","plan","seguridad"])
  const [activa, setActiva] = useState<SeccionId>(tabParam && VALID_TABS.has(tabParam) ? tabParam : "clinica")
  const { puede, cargando: cargandoRol } = useAcceso("configuracion")

  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam)) setActiva(tabParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam])

  if (cargandoRol) return null
  if (!puede) {
    if (typeof window !== 'undefined') window.location.replace('/dashboard')
    return null
  }

  const SECCIONES: Record<SeccionId, React.ReactNode> = {
    clinica:        <SeccionClinica />,
    equipo:         <SeccionEquipo />,
    horarios:       <SeccionHorarios />,
    disponibilidad: <SeccionDisponibilidad />,
    usuarios:       <SeccionUsuarios />,
    whatsapp:       <SeccionWhatsApp />,
    recordatorios:  <SeccionRecordatorios />,
    plan:           <SeccionPlan />,
    seguridad:      <SeccionSeguridad />,
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-5 max-w-[1000px]">
      <div className="shrink-0">
        <h1 className="text-[18px] font-semibold text-gray-900">Configuración</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Administra tu clínica y preferencias del sistema</p>
      </div>

      <ClinicaHeaderCard />

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 flex-1 min-h-0">
        <nav className="sm:w-[200px] w-full shrink-0 space-y-0.5">
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

export default function ConfiguracionPage() {
  return (
    <Suspense>
      <ConfiguracionInner />
    </Suspense>
  )
}
