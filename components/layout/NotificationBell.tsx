'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Calendar, MessageCircle, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type UsuarioInfo = { rol: string | null; profesionalId: string | null }

async function getUsuarioInfo(): Promise<UsuarioInfo> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { rol: null, profesionalId: null }
  const { data } = await supabase
    .from('usuarios_clinica')
    .select('rol, profesional_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return { rol: data?.rol ?? null, profesionalId: data?.profesional_id ?? null }
}

type Notificacion = {
  id: string
  tipo: 'cita' | 'mensaje'
  titulo: string
  descripcion: string
  href: string
  tiempo: string
}

async function cargarNotificaciones(usuario: UsuarioInfo): Promise<Notificacion[]> {
  const supabase = createClient()
  const esProfesional = usuario.rol === 'profesional' && !!usuario.profesionalId

  const hoy = format(new Date(), 'yyyy-MM-dd')
  const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')

  let citasQuery = supabase
    .from('citas')
    .select('id, inicio, estado, pacientes(nombre), profesionales(nombre)')
    .in('fecha', [hoy, manana])
    .eq('estado', 'pendiente')
    .order('inicio', { ascending: true })
    .limit(10)

  if (esProfesional) {
    citasQuery = citasQuery.eq('profesional_id', usuario.profesionalId!)
  }

  const { data: citas } = await citasQuery

  const notifs: Notificacion[] = (citas ?? []).map(c => {
    const pac = (c.pacientes as unknown as { nombre: string } | null)?.nombre ?? 'Paciente'
    const pro = (c.profesionales as unknown as { nombre: string } | null)?.nombre ?? ''
    const dt = parseISO(c.inicio)
    const dia = isToday(dt) ? 'Hoy' : isTomorrow(dt) ? 'Mañana' : format(dt, 'dd MMM', { locale: es })
    const hora = format(dt, 'HH:mm')
    return {
      id: `cita-${c.id}`,
      tipo: 'cita' as const,
      titulo: pac,
      descripcion: `${dia} ${hora}${pro ? ` · ${pro}` : ''}`,
      href: '/agenda',
      tiempo: dia,
    }
  })

  // Only show inbox messages for non-profesional roles
  if (!esProfesional) {
    let msgQuery = supabase
      .from('conversaciones')
      .select('id, paciente_nombre, ultimo_mensaje, updated_at, no_leidos')
      .gt('no_leidos', 0)
      .order('updated_at', { ascending: false })
      .limit(5)

    const { data: convs } = await msgQuery
    for (const c of (convs ?? [])) {
      notifs.push({
        id: `conv-${c.id}`,
        tipo: 'mensaje',
        titulo: c.paciente_nombre ?? 'Mensaje nuevo',
        descripcion: c.ultimo_mensaje ?? '',
        href: '/inbox',
        tiempo: c.updated_at ? format(parseISO(c.updated_at), 'HH:mm') : '',
      })
    }
  }

  return notifs
}

export function NotificationBell() {
  const [abierto, setAbierto] = useState(false)
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const total = notifs.length

  useEffect(() => {
    getUsuarioInfo().then(u => {
      setLoading(true)
      cargarNotificaciones(u).then(n => { setNotifs(n); setLoading(false) })
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    if (abierto) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [abierto])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="size-[18px]" />
        {total > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/10 shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: '#0F1D40' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-[13px] font-semibold text-white">Notificaciones</p>
            <button onClick={() => setAbierto(false)} className="text-white/40 hover:text-white/70">
              <X className="size-4" />
            </button>
          </div>

          {loading ? (
            <p className="text-[12px] text-white/50 text-center py-6">Cargando…</p>
          ) : notifs.length === 0 ? (
            <p className="text-[12px] text-white/50 text-center py-6">Sin notificaciones pendientes</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifs.map(n => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setAbierto(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.tipo === 'cita' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                    {n.tipo === 'cita'
                      ? <Calendar className="size-3.5 text-blue-400" />
                      : <MessageCircle className="size-3.5 text-green-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">{n.titulo}</p>
                    <p className="text-[11px] text-white/50 truncate">{n.descripcion}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
