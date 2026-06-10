"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Users,
  Syringe,
  MessageCircle,
  MessageSquare,
  BarChart2,
  Settings,
  LogOut,
  ChevronUp,
  User,
  CalendarDays,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getClinicaBasica } from "@/lib/onboarding/queries"
import { useRol, puedeAcceder } from "@/lib/auth/useRol"
import { rolLabel } from "@/lib/usuarios/queries"
import { NotificationBell } from "@/components/layout/NotificationBell"

const navItems: { href: string; label: string; icon: React.ElementType; modulo: string; proximamente?: boolean }[] = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, modulo: "dashboard" },
  { href: "/agenda",        label: "Agenda",        icon: Calendar,        modulo: "agenda" },
  { href: "/pacientes",     label: "Pacientes",     icon: Users,           modulo: "pacientes" },
  { href: "/servicios",     label: "Servicios",     icon: Syringe,         modulo: "servicios" },
  { href: "/whatsapp",      label: "WhatsApp",      icon: MessageCircle,   modulo: "whatsapp" },
  { href: "/inbox",         label: "Inbox",         icon: MessageSquare,   modulo: "inbox" },
  { href: "/reportes",      label: "Reportes",      icon: BarChart2,       modulo: "reportes" },
  { href: "/configuracion", label: "Configuración", icon: Settings,        modulo: "configuracion" },
]

function LogoIcon() {
  return <Image src="/logo-icon.jpg" width={28} height={28} alt="SimpliClinic" className="rounded-lg" />
}

export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const { rol } = useRol()
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [inicialesUsuario, setInicialesUsuario] = useState('')
  const rolUsuario = rol ? rolLabel(rol) : ''
  const [logoClinica, setLogoClinica] = useState('')
  const [nombreClinica, setNombreClinica] = useState('')
  const [popoverAbierto, setPopoverAbierto] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const cargarClinica = () => {
    getClinicaBasica().then((c) => {
      if (c) {
        setLogoClinica(c.logo_url ?? '')
        setNombreClinica(c.nombre ?? '')
      }
    })
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const nombre = user.user_metadata?.nombre as string | undefined
      const email = user.email ?? ''
      const display = nombre || email.split('@')[0] || 'Usuario'
      setNombreUsuario(display)
      setInicialesUsuario(
        display.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? '').join('')
      )
    })
    cargarClinica()
    window.addEventListener('clinica-updated', cargarClinica)
    return () => window.removeEventListener('clinica-updated', cargarClinica)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverAbierto(false)
      }
    }
    if (popoverAbierto) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popoverAbierto])

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
        <div className="flex items-center gap-2.5 justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoClinica ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoClinica} width={28} height={28} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="logo" />
            ) : (
              <LogoIcon />
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-white leading-tight tracking-tight truncate">
                {nombreClinica || 'SimpliClinic'}
              </p>
              <p className="text-[10px] leading-tight" style={{ color: '#60A5FA' }}>
                Tu clínica, más simple.
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.filter(item => puedeAcceder(rol, item.modulo)).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          if (item.proximamente) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium cursor-default opacity-50"
                style={{ color: 'rgba(255,255,255,0.70)' }}
              >
                <Icon className="size-[15px] shrink-0 opacity-70" />
                {item.label}
                <span className="ml-auto text-[9px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">
                  Pronto
                </span>
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors group",
                isActive ? "text-white" : "hover:bg-white/10"
              )}
              style={
                isActive
                  ? { backgroundColor: '#2563EB', color: 'white' }
                  : { color: 'rgba(255,255,255,0.70)' }
              }
            >
              <Icon className={cn("size-[15px] shrink-0", !isActive && "opacity-70")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Separador */}
      <div className="mx-3 border-t border-white/10" />

      {/* Footer del usuario — popover */}
      <div className="px-3 py-3 relative" ref={popoverRef}>
        {/* Popover menu */}
        {popoverAbierto && (
          <div
            className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-white/10 overflow-hidden shadow-xl"
            style={{ backgroundColor: '#0F1D40' }}
          >
            <Link
              href="/mi-cuenta"
              onClick={() => setPopoverAbierto(false)}
              className="flex items-center gap-2.5 h-9 px-3 text-[13px] font-medium transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.80)' }}
            >
              <User className="size-[14px] shrink-0 opacity-70" />
              Mi perfil
            </Link>
            <Link
              href="/mi-cuenta?tab=google"
              onClick={() => setPopoverAbierto(false)}
              className="flex items-center gap-2.5 h-9 px-3 text-[13px] font-medium transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.80)' }}
            >
              <CalendarDays className="size-[14px] shrink-0 opacity-70" />
              Google Calendar
            </Link>
            <Link
              href="/mi-cuenta?tab=seguridad"
              onClick={() => setPopoverAbierto(false)}
              className="flex items-center gap-2.5 h-9 px-3 text-[13px] font-medium transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.80)' }}
            >
              <Shield className="size-[14px] shrink-0 opacity-70" />
              Seguridad
            </Link>
            <div className="border-t border-white/10" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 h-9 px-3 text-[13px] font-medium transition-colors hover:bg-red-500/15"
              style={{ color: '#FCA5A5' }}
            >
              <LogOut className="size-[14px] shrink-0 opacity-70" />
              Cerrar sesión
            </button>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setPopoverAbierto(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
          >
            {inicialesUsuario || '…'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">
              {nombreUsuario || '…'}
            </p>
            <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {rolUsuario || 'Administrador'}
            </p>
          </div>
          <ChevronUp
            className="size-[14px] shrink-0 transition-transform duration-200"
            style={{
              color: 'rgba(255,255,255,0.40)',
              transform: popoverAbierto ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          />
        </button>
      </div>
    </aside>
  )
}
