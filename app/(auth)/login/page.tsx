'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setError('Debes confirmar tu email antes de iniciar sesión.')
      } else {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
        >
          <span className="text-white font-bold text-[15px]">A</span>
        </div>
        <h1 className="text-[17px] font-semibold text-gray-900">AestheticOS</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Gestión inteligente para tu clínica</p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-7 pt-7 pb-5">
          <h2 className="text-[15px] font-semibold text-gray-900">Iniciar sesión</h2>
        </CardHeader>

        <CardContent className="px-7 pb-7">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@clinica.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] text-gray-700">
                  Contraseña
                </Label>
                <a href="#" className="text-[12px] text-[#7C3AED] hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[13px] font-medium rounded-lg border-0 mt-1 text-white disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        ¿Sin cuenta?{" "}
        <Link href="/register" className="text-[#7C3AED] font-semibold hover:underline">
          Registra tu clínica
        </Link>
      </p>
    </div>
  )
}
