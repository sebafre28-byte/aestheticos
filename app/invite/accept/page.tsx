'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { SimpliClinicLogo } from '@/components/ui/SimpliClinicLogo'

export default function InviteAcceptPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [clinicaNombre, setClinicaNombre] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Parse hash params and set session manually if access_token is present
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data }) => {
        if (data.user) {
          setNombre(data.user.user_metadata?.nombre ?? '')
          setReady(true)
        }
      })
    } else {
      // Fallback: already signed in
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setNombre(user.user_metadata?.nombre ?? '')
          setReady(true)
        }
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setNombre(session.user.user_metadata?.nombre ?? '')
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirm = form.get('confirm') as string

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

    // Link auth user to usuarios_clinica row
    await fetch('/api/usuarios/activate', { method: 'POST' })

    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center px-5">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="size-16 text-emerald-500" />
          </div>
          <h1 className="text-[22px] font-extrabold text-gray-900">¡Bienvenido/a!</h1>
          <p className="text-[14px] text-gray-500">Tu cuenta está lista. Redirigiendo al dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center px-5 py-12">
      <Link href="/login" className="absolute top-6 left-6 text-[13px] text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
        ← Volver al inicio
      </Link>

      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <SimpliClinicLogo size={32} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
          <div className="mb-7">
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
              {nombre ? `¡Hola, ${nombre}!` : '¡Bienvenido/a!'}
            </h1>
            <p className="text-[14px] text-gray-500 mt-1">
              {clinicaNombre
                ? `Crea tu contraseña para unirte a ${clinicaNombre}.`
                : 'Crea tu contraseña para activar tu cuenta.'}
            </p>
          </div>

          {!ready ? (
            <div className="text-[13px] text-gray-400 text-center py-6">
              Verificando invitación…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50 focus:bg-white"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Activar mi cuenta <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
