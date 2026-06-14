'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldOff } from 'lucide-react'

export default function ClinicaBloqueada() {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="size-7 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Cuenta desactivada</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Tu cuenta ha sido desactivada. Si crees que esto es un error, contacta a soporte.
        </p>
        <a
          href="mailto:soporte@simpliclinic.cl"
          className="block w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors mb-3"
        >
          Contactar soporte
        </a>
        <button
          onClick={logout}
          className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
