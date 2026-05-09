"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Settings,
  ChevronRight,
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-white border-r border-gray-100 h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
          >
            <span className="text-white text-[11px] font-bold leading-none">A</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">AestheticOS</p>
            <p className="text-[10px] text-gray-400 leading-tight">Clínica Bella</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors group",
                isActive
                  ? "bg-violet-50 text-[#7C3AED]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn(
                  "size-[15px] shrink-0 transition-colors",
                  isActive
                    ? "text-[#7C3AED]"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-2.5 border-t border-gray-100" />

      {/* User footer */}
      <div className="p-2.5 space-y-0.5">
        <button className="w-full flex items-center gap-2.5 h-10 px-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #10B981 100%)" }}
          >
            MG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
              María González
            </p>
            <p className="text-[11px] text-gray-400 truncate leading-tight">Administradora</p>
          </div>
          <ChevronRight className="size-3.5 text-gray-300 group-hover:text-gray-400 shrink-0" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors group"
        >
          <LogOut className="size-[15px] shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
