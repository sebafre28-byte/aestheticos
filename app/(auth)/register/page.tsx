'use client'

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

// Ícono de la marca SimpliClinic
function LogoSimpliclinic() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="44" height="44" rx="12" fill="#2563EB" />
      <rect x="18" y="9" width="8" height="26" rx="4" fill="white" />
      <rect x="9" y="18" width="26" height="8" rx="4" fill="white" />
    </svg>
  )
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const clinica_nombre = formData.get('clinica') as string

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { clinica_nombre },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LogoSimpliclinic />
          <h1 className="text-[18px] font-bold text-gray-900 mt-3">SimpliClinic</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Tu clínica, más simple.</p>
        </div>

        <Card className="gap-0 py-0 shadow-sm border-gray-200">
          <CardContent className="px-7 py-7 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-2">Revisa tu email</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada para activar tu cuenta.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[13px] text-gray-500 mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <LogoSimpliclinic />
        <h1 className="text-[18px] font-bold text-gray-900 mt-3">SimpliClinic</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Tu clínica, más simple.</p>
      </div>

      <Card className="gap-0 py-0 shadow-sm border-gray-200">
        <CardHeader className="px-7 pt-7 pb-5">
          <h2 className="text-[15px] font-semibold text-gray-900">Registra tu clínica</h2>
        </CardHeader>

        <CardContent className="px-7 pb-7">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="clinica" className="text-[13px] text-gray-700">
                Nombre de la clínica
              </Label>
              <Input
                id="clinica"
                name="clinica"
                type="text"
                autoComplete="organization"
                placeholder="Clínica Bella"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@miclinica.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] text-gray-700">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[13px] font-medium rounded-lg border-0 mt-2 text-white disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
            Al crear una cuenta, aceptas nuestros{" "}
            <a href="#" className="text-[#2563EB] hover:underline">Términos de servicio</a>
            {" "}y{" "}
            <a href="#" className="text-[#2563EB] hover:underline">Política de privacidad</a>
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
