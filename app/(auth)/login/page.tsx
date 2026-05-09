import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
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

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-5">Iniciar sesión</h2>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@clinica.com"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[13px] font-medium text-gray-700">
                Contraseña
              </label>
              <a href="#" className="text-[12px] text-[#7C3AED] hover:underline font-medium">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-[13px] font-medium rounded-lg border-0 mt-1 text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
          >
            Iniciar sesión
          </Button>
        </form>
      </div>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        ¿Sin cuenta?{" "}
        <Link href="/register" className="text-[#7C3AED] font-semibold hover:underline">
          Registra tu clínica
        </Link>
      </p>
    </div>
  )
}
