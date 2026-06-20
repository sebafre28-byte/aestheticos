'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight, CheckCircle, Eye, EyeOff, Mail } from "lucide-react"
import { SimpliClinicLogo } from '@/components/ui/SimpliClinicLogo'

// ─── Left panel value props ───────────────────────────────────────────────────

const BENEFITS = [
  'Agenda inteligente con vista día, semana y mes',
  'Fichas clínicas con historial completo',
  'Recordatorios automáticos por WhatsApp',
  'Agente IA que agenda y reagenda por ti',
  'Reportes de ingresos exportables',
  'Multi-usuario con roles de acceso',
]

const AVATARS = ['VR', 'CH', 'FL']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const nombre = formData.get('nombre') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const clinica_nombre = formData.get('clinica') as string

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, clinica_nombre },
      },
    })

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Este email ya tiene una cuenta. Inicia sesión.'
        : error.message)
      setLoading(false)
      return
    }

    // Enviar email de bienvenida (fire-and-forget) en ambos casos
    fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'bienvenida',
        destinatario: email,
        datos: {
          nombre,
          clinica_nombre,
          dashboard_url: `${window.location.origin}/dashboard`,
        },
      }),
    }).catch(() => {})

    // Si confirm email está desactivado en Supabase, la sesión ya existe → ir directo al dashboard
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard')
      return
    }

    // Si requiere confirmación, mostrar pantalla "Revisa tu email"
    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg, #0B132B 0%, #0f2040 60%, #0B132B 100%)' }}
      >
        <SimpliClinicLogo size={32} light />

        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] font-medium text-blue-300">14 días gratis · Sin tarjeta</span>
            </div>
            <h2 className="text-[32px] font-extrabold text-white leading-[1.2] tracking-tight mb-4">
              Todo lo que necesita<br />tu clínica, en un lugar.
            </h2>
            <p className="text-[15px] text-blue-200 leading-relaxed">
              Únete a las clínicas estéticas que ya digitalizaron su operación con SimpliClinic.
            </p>
          </div>

          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[13px] text-blue-100">
                <CheckCircle className="size-4 text-[#14B8A6] shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <div className="flex -space-x-2">
            {AVATARS.map((a) => (
              <div key={a} className="w-8 h-8 rounded-full border-2 border-[#0B132B] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB, #14B8A6)' }}>
                {a}
              </div>
            ))}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white">+120 clínicas activas</p>
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="w-2.5 h-2.5 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-blue-300 ml-auto leading-snug max-w-[120px]">"Setup en menos de una hora. Increíble."</p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <SimpliClinicLogo size={32} />
        </div>

        <div className="w-full max-w-[400px]">
          {success ? (
            <SuccessState />
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight">Crea tu cuenta gratis</h1>
                <p className="text-[14px] text-gray-500 mt-1">14 días sin costo · Sin tarjeta de crédito</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label htmlFor="nombre" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Tu nombre
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    autoComplete="name"
                    placeholder="Valentina Rojas"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Clínica */}
                <div>
                  <label htmlFor="clinica" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Nombre de tu clínica
                  </label>
                  <input
                    id="clinica"
                    name="clinica"
                    type="text"
                    autoComplete="organization"
                    placeholder="Clínica Bella Piel"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@clinica.com"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <span className="mt-0.5 shrink-0">⚠️</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:scale-100 shadow-lg shadow-blue-200 mt-2"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
                >
                  {loading ? (
                    <svg className="animate-spin size-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <>Crear cuenta gratis <ArrowRight className="size-4" /></>
                  )}
                </button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Al crear una cuenta aceptas nuestros{' '}
                  <a href="/terminos" target="_blank" className="text-[#2563EB] hover:underline">Términos de servicio</a>
                  {' '}y{' '}
                  <a href="/privacidad" target="_blank" className="text-[#2563EB] hover:underline">Política de privacidad</a>
                </p>
              </form>

              <p className="text-center text-[13px] text-gray-500 mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'linear-gradient(135deg, #2563EB15, #14B8A615)' }}>
        <Mail className="size-7 text-[#2563EB]" />
      </div>
      <h2 className="text-[22px] font-extrabold text-gray-900 mb-2">Revisa tu email</h2>
      <p className="text-[14px] text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
        Te enviamos un enlace de confirmación. Haz clic en el link para activar tu cuenta y comenzar.
      </p>
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-left mb-6">
        <p className="text-[12px] font-semibold text-blue-800 mb-1">¿No lo ves?</p>
        <p className="text-[12px] text-blue-700 leading-relaxed">
          Revisa la carpeta de spam o correo no deseado. El email llega desde <strong>hola@simpliclinic.cl</strong>
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
      >
        Ir a iniciar sesión <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
