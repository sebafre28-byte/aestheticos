'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, CalendarPlus, CalendarX, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────

type Notificacion = {
  id: string
  tipo: 'reserva' | 'mensaje' | 'cancelacion'
  label: string
  href: string
  fecha: string // ISO timestamptz
}

type UsuarioInfo = {
  rol: string | null
  profesionalId: string | null
}

const LAST_SEEN_KEY = 'sc-notif-last-seen'
const POLL_MS = 60_000
const VENTANA_HORAS = 48

// ─── Helpers ──────────────────────────────────────────────────

function horaRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

function nombreRelacion(rel: { nombre: string } | { nombre: string }[] | null): string | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0]?.nombre ?? null : rel.nombre
}

async function getUsuarioInfo(): Promise<UsuarioInfo> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rol: null, profesionalId: null }

  const { data } = await supabase
    .from('usuarios_clinica')
    .select('rol, profesional_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    rol: data?.rol ?? null,
    profesionalId: data?.profesional_id ?? null,
  }
}

async function cargarNotificaciones(usuario: UsuarioInfo): Promise<Notificacion[]> {
  const supabase = createClient()
  const desde = new Date(Date.now() - VENTANA_HORAS * 3600_000).toISOString()
  const esProfesional = usuario.rol === 'profesional' && !!usuario.profesionalId

  let nuevasQuery = supabase
    .from('citas')
    .select('id, created_at, pacientes(nombre), servicios(nombre)')
    .eq('estado', 'pendiente')
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(15)

  let canceladasQuery = supabase
    .from('citas')
    .select('id, updated_at, pacientes(nombre)')
    .eq('estado', 'cancelada')
    .gte('updated_at', desde)
    .order('updated_at', { ascending: false })
    .limit(15)

  // Profesionales solo ven sus propias citas
  if (esProfesional) {
    nuevasQuery = nuevasQuery.eq('profesional_id', usuario.profesionalId!)
    canceladasQuery = canceladasQuery.eq('profesional_id', usuario.profesionalId!)
  }

  const [nuevas, noLeidas, canceladas] = await Promise.all([
    nuevasQuery,
    // Mensajes: profesionales solo ven conversaciones asignadas a ellos
    esProfesional
      ? supabase
          .from('conversaciones')
          .select('id, telefono, no_leidos, ultimo_mensaje_at, pacientes(nombre)')
          .gt('no_leidos', 0)
          .eq('asignado_a', usuario.profesionalId!)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(15)
      : supabase
          .from('conversaciones')
          .select('id, telefono, no_leidos, ultimo_mensaje_at, pacientes(nombre)')
          .gt('no_leidos', 0)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(15),
    canceladasQuery,
  ])

  const items: Notificacion[] = []

  for (const c of nuevas.data ?? []) {
    const paciente = nombreRelacion(c.pacientes) ?? 'Paciente'
    const servicio = nombreRelacion(c.servicios) ?? 'Servicio'
    items.push({
      id: `reserva-${c.id}`,
      tipo: 'reserva',
      label: `Nueva reserva: ${paciente} — ${servicio}`,
      href: '/agenda',
      fecha: c.created_at,
    })
  }

  for (const conv of noLeidas.data ?? []) {
    const nombre = nombreRelacion(conv.pacientes) ?? conv.telefono
    items.push({
      id: `mensaje-${conv.id}-${conv.no_leidos}`,
      tipo: 'mensaje',
      label: `${conv.no_leidos} ${conv.no_leidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'} de ${nombre}`,
      href: '/inbox',
      fecha: conv.ultimo_mensaje_at,
    })
  }

  for (const c of canceladas.data ?? []) {
    const paciente = nombreRelacion(c.pacientes) ?? 'Paciente'
    items.push({
      id: `cancelacion-${c.id}`,
      tipo: 'cancelacion',
      label: `Cita cancelada: ${paciente}`,
      href: '/agenda',
      fecha: c.updated_at,
    })
  }

  items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  return items.slice(0, 20)
}

// ─── Component ────────────────────────────────────────────────

const ICONOS = {
  reserva: { Icon: CalendarPlus, clase: 'bg-emerald-100 text-emerald-600' },
  mensaje: { Icon: MessageSquare, clase: 'bg-blue-100 text-blue-600' },
  cancelacion: { Icon: CalendarX, clase: 'bg-red-100 text-red-600' },
} as const

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [abierto, setAbierto] = useState(false)
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now()
    const v = window.localStorage.getItem(LAST_SEEN_KEY)
    return v ? Number(v) : 0
  })
  const [usuario, setUsuario] = useState<UsuarioInfo>({ rol: null, profesionalId: null })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getUsuarioInfo().then(setUsuario)
  }, [])

  const refrescar = useCallback(() => {
    if (usuario.rol === null) return // esperar a que cargue el rol
    cargarNotificaciones(usuario)
      .then(setNotificaciones)
      .catch(() => { /* silencioso: sin sesión o sin red */ })
  }, [usuario])

  // Carga inicial + polling cada 60s
  useEffect(() => {
    refrescar()
    const interval = setInterval(refrescar, POLL_MS)
    return () => clearInterval(interval)
  }, [refrescar])

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  const nuevas = notificaciones.filter(n => new Date(n.fecha).getTime() > lastSeen).length

  function toggle() {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente) {
      const ahora = Date.now()
      setLastSeen(ahora)
      window.localStorage.setItem(LAST_SEEN_KEY, String(ahora))
      refrescar()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        className={`relative w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${
          dark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={nuevas > 0 ? `Notificaciones (${nuevas} nuevas)` : 'Notificaciones'}
      >
        <Bell className="size-5" />
        {nuevas > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {nuevas > 9 ? '9+' : nuevas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          {/* Backdrop móvil */}
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setAbierto(false)} />

          {/* Bottom sheet (móvil) / dropdown (desktop) */}
          <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[75vh] rounded-t-2xl bg-white shadow-2xl flex flex-col pb-safe md:inset-auto md:bottom-auto md:top-16 md:left-[228px] md:w-96 md:max-h-[28rem] md:rounded-xl md:border md:border-gray-200 md:pb-0 md:shadow-xl">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                  <Bell className="w-8 h-8" />
                  <p className="text-sm">No hay notificaciones nuevas</p>
                </div>
              ) : (
                notificaciones.map(n => {
                  const { Icon, clase } = ICONOS[n.tipo]
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setAbierto(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                    >
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${clase}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-gray-900 leading-snug">{n.label}</span>
                        <span className="block text-xs text-gray-400 mt-0.5">{horaRelativa(n.fecha)}</span>
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
