"use client"

import { useEffect, useRef, useState } from "react"

type ChatMsg = {
  id: number
  rol: "usuario" | "agente" | "sistema"
  texto: string
}

function telefonoRandom(): string {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("")
  return `+569${digits}`
}

export default function AgenteTestChat() {
  const [telefono, setTelefono] = useState("+56900000001")
  const [mensajes, setMensajes] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [enviando, setEnviando] = useState(false)
  const nextId = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [mensajes, enviando])

  const agregar = (rol: ChatMsg["rol"], texto: string) => {
    setMensajes(prev => [...prev, { id: nextId.current++, rol, texto }])
  }

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || enviando) return
    setInput("")
    agregar("usuario", texto)
    setEnviando(true)
    try {
      const res = await fetch("/api/whatsapp/agente-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: texto, telefono }),
      })
      const data = await res.json()
      if (!res.ok) {
        agregar("sistema", `Error: ${data.error ?? res.statusText}`)
      } else if (data.respuesta) {
        agregar("agente", data.respuesta)
        if (data.escalado) agregar("sistema", "La conversación fue escalada a un humano.")
      } else {
        agregar("sistema", data.motivo ?? "El agente no respondió.")
      }
    } catch (e) {
      agregar("sistema", `Error de red: ${String(e)}`)
    } finally {
      setEnviando(false)
    }
  }

  const reiniciar = () => {
    setTelefono(telefonoRandom())
    setMensajes([])
    setInput("")
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <span className="text-violet-600 text-[13px]">🤖</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-800">Simulador del agente</p>
            <p className="text-[11px] text-gray-400">Paciente de prueba: {telefono}</p>
          </div>
        </div>
        <button
          onClick={reiniciar}
          className="h-7 px-2.5 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          Reiniciar conversación
        </button>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="h-[420px] overflow-y-auto bg-gray-50 px-4 py-4 space-y-2">
        {mensajes.length === 0 && (
          <div className="bg-violet-50 rounded-xl border border-violet-100 p-4 text-[12px] text-violet-900">
            Escribe un mensaje como si fueras un paciente por WhatsApp. El agente responderá aquí mismo, sin enviar mensajes reales.
          </div>
        )}
        {mensajes.map(m =>
          m.rol === "sistema" ? (
            <div key={m.id} className="flex justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-3 py-1">{m.texto}</span>
            </div>
          ) : (
            <div key={m.id} className={`flex ${m.rol === "usuario" ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-3.5 py-2 max-w-[80%] text-[13px] whitespace-pre-wrap shadow-sm rounded-xl ${
                  m.rol === "usuario"
                    ? "bg-violet-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                }`}
              >
                {m.texto}
              </div>
            </div>
          ),
        )}
        {enviando && (
          <div className="flex justify-start">
            <div className="bg-white rounded-xl rounded-tl-none px-3.5 py-2 shadow-sm border border-gray-100 text-[13px] text-gray-400 italic">
              escribiendo...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Escribe un mensaje de prueba..."
          disabled={enviando}
          className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50"
        />
        <button
          onClick={enviar}
          disabled={enviando || !input.trim()}
          className="h-9 px-4 rounded-lg bg-violet-600 text-[13px] font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
