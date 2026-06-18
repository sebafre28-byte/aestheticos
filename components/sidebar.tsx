"use client"

import { useState, useEffect, useRef, useId } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart2,
  Settings,
  LogOut,
  User,
  ChevronUp,
  Shield,
  CalendarDays,
  Wallet,
  MessageCircle,
  ClipboardCheck,
  Scissors,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getClinicaBasica } from "@/lib/onboarding/queries"
import { useRol, puedeAcceder } from "@/lib/auth/useRol"
import { rolLabel } from "@/lib/usuarios/queries"
import { NotificationBell } from "@/components/layout/NotificationBell"

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  modulo: string
  badge?: 'whatsapp' | 'pendientes'
  proximamente?: boolean
}

type NavGroup = {
  label?: string    // undefined = no separator label
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    // Operación diaria — sin label, van primero
    items: [
      { href: "/agenda",    label: "Agenda",    icon: Calendar,       modulo: "agenda" },
      { href: "/pacientes", label: "Pacientes", icon: Users,          modulo: "pacientes" },
      { href: "/inbox",     label: "WhatsApp",  icon: MessageCircle,  modulo: "inbox",       badge: 'whatsapp' },
      { href: "/pendientes",label: "Pendientes",icon: ClipboardCheck, modulo: "agenda",      badge: 'pendientes' },
      { href: "/caja",      label: "Caja",      icon: Wallet,         modulo: "caja" },
      { href: "/servicios", label: "Servicios", icon: Scissors,       modulo: "servicios" },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, modulo: "dashboard" },
      { href: "/reportes",  label: "Reportes",  icon: BarChart2,       modulo: "reportes" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracion", label: "Configuración", icon: Settings, modulo: "configuracion" },
    ],
  },
]

// ─── Badge hook ───────────────────────────────────────────────────────────────

function useBadgeCounts() {
  const id = useId()
  const [whatsapp, setWhatsapp] = useState(0)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function cargar() {
      const [{ data: convs }, { count: citasCount }] = await Promise.all([
        supabase
          .from('conversaciones')
          .select('no_leidos')
          .gt('no_leidos', 0),
        supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
          .gte('inicio', new Date().toISOString()),
      ])
      const totalWa = (convs ?? []).reduce((acc, c) => acc + (c.no_leidos ?? 0), 0)
      setWhatsapp(totalWa)
      setPendientes(citasCount ?? 0)
    }

    cargar()

    const channel = supabase
      .channel(`sidebar-badges-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversaciones' }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, cargar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  return { whatsapp, pendientes }
}

// ─── Badge component ──────────────────────────────────────────────────────────

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function LogoIcon() {
  return <Image src="/logo-icon.jpg" width={28} height={28} alt="SimpliClinic" className="rounded-lg" />
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

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
  const badges = useBadgeCounts()

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

  function getBadgeCount(badge?: 'whatsapp' | 'pendientes') {
    if (badge === 'whatsapp') return badges.whatsapp
    if (badge === 'pendientes') return badges.pendientes
    return 0
  }

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full"
      style={{ backgroundColor: '#0B132B' }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 justify-between">
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          {logoClinica ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoClinica} width={28} height={28} className="w-7 h-7 rounded-lg object-cover" alt="logo" />
          ) : (
            <LogoIcon />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-white leading-tight tracking-tight truncate">
              {nombreClinica || 'SimpliClinic'}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: '#60A5FA' }}>
              Tu clínica, más simple.
            </p>
          </div>
          <div className="hidden md:block">
            <NotificationBell dark />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => puedeAcceder(rol, item.modulo))
          if (visibleItems.length === 0) return null
          return (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const badgeCount = getBadgeCount(item.badge)

                  if (item.proximamente) {
                    return (
                      <div key={item.href} className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium cursor-default opacity-50" style={{ color: 'rgba(255,255,255,0.70)' }}>
                        <Icon className="size-[15px] shrink-0 opacity-70" />
                        {item.label}
                        <span className="ml-auto text-[9px] font-semibold bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full">Pronto</span>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors group",
                        isActive ? "text-white" : "hover:bg-white/10"
                      )}
                      style={isActive ? { backgroundColor: '#2563EB', color: 'white' } : { color: 'rgba(255,255,255,0.70)' }}
                    >
                      <Icon className={cn("size-[15px] shrink-0", !isActive && "opacity-70")} />
                      {item.label}
                      <Badge count={badgeCount} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Separador */}
      <div className="mx-3 border-t border-white/10" />

      {/* Footer usuario */}
      <div className="px-3 py-3 relative" ref={popoverRef}>
        {popoverAbierto && (
          <div className="absolute bottom-full left-0 right-0 mx-0 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{nombreUsuario}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{rolUsuario || 'Administrador'}</p>
            </div>
            <div className="py-1">
              <Link href="/mi-cuenta" onClick={() => setPopoverAbierto(false)} className="flex items-center gap-2.5 h-9 px-4 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="size-[14px] text-gray-400 shrink-0" />
                Mi perfil
              </Link>
              <Link href="/mi-cuenta?tab=google" onClick={() => setPopoverAbierto(false)} className="flex items-center gap-2.5 h-9 px-4 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                <CalendarDays className="size-[14px] text-gray-400 shrink-0" />
                Google Calendar
              </Link>
              <Link href="/mi-cuenta?tab=seguridad" onClick={() => setPopoverAbierto(false)} className="flex items-center gap-2.5 h-9 px-4 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                <Shield className="size-[14px] text-gray-400 shrink-0" />
                Seguridad
              </Link>
            </div>
            <div className="border-t border-gray-100 py-1">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 h-9 px-4 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
                <LogOut className="size-[14px] shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setPopoverAbierto(v => !v)}
          className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors", popoverAbierto ? "bg-white/10" : "hover:bg-white/10")}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
            {inicialesUsuario || '…'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{nombreUsuario || '…'}</p>
            <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.50)' }}>{rolUsuario || 'Administrador'}</p>
          </div>
          <ChevronUp className={cn("size-3.5 shrink-0 transition-transform", !popoverAbierto && "rotate-180")} style={{ color: 'rgba(255,255,255,0.40)' }} />
        </button>
      </div>
    </aside>
  )
}
