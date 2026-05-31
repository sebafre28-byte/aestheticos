'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, Loader2, Scissors, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  actualizarClinicaBasica,
  crearProfesionalOnboarding,
  crearServicioOnboarding,
  getClinicaBasica,
  getOnboardingCounts,
  type ClinicaBasica,
} from '@/lib/onboarding/queries'

const STEPS = [
  { id: 1, title: 'Tu clínica', icon: Building2 },
  { id: 2, title: 'Profesional', icon: UserRound },
  { id: 3, title: 'Servicio', icon: Scissors },
] as const

const COLORES_PROF = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
]

const DURACIONES = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
]

export function OnboardingWizard() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clinica, setClinica] = useState<ClinicaBasica | null>(null)

  const [nombreClinica, setNombreClinica] = useState('')
  const [telefonoClinica, setTelefonoClinica] = useState('')
  const [direccionClinica, setDireccionClinica] = useState('')

  const [nombreProfesional, setNombreProfesional] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [colorProfesional, setColorProfesional] = useState(COLORES_PROF[0])

  const [nombreServicio, setNombreServicio] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState('60')
  const [precioServicio, setPrecioServicio] = useState('')

  useEffect(() => {
    async function init() {
      const data = await getClinicaBasica()
      if (data) {
        setClinica(data)
        setNombreClinica(data.nombre ?? '')
        setTelefonoClinica(data.telefono ?? '')
        setDireccionClinica(data.direccion ?? '')
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

  async function handlePaso1(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreClinica.trim()) {
      setError('Ingresa el nombre de la clínica')
      return
    }
    setGuardando(true)
    const actualizada = await actualizarClinicaBasica({
      nombre: nombreClinica,
      telefono: telefonoClinica,
      direccion: direccionClinica,
    })
    setGuardando(false)
    if (!actualizada) {
      setError('No se pudieron guardar los datos. Intenta de nuevo.')
      return
    }
    setClinica(actualizada)
    setPaso(2)
  }

  async function handlePaso2(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreProfesional.trim()) {
      setError('Ingresa el nombre del profesional')
      return
    }
    setGuardando(true)
    const counts = await getOnboardingCounts()
    if (counts.profesionales === 0) {
      const creado = await crearProfesionalOnboarding({
        nombre: nombreProfesional,
        especialidad,
        color: colorProfesional,
      })
      if (!creado) {
        setGuardando(false)
        setError('No se pudo crear el profesional')
        return
      }
    }
    setGuardando(false)
    setPaso(3)
  }

  async function handlePaso3(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombreServicio.trim()) {
      setError('Ingresa el nombre del servicio')
      return
    }
    const duracion = parseInt(duracionMinutos, 10)
    const precio = parseInt(precioServicio.replace(/\D/g, ''), 10) || 0
    if (!duracion || duracion < 15) {
      setError('La duración mínima es 15 minutos')
      return
    }

    setGuardando(true)
    const counts = await getOnboardingCounts()
    if (counts.servicios === 0) {
      const creado = await crearServicioOnboarding({
        nombre: nombreServicio,
        duracion_minutos: duracion,
        precio,
      })
      if (!creado) {
        setGuardando(false)
        setError('No se pudo crear el servicio')
        return
      }
    }
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

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
        >
          <Building2 className="size-6" />
        </div>
        <h1 className="text-xl font-bold text-[#0B132B] sm:text-2xl">Configura SimpliClinic</h1>
        <p className="mt-1 text-sm text-slate-500">
          {clinica?.nombre ? `${clinica.nombre} · ` : ''}Paso {paso} de 3
        </p>
      </div>

      {/* Progress steps */}
      <div className="mb-6 flex justify-center gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon
          const activo = paso === s.id
          const listo = paso > s.id
          return (
            <div
              key={s.id}
              className={`flex flex-1 max-w-[100px] flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                activo
                  ? 'border-[#2563EB] bg-blue-50'
                  : listo
                    ? 'border-[#14B8A6] bg-teal-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              {listo ? (
                <CheckCircle2 className="size-4 text-[#14B8A6]" />
              ) : (
                <Icon className={`size-4 ${activo ? 'text-[#2563EB]' : 'text-slate-400'}`} />
              )}
              <span className={`text-[10px] font-semibold ${activo ? 'text-[#2563EB]' : 'text-slate-500'}`}>
                {s.title}
              </span>
            </div>
          )
        })}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-md">
        <CardContent className="p-5 sm:p-6">
          {/* Step 1 — Clinica */}
          {paso === 1 && (
            <form onSubmit={handlePaso1} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre-clinica">
                  Nombre de la clínica <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre-clinica"
                  value={nombreClinica}
                  onChange={(e) => setNombreClinica(e.target.value)}
                  placeholder="Clínica Bella"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono-clinica">Teléfono</Label>
                <Input
                  id="telefono-clinica"
                  value={telefonoClinica}
                  onChange={(e) => setTelefonoClinica(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="direccion-clinica">Dirección</Label>
                <Input
                  id="direccion-clinica"
                  value={direccionClinica}
                  onChange={(e) => setDireccionClinica(e.target.value)}
                  placeholder="Av. Providencia 1234, Santiago"
                  className="h-10"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                disabled={guardando}
                className="w-full h-10 text-white border-0"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {guardando ? <Loader2 className="size-4 animate-spin" /> : 'Continuar →'}
              </Button>
            </form>
          )}

          {/* Step 2 — Profesional */}
          {paso === 2 && (
            <form onSubmit={handlePaso2} className="space-y-4">
              <p className="text-sm text-slate-600">Agrega al menos un profesional para la agenda.</p>
              <div className="space-y-1.5">
                <Label htmlFor="nombre-prof">
                  Nombre completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre-prof"
                  value={nombreProfesional}
                  onChange={(e) => setNombreProfesional(e.target.value)}
                  placeholder="Dra. María López"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="especialidad">Especialidad (opcional)</Label>
                <Input
                  id="especialidad"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Ej: Dermatóloga, Esteticista"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORES_PROF.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorProfesional(c)}
                      className="size-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        background: c,
                        borderColor: colorProfesional === c ? '#0B132B' : 'transparent',
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPaso(1)} className="flex-1 h-10">
                  Atrás
                </Button>
                <Button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 h-10 text-white border-0"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
                >
                  {guardando ? <Loader2 className="size-4 animate-spin" /> : 'Continuar →'}
                </Button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  Saltar
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Servicio */}
          {paso === 3 && (
            <form onSubmit={handlePaso3} className="space-y-4">
              <p className="text-sm text-slate-600">Define tu primer servicio para agendar citas.</p>
              <div className="space-y-1.5">
                <Label htmlFor="nombre-servicio">
                  Nombre del servicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre-servicio"
                  value={nombreServicio}
                  onChange={(e) => setNombreServicio(e.target.value)}
                  placeholder="Consulta general"
                  required
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="duracion">Duración</Label>
                  <select
                    id="duracion"
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {DURACIONES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="precio">Precio (CLP)</Label>
                  <Input
                    id="precio"
                    inputMode="numeric"
                    value={precioServicio}
                    onChange={(e) => setPrecioServicio(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="35000"
                    className="h-10"
                  />
                </div>
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPaso(2)} className="flex-1 h-10">
                  Atrás
                </Button>
                <Button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 h-10 text-white border-0"
                  style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)' }}
                >
                  {guardando ? <Loader2 className="size-4 animate-spin" /> : '¡Listo, ir al dashboard! →'}
                </Button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  Saltar
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
