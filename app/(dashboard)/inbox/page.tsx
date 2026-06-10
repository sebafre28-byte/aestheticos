'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, Phone, MoreVertical, Search, Archive, UserCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PlanGate } from '@/components/subscriptions/PlanGate'

// ─── Types ────────────────────────────────────────────────────

type Mensaje = {
  id: string
  direccion: 'entrante' | 'saliente'
  contenido: string
  created_at: string
  estado_whatsapp?: string
}

type Conversacion = {
  id: string
  telefono: string
  paciente_nombre: string | null
  estado: 'activa' | 'archivada' | 'spam' | 'humano'
  no_leidos: number
  ultimo_mensaje_at: string
  ultimo_mensaje: string
}

// ─── Helpers ──────────────────────────────────────────────────

function horaRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h`
  const dias = Math.floor(hrs / 24)
  return `${dias} d`
}

function iniciales(nombre: string | null, telefono: string): string {
  if (!nombre) return telefono.slice(-2)
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function colorAvatar(str: string): string {
  const colors = ['bg-blue-500', 'bg-teal-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ─── Components ───────────────────────────────────────────────

function ConversacionItem({
  conv,
  selected,
  onClick,
}: {
  conv: Conversacion
  selected: boolean
  onClick: () => void
}) {
  const avatarColor = colorAvatar(conv.telefono)
  const inicial = iniciales(conv.paciente_nombre, conv.telefono)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
        selected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-semibold`}>
        {inicial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {conv.paciente_nombre ?? conv.telefono}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{horaRelativa(conv.ultimo_mensaje_at)}</span>
        </div>
        {!conv.paciente_nombre && (
          <p className="text-xs text-gray-400 mb-0.5">{conv.telefono}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate">{conv.ultimo_mensaje}</p>
          {conv.no_leidos > 0 && (
            <span className="flex-shrink-0 ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {conv.no_leidos}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function BurbujaMensaje({ msg }: { msg: Mensaje }) {
  const esSaliente = msg.direccion === 'saliente'
  return (
    <div className={`flex ${esSaliente ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          esSaliente
            ? 'bg-[#2563EB] text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        <p>{msg.contenido}</p>
        <p className={`text-xs mt-1 ${esSaliente ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function InboxPage() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [seleccionada, setSeleccionada] = useState<Conversacion | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [texto, setTexto] = useState('')
  const [mostrarChat, setMostrarChat] = useState(false)
  const [cargandoConvs, setCargandoConvs] = useState(true)
  const [cargandoMsgs, setCargandoMsgs] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // Load conversations
  const cargarConversaciones = useCallback(async () => {
    const res = await fetch('/api/inbox/conversaciones')
    if (!res.ok) return
    const data = await res.json() as Conversacion[]
    setConversaciones(data)
    setCargandoConvs(false)
  }, [])

  useEffect(() => {
    cargarConversaciones()
  }, [cargarConversaciones])

  // Load messages when conversation selected
  const seleccionarConversacion = useCallback(async (conv: Conversacion) => {
    setSeleccionada(conv)
    setMostrarChat(true)
    setCargandoMsgs(true)
    setMensajes([])

    const [msgsRes] = await Promise.all([
      fetch(`/api/inbox/mensajes?conversacion_id=${conv.id}`),
      // Mark as read
      conv.no_leidos > 0
        ? fetch('/api/inbox/leido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversacion_id: conv.id }),
          })
        : Promise.resolve(),
    ])

    if (msgsRes.ok) {
      const data = await msgsRes.json() as Mensaje[]
      setMensajes(data)
    }
    setCargandoMsgs(false)

    // Update local no_leidos count
    setConversaciones(prev => prev.map(c => c.id === conv.id ? { ...c, no_leidos: 0 } : c))
  }, [])

  // Realtime subscription for new messages
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_inbox',
        },
        (payload) => {
          const nuevo = payload.new as Mensaje & { conversacion_id: string }

          // Add to current chat if it belongs to selected conversation
          setSeleccionada(prev => {
            if (prev?.id === nuevo.conversacion_id) {
              setMensajes(msgs => {
                // Avoid duplicates (optimistic insert already added it)
                if (msgs.some(m => m.id === nuevo.id)) return msgs
                return [...msgs, nuevo]
              })
            }
            return prev
          })

          // Update conversation list: bump ultimo_mensaje_at and no_leidos
          setConversaciones(prev => {
            const updated = prev.map(c => {
              if (c.id !== nuevo.conversacion_id) return c
              return {
                ...c,
                ultimo_mensaje: nuevo.contenido,
                ultimo_mensaje_at: nuevo.created_at,
                no_leidos: nuevo.direccion === 'entrante' ? c.no_leidos + 1 : c.no_leidos,
              }
            })
            // Sort by ultimo_mensaje_at desc
            return [...updated].sort((a, b) =>
              new Date(b.ultimo_mensaje_at).getTime() - new Date(a.ultimo_mensaje_at).getTime()
            )
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleEnviar() {
    if (!texto.trim() || !seleccionada || enviando) return
    const contenido = texto.trim()
    setTexto('')
    setEnviando(true)

    // Optimistic insert
    const tempMsg: Mensaje = {
      id: `temp-${Date.now()}`,
      direccion: 'saliente',
      contenido,
      created_at: new Date().toISOString(),
      estado_whatsapp: 'pendiente',
    }
    setMensajes(prev => [...prev, tempMsg])

    const res = await fetch('/api/inbox/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversacion_id: seleccionada.id, contenido }),
    })
    const json = await res.json() as { ok: boolean; mensaje?: Mensaje }

    // Replace temp with real message
    if (json.mensaje) {
      setMensajes(prev => prev.map(m => m.id === tempMsg.id ? json.mensaje! : m))
    }

    setEnviando(false)
  }

  const filtradas = conversaciones.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      c.paciente_nombre?.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      c.ultimo_mensaje.toLowerCase().includes(q)
    )
  })

  const avatarColor = seleccionada ? colorAvatar(seleccionada.telefono) : 'bg-gray-400'
  const inicial = seleccionada ? iniciales(seleccionada.paciente_nombre, seleccionada.telefono) : ''

  return (
    <PlanGate feature="inbox">
    <div className="relative flex h-[calc(100dvh-3.5rem)] md:h-screen bg-white overflow-hidden">
      {/* ── Left: conversation list ── */}
      <div className={`${mostrarChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900 mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {cargandoConvs ? (
            <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
              <MessageSquare className="w-8 h-8" />
              <span>{busqueda ? 'Sin resultados' : 'Sin conversaciones'}</span>
            </div>
          ) : (
            filtradas.map(conv => (
              <ConversacionItem
                key={conv.id}
                conv={conv}
                selected={seleccionada?.id === conv.id}
                onClick={() => seleccionarConversacion(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: chat panel ── */}
      {seleccionada ? (
        <div className={`${!mostrarChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button onClick={() => setMostrarChat(false)} className="md:hidden mr-2 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-semibold`}>
                {inicial}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {seleccionada.paciente_nombre ?? seleccionada.telefono}
                </p>
                <p className="text-xs text-gray-400">{seleccionada.telefono}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Llamar">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Asignar">
                <UserCheck className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Archivar">
                <Archive className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Más opciones">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner: conversación escalada por el agente IA */}
          {seleccionada.estado === 'humano' && (
            <div className="px-6 py-2 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
              <p className="text-xs text-violet-800">
                🤖 El agente IA derivó esta conversación a tu equipo. El agente no responderá hasta que la devuelvas.
              </p>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.from('conversaciones').update({ estado: 'activa' }).eq('id', seleccionada.id)
                  setConversaciones(prev => prev.map(c => c.id === seleccionada.id ? { ...c, estado: 'activa' as const } : c))
                  setSeleccionada(prev => prev ? { ...prev, estado: 'activa' as const } : prev)
                }}
                className="text-xs font-medium text-violet-700 hover:text-violet-900 underline whitespace-nowrap ml-3"
              >
                Devolver al agente IA
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
            {cargandoMsgs ? (
              <div className="flex items-center justify-center h-32 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando mensajes...</span>
              </div>
            ) : mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
                <MessageSquare className="w-8 h-8" />
                <span>Sin mensajes aún</span>
              </div>
            ) : (
              mensajes.map(msg => <BurbujaMensaje key={msg.id} msg={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-3">
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEnviar()
                  }
                }}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 leading-relaxed"
                style={{ overflowY: 'auto' }}
              />
              <button
                onClick={handleEnviar}
                disabled={!texto.trim() || enviando}
                className="flex-shrink-0 bg-[#2563EB] text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <MessageSquare className="w-12 h-12" />
          <p className="text-sm">Selecciona una conversación</p>
        </div>
      )}
    </div>
    </PlanGate>
  )
}
