'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2, Loader2, ChevronRight, ChevronLeft, Sparkles, Users, Scissors, Clock } from 'lucide-react'
import {
  actualizarClinicaBasica,
  crearProfesionalOnboarding,
  crearServicioOnboarding,
  getClinicaBasica,
  getOnboardingCounts,
  type ClinicaBasica,
} from '@/lib/onboarding/queries'

const TIPOS_CLINICA = [
  'Clínica estética',
  'Spa & wellness',
  'Centro médico',
  'Consultorio dermatológico',
  'Centro de nutrición',
  'Otro',
]

const COLORES_PROF = [
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#10B981', label: 'Verde' },
  { hex: '#F59E0B', label: 'Ámbar' },
  { hex: '#8B5CF6', label: 'Violeta' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#14B8A6', label: 'Teal' },
  { hex: '#EF4444', label: 'Rojo' },
  { hex: '#F97316', label: 'Naranja' },
]

const DURACIONES = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1 h 30 min' },
  { value: '120', label: '2 horas' },
]

const STEPS = [
  { id: 1, title: 'Tu clínica',    subtitle: 'Cuéntanos sobre tu negocio',        icon: Sparkles },
  { id: 2, title: 'Tu equipo',     subtitle: 'Agrega tu primer profesional',       icon: Users },
  { id: 3, title: 'Tus servicios', subtitle: 'Define lo que ofreces',              icon: Scissors },
  { id: 4, title: 'Horarios',      subtitle: 'Configura tu disponibilidad',        icon: Clock },
] as const

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')
const MEDIAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg border border-slate-200 bg-white px-2 pr-6 text-sm font-medium text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      {MEDIAS.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  )
}

const DIAS = [
  { key: 'lunes',     label: 'L' },
  { key: 'martes',    label: 'M' },
  { key: 'miercoles', label: 'X' },
  { key: 'jueves',    label: 'J' },
  { key: 'viernes',   label: 'V' },
  { key: 'sabado',    label: 'S' },
  { key: 'domingo',   label: 'D' },
]

type DiaConfig = { activo: boolean; desde: string; hasta: string }

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all ${className}`}
    />
  )
}

function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all ${className}`}
    >
      {children}
    </select>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export function OnboardingWizard() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clinica, setClinica] = useState<ClinicaBasica | null>(null)

  // Paso 1
  const [nombreClinica, setNombreClinica] = useState('')
  const [tipoClinica, setTipoClinica] = useState('')
  const [telefonoClinica, setTelefonoClinica] = useState('')
  const [emailClinica, setEmailClinica] = useState('')
  const [direccionClinica, setDireccionClinica] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')

  // Paso 2
  const [nombreProfesional, setNombreProfesional] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [emailProfesional, setEmailProfesional] = useState('')
  const [telefonoProfesional, setTelefonoProfesional] = useState('')
  const [colorProfesional, setColorProfesional] = useState(COLORES_PROF[0].hex)

  // Paso 3
  const [nombreServicio, setNombreServicio] = useState('')
  const [descripcionServicio, setDescripcionServicio] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState('60')
  const [precioServicio, setPrecioServicio] = useState('')

  // Paso 4
  const [horarios, setHorarios] = useState<Record<string, DiaConfig>>({
    lunes:     { activo: true,  desde: '09:00', hasta: '18:00' },
    martes:    { activo: true,  desde: '09:00', hasta: '18:00' },
    miercoles: { activo: true,  desde: '09:00', hasta: '18:00' },
    jueves:    { activo: true,  desde: '09:00', hasta: '18:00' },
    viernes:   { activo: true,  desde: '09:00', hasta: '18:00' },
    sabado:    { activo: false, desde: '09:00', hasta: '14:00' },
    domingo:   { activo: false, desde: '09:00', hasta: '14:00' },
  })

  useEffect(() => {
    async function init() {
      const data = await getClinicaBasica()
      if (data) {
        setClinica(data)
        setNombreClinica(data.nombre ?? '')
        setTelefonoClinica(data.telefono ?? '')
        setDireccionClinica(data.direccion ?? '')
        setEmailClinica(data.email ?? '')
        setSitioWeb(data.sitio_web ?? '')
      }
      const counts = await getOnboardingCounts()
      if (counts.profesionales > 0 && counts.servicios > 0) {
        router.replace('/dashboard')
        return
      }
      if (counts.profesionales > 0) setPaso(3)
      setCargando(false)
    }
    init()
  }, [router])

  function toggleDia(key: string) {
    setHorarios(prev => ({ ...prev, [key]: { ...prev[key], activo: !prev[key].activo } }))
  }

  function setHoraDia(key: string, campo: 'desde' | 'hasta', valor: string) {
    setHorarios(prev => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }))
  }

  async function handlePaso1(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreClinica.trim()) { setError('El nombre de la clínica es obligatorio'); return }
    setGuardando(true)
    const actualizada = await actualizarClinicaBasica({
      nombre: nombreClinica,
      telefono: telefonoClinica,
      direccion: direccionClinica,
      email: emailClinica || undefined,
      sitio_web: sitioWeb || undefined,
    })
    setGuardando(false)
    if (!actualizada) { setError('No se pudieron guardar los datos. Intenta de nuevo.'); return }
    setClinica(actualizada)
    setPaso(2)
  }

  async function handlePaso2(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreProfesional.trim()) { setError('El nombre del profesional es obligatorio'); return }
    setGuardando(true)
    const counts = await getOnboardingCounts()
    if (counts.profesionales === 0) {
      const creado = await crearProfesionalOnboarding({
        nombre: nombreProfesional,
        especialidad,
        color: colorProfesional,
        email: emailProfesional || undefined,
        telefono: telefonoProfesional || undefined,
      })
      if (!creado) { setGuardando(false); setError('No se pudo crear el profesional'); return }
    }
    setGuardando(false)
    setPaso(3)
  }

  async function handlePaso3(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreServicio.trim()) { setError('El nombre del servicio es obligatorio'); return }
    const duracion = parseInt(duracionMinutos, 10)
    const precio = parseInt(precioServicio.replace(/\D/g, ''), 10) || 0
    setGuardando(true)
    const counts = await getOnboardingCounts()
    if (counts.servicios === 0) {
      const creado = await crearServicioOnboarding({ nombre: nombreServicio, duracion_minutos: duracion, precio, descripcion: descripcionServicio || undefined })
      if (!creado) { setGuardando(false); setError('No se pudo crear el servicio'); return }
    }
    setGuardando(false)
    setPaso(4)
  }

  async function handlePaso4(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    // Save horarios to clinica configuracion
    await actualizarClinicaBasica({ horarios })
    setGuardando(false)
    router.replace('/dashboard')
  }

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  const stepActual = STEPS[paso - 1]

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-10">

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const done = paso > s.id
            const active = paso === s.id
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    done    ? 'border-[#14B8A6] bg-[#14B8A6] text-white' :
                    active  ? 'border-[#2563EB] bg-[#2563EB] text-white' :
                              'border-slate-200 bg-white text-slate-400'
                  }`}>
                    {done ? <CheckCircle2 className="size-4" /> : s.id}
                  </div>
                  <span className={`text-[10px] font-semibold hidden sm:block ${active ? 'text-[#2563EB]' : done ? 'text-[#14B8A6]' : 'text-slate-400'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 transition-all ${paso > s.id ? 'bg-[#14B8A6]' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2563EB] mb-1">
          Paso {paso} de {STEPS.length}
        </p>
        <h1 className="text-2xl font-extrabold text-[#0B132B] tracking-tight">{stepActual.title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{stepActual.subtitle}</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Paso 1 — Clínica */}
        {paso === 1 && (
          <form onSubmit={handlePaso1}>
            <div className="p-6 space-y-4">
              <Field label="Nombre de la clínica" required>
                <Input
                  value={nombreClinica}
                  onChange={e => setNombreClinica(e.target.value)}
                  placeholder="Ej: Clínica Bella, Centro Estético Lumina"
                  required
                />
              </Field>
              <Field label="Tipo de clínica" hint="opcional">
                <Select value={tipoClinica} onChange={e => setTipoClinica(e.target.value)}>
                  <option value="">Selecciona el tipo de negocio</option>
                  {TIPOS_CLINICA.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono de contacto">
                  <Input
                    type="tel"
                    value={telefonoClinica}
                    onChange={e => setTelefonoClinica(e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                </Field>
                <Field label="Email de contacto">
                  <Input
                    type="email"
                    value={emailClinica}
                    onChange={e => setEmailClinica(e.target.value)}
                    placeholder="hola@tuclinica.cl"
                  />
                </Field>
              </div>
              <Field label="Dirección">
                <Input
                  value={direccionClinica}
                  onChange={e => setDireccionClinica(e.target.value)}
                  placeholder="Av. Providencia 1234, Santiago"
                />
              </Field>
              <Field label="Sitio web" hint="opcional">
                <Input
                  type="url"
                  value={sitioWeb}
                  onChange={e => setSitioWeb(e.target.value)}
                  placeholder="https://tuclinica.cl"
                />
              </Field>
            </div>
            {error && <div className="mx-6 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            <div className="px-6 pb-6">
              <button
                type="submit"
                disabled={guardando}
                className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <>Continuar <ChevronRight className="size-4" /></>}
              </button>
            </div>
          </form>
        )}

        {/* Paso 2 — Profesional */}
        {paso === 2 && (
          <form onSubmit={handlePaso2}>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                Agrega al menos un profesional. Podrás agregar más desde la configuración.
              </div>
              <Field label="Nombre completo" required>
                <Input
                  value={nombreProfesional}
                  onChange={e => setNombreProfesional(e.target.value)}
                  placeholder="Ej: Dra. María López"
                  required
                />
              </Field>
              <Field label="Especialidad o cargo">
                <Input
                  value={especialidad}
                  onChange={e => setEspecialidad(e.target.value)}
                  placeholder="Ej: Dermatóloga, Esteticista, Kinesiólogo"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email profesional" hint="opcional">
                  <Input
                    type="email"
                    value={emailProfesional}
                    onChange={e => setEmailProfesional(e.target.value)}
                    placeholder="maria@clinica.cl"
                  />
                </Field>
                <Field label="Teléfono" hint="opcional">
                  <Input
                    type="tel"
                    value={telefonoProfesional}
                    onChange={e => setTelefonoProfesional(e.target.value)}
                    placeholder="+56 9 8765 4321"
                  />
                </Field>
              </div>
              <Field label="Color en la agenda" hint="para identificar sus citas">
                <div className="flex gap-2 flex-wrap pt-1">
                  {COLORES_PROF.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      onClick={() => setColorProfesional(c.hex)}
                      className="size-9 rounded-full transition-all hover:scale-110 focus:outline-none"
                      style={{
                        background: c.hex,
                        boxShadow: colorProfesional === c.hex ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </Field>
            </div>
            {error && <div className="mx-6 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft className="size-4" /> Atrás
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-[2] h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <>Continuar <ChevronRight className="size-4" /></>}
              </button>
            </div>
            <div className="pb-5 text-center">
              <button type="button" onClick={() => setPaso(3)} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                Saltar por ahora
              </button>
            </div>
          </form>
        )}

        {/* Paso 3 — Servicio */}
        {paso === 3 && (
          <form onSubmit={handlePaso3}>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm text-teal-700">
                Define tu primer servicio. Podrás agregar más y personalizarlos después.
              </div>
              <Field label="Nombre del servicio" required>
                <Input
                  value={nombreServicio}
                  onChange={e => setNombreServicio(e.target.value)}
                  placeholder="Ej: Limpieza facial, Botox, Masaje relajante"
                  required
                />
              </Field>
              <Field label="Descripción" hint="opcional">
                <textarea
                  value={descripcionServicio}
                  onChange={e => setDescripcionServicio(e.target.value)}
                  placeholder="Describe brevemente en qué consiste este servicio..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duración">
                  <Select value={duracionMinutos} onChange={e => setDuracionMinutos(e.target.value)}>
                    {DURACIONES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </Select>
                </Field>
                <Field label="Precio (CLP)">
                  <Input
                    inputMode="numeric"
                    value={precioServicio}
                    onChange={e => setPrecioServicio(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="35000"
                  />
                </Field>
              </div>
            </div>
            {error && <div className="mx-6 mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft className="size-4" /> Atrás
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-[2] h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' }}
              >
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <>Continuar <ChevronRight className="size-4" /></>}
              </button>
            </div>
            <div className="pb-5 text-center">
              <button type="button" onClick={() => setPaso(4)} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                Saltar por ahora
              </button>
            </div>
          </form>
        )}

        {/* Paso 4 — Horarios */}
        {paso === 4 && (
          <form onSubmit={handlePaso4}>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
                Configura tus días y horarios de atención. Los pacientes solo podrán reservar en estos horarios.
              </div>
              <div className="space-y-2">
                {DIAS.map(dia => {
                  const cfg = horarios[dia.key]
                  return (
                    <div key={dia.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cfg.activo ? 'border-[#2563EB]/30 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                      <button
                        type="button"
                        onClick={() => toggleDia(dia.key)}
                        className={`size-8 rounded-full text-xs font-bold flex-shrink-0 transition-all ${cfg.activo ? 'text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                        style={cfg.activo ? { backgroundColor: '#2563EB' } : {}}
                      >
                        {dia.label}
                      </button>
                      <span className={`text-sm font-medium w-20 flex-shrink-0 capitalize ${cfg.activo ? 'text-slate-700' : 'text-slate-400'}`}>
                        {dia.key === 'miercoles' ? 'Miércoles' : dia.key.charAt(0).toUpperCase() + dia.key.slice(1)}
                      </span>
                      {cfg.activo ? (
                        <div className="flex items-center gap-2 flex-1">
                          <TimeSelect value={cfg.desde} onChange={v => setHoraDia(dia.key, 'desde', v)} />
                          <span className="text-slate-400 text-xs font-medium">→</span>
                          <TimeSelect value={cfg.hasta} onChange={v => setHoraDia(dia.key, 'hasta', v)} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No disponible</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPaso(3)}
                className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft className="size-4" /> Atrás
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-[2] h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
              >
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <>¡Comenzar! <Sparkles className="size-4" /></>}
              </button>
            </div>
            <div className="pb-5 text-center">
              <button type="button" onClick={() => router.replace('/dashboard')} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                Saltar, configurar después
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Puedes editar todo esto más tarde desde <span className="font-semibold">Configuración</span>
      </p>
    </div>
  )
}
