'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type SyncMode = 'push_only' | 'pull_only' | 'bidirectional'

const SYNC_OPTIONS: { value: SyncMode; label: string; desc: string }[] = [
  { value: 'push_only',      label: 'Solo exportar',    desc: 'Tus citas de SimpliClinic aparecen en Google Calendar' },
  { value: 'pull_only',      label: 'Solo importar',    desc: 'Tus eventos de Google bloquean horarios en la agenda' },
  { value: 'bidirectional',  label: 'Bidireccional',    desc: 'Ambas opciones activas' },
]

function Feedback({ f }: { f: { tipo: 'ok' | 'error'; msg: string } | null }) {
  if (!f) return null
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-5 ${
      f.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
    }`}>
      {f.tipo === 'ok' ? '✓' : '✕'} {f.msg}
    </div>
  )
}

export default function MiCuentaPage() {
  const [conectado, setConectado] = useState(false)
  const [syncMode, setSyncMode] = useState<SyncMode>('push_only')
  const [cargando, setCargando] = useState(true)
  const [desconectando, setDesconectando] = useState(false)
  const [guardandoMode, setGuardandoMode] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const google = params.get('google')
    if (google === 'success') setFeedback({ tipo: 'ok', msg: 'Google Calendar conectado correctamente.' })
    else if (google === 'error') setFeedback({ tipo: 'error', msg: 'No se pudo conectar con Google Calendar. Intenta nuevamente.' })

    fetch('/api/auth/google/status')
      .then(r => r.json())
      .then((data: { connected: boolean; token: { sync_mode?: SyncMode } | null }) => {
        setConectado(data.connected)
        if (data.token?.sync_mode) setSyncMode(data.token.sync_mode)
        setCargando(false)
      })
      .catch(() => setCargando(false))
  }, [])

  async function desconectar() {
    setDesconectando(true)
    const res = await fetch('/api/auth/google/disconnect', { method: 'DELETE' })
    setDesconectando(false)
    if (res.ok) {
      setConectado(false)
      setFeedback({ tipo: 'ok', msg: 'Google Calendar desconectado.' })
    } else {
      setFeedback({ tipo: 'error', msg: 'No se pudo desconectar.' })
    }
  }

  async function cambiarSyncMode(mode: SyncMode) {
    setSyncMode(mode)
    setGuardandoMode(true)
    const res = await fetch('/api/auth/google/sync-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_mode: mode }),
    })
    setGuardandoMode(false)
    if (!res.ok) setFeedback({ tipo: 'error', msg: 'No se pudo actualizar el modo de sincronización.' })
  }

  if (cargando) return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-5 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-[#0B132B] mb-1">Mi cuenta</h1>
      <p className="text-sm text-slate-500 mb-6">Configura tus preferencias personales</p>

      <Feedback f={feedback} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Google Calendar</h2>
          <p className="text-sm text-slate-500 mb-4">Sincroniza tus citas con tu calendario personal de Google</p>

          {/* Estado de conexión */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                  <path d="M6.3 14.7l7.4 5.4C15.5 16 19.4 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
                  <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 36.7 26.9 37.5 24 37.5c-5.8 0-10.6-3.9-12.4-9.2l-7.3 5.7C7.9 41.3 15.4 46 24 46z" fill="#4CAF50"/>
                  <path d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.6 5.6C41.1 37.3 44.5 31.1 44.5 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {conectado ? 'Conectado a Google Calendar' : 'Google Calendar no conectado'}
                </p>
                <p className="text-xs text-slate-500">
                  {conectado ? 'Tus citas se sincronizan automáticamente' : 'Conecta para sincronizar tus citas'}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                conectado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {conectado ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>

          {conectado ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Modo de sincronización
                  {guardandoMode && <span className="ml-2 text-xs text-slate-400">Guardando…</span>}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SYNC_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => cambiarSyncMode(opt.value)}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        syncMode === opt.value
                          ? 'border-[#2563EB] bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        syncMode === opt.value ? 'border-[#2563EB]' : 'border-slate-300'
                      }`}>
                        {syncMode === opt.value && <div className="size-2 rounded-full bg-[#2563EB]" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={desconectar}
                disabled={desconectando}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {desconectando ? <Loader2 className="size-3.5 animate-spin" /> : '✕'}
                Desconectar
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                <path d="M6.3 14.7l7.4 5.4C15.5 16 19.4 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
                <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 36.7 26.9 37.5 24 37.5c-5.8 0-10.6-3.9-12.4-9.2l-7.3 5.7C7.9 41.3 15.4 46 24 46z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.6 5.6C41.1 37.3 44.5 31.1 44.5 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
              </svg>
              Conectar con Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
