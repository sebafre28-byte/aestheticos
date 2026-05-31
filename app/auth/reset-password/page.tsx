'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight, Eye, EyeOff } from "lucide-react"

function ClinicIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect x="1.5" y="1.5" width="33" height="33" rx="9" stroke="#2563EB" strokeWidth="2.8"/>
      <path d="M10.5 20.5 Q18 27 25.5 20.5" stroke="#2563EB" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="12" r="2.2" fill="#2563EB"/>
    </svg>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[20px] font-extrabold leading-none tracking-tight">
        <span style={{ color: '#0B132B' }}>Simpli</span>
        <span style={{ color: '#2563EB' }}>Clinic</span>
      </span>
      <ClinicIcon size={28} />
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard?message=Contraseña+actualizada+correctamente')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center px-5 py-12">

      <Link href="/login" className="absolute top-6 left-6 text-[13px] text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
        ← Volver al inicio de sesión
      </Link>

      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
          <div className="mb-7">
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Nueva contraseña</h1>
            <p className="text-[14px] text-gray-500 mt-1">Elige una contraseña segura para tu cuenta</p>
          </div>

          {!ready ? (
            <div className="text-[13px] text-gray-500 text-center py-4">
              Verificando enlace de recuperación...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
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

              <div>
                <label htmlFor="confirm" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                    className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                  <>Guardar contraseña <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
