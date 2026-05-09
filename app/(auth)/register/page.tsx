import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
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
        <p className="text-[13px] text-gray-500 mt-0.5">Comienza gratis — sin tarjeta de crédito</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-5">Registra tu clínica</h2>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="clinica" className="block text-[13px] font-medium text-gray-700">
              Nombre de la clínica
            </label>
            <input
              id="clinica"
              name="clinica"
              type="text"
              autoComplete="organization"
              placeholder="Clínica Bella"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@miclinica.com"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="telefono" className="block text-[13px] font-medium text-gray-700">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              placeholder="+56 9 1234 5678"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13px] font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-colors bg-white"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-[13px] font-medium rounded-lg border-0 mt-2 text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
          >
            Crear cuenta gratis
          </Button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          Al crear una cuenta, aceptas nuestros{" "}
          <a href="#" className="text-[#7C3AED] hover:underline">
            Términos de servicio
          </a>{" "}
          y{" "}
          <a href="#" className="text-[#7C3AED] hover:underline">
            Política de privacidad
          </a>
        </p>
      </div>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#7C3AED] font-semibold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
