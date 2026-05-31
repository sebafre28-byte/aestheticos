'use client'

import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight } from "lucide-react"

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

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    setSent(true)
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
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Recuperar contraseña</h1>
            <p className="text-[14px] text-gray-500 mt-1">Ingresa tu email y te enviaremos un enlace</p>
          </div>

          {sent ? (
            <div className="flex items-start gap-2 text-[13px] text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <span className="shrink-0 mt-0.5">✓</span>
              Si existe una cuenta con ese email, recibirás un enlace en los próximos minutos.
            </div>
          ) : (
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
                  <>Enviar instrucciones <ArrowRight className="size-4" /></>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[13px] text-gray-500 mt-5">
          <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
