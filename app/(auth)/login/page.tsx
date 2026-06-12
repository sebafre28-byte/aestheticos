'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { SimpliClinicLogo } from '@/components/ui/SimpliClinicLogo'


export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message.toLowerCase().includes('email not confirmed')
          ? 'Debes confirmar tu email antes de iniciar sesión.'
          : 'Credenciales incorrectas. Verifica tu email y contraseña.'
      )
      setLoading(false)
      return
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const isMarketingDomain = typeof window !== 'undefined' &&
      (window.location.hostname === 'simpliclinic.cl' || window.location.hostname === 'www.simpliclinic.cl')

    if (isMarketingDomain && appUrl && data.session) {
      const params = new URLSearchParams({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      window.location.href = `${appUrl}/auth/set-session?${params.toString()}`
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center px-5 py-12">

      {/* Back to landing */}
      <Link href="/" className="absolute top-6 left-6 text-[13px] text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
        ← Volver al inicio
      </Link>

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SimpliClinicLogo size={32} className="justify-center" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
          <div className="mb-7">
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Bienvenido de nuevo</h1>
            <p className="text-[14px] text-gray-500 mt-1">Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-[12px] text-[#2563EB] hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
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
              className="w-full h-12 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.01] disabled:opacity-60 disabled:scale-100 shadow-lg shadow-blue-200 mt-1"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              {loading ? (
                <svg className="animate-spin size-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <>Iniciar sesión <ArrowRight className="size-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-gray-500 mt-5">
          ¿Sin cuenta?{' '}
          <Link href="/register" className="text-[#2563EB] font-semibold hover:underline">
            Registra tu clínica gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
