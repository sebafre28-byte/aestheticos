"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/configuracion", label: "Configuración", icon: Settings },
]

// Ícono SimpliClinic: cruz médica en azul sobre fondo blanco
function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="white" />
      <rect x="13" y="7" width="6" height="18" rx="3" fill="#2563EB" />
      <rect x="7" y="13" width="18" height="6" rx="3" fill="#2563EB" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full"
      style={{ backgroundColor: '#0B132B' }}
    >
      {/* Logo SimpliClinic */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <LogoIcon />
          <div>
            <p className="text-[14px] font-bold text-white leading-tight tracking-tight">
              SimpliClinic
            </p>
            <p className="text-[10px] leading-tight" style={{ color: '#60A5FA' }}>
              Tu clínica, más simple.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors group",
                isActive
                  ? "text-white"
                  : "hover:bg-white/10"
              )}
              style={
                isActive
                  ? { backgroundColor: '#2563EB', color: 'white' }
                  : { color: 'rgba(255,255,255,0.70)' }
              }
            >
              <Icon
                className={cn("size-[15px] shrink-0", !isActive && "opacity-70")}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Separador */}
      <div className="mx-3 border-t border-white/10" />

      {/* Footer del usuario */}
      <div className="px-3 py-3 space-y-1">
        {/* Info del usuario */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
          >
            MG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">
              María González
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Administradora
            </p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors group"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'
            e.currentTarget.style.color = '#FCA5A5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          <LogOut className="size-[15px] shrink-0 opacity-70 group-hover:opacity-100" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
