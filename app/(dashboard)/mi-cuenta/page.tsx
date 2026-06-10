'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  User, CalendarDays, Shield, Check, AlertCircle, Loader2,
  ExternalLink, RefreshCw, Unlink, Upload, Download, ArrowLeftRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tab = 'perfil' | 'google' | 'seguridad'
type SyncMode = 'exportar' | 'importar' | 'bidireccional'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',    label: 'Mi perfil',       icon: User },
  { id: 'google',   label: 'Google Calendar', icon: CalendarDays },
  { id: 'seguridad', label: 'Seguridad',       icon: Shield },
]

const SYNC_MODES: { id: SyncMode; label: string; descripcion: string; icon: React.ElementType }[] = [
  {
    id: 'exportar',
    label: 'Solo exportar',
    descripcion: 'Las citas de SimpliClinic aparecen en tu Google Calendar',
    icon: Upload,
  },
  {
    id: 'importar',
    label: 'Solo importar',
    descripcion: 'Los eventos de Google bloquean horarios en la agenda',
    icon: Download,
  },
  {
    id: 'bidireccional',
    label: 'Bidireccional',
    descripcion: 'Ambas opciones activas al mismo tiempo',
    icon: ArrowLeftRight,
  },
]

type GCalStatus = {
  conectado: boolean
  calendarId?: string
  syncMode?: SyncMode
}

type Mensaje = { tipo: 'ok' | 'error'; texto: string }

function MiCuentaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'perfil')

  // Perfil
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajePerfil, setMensajePerfil] = useState<Mensaje | null>(null)

  // Google Calendar
  const [gcalStatus, setGcalStatus] = useState<GCalStatus | null>(null)
  const [gcalLoading, setGcalLoading] = useState(true)
  const [syncMode, setSyncMode] = useState<SyncMode>('exportar')
  const [guardandoModo, setGuardandoModo] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [mensajeGcal, setMensajeGcal] = useState<Mensaje | null>(null)

  // Seguridad
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [mensajePass, setMensajePass] = useState<Mensaje | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setNombre(user.user_metadata?.nombre ?? '')
    })
  }, [])

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null
    if (t) setTab(t)
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'connected') setMensajeGcal({ tipo: 'ok', texto: 'Google Calendar conectado exitosamente.' })
    if (error) {
      const msgs: Record<string, string> = {
        cancelled: 'Conexión cancelada.',
        config: 'GOOGLE_CLIENT_ID/SECRET no configurados en el servidor.',
        token: 'Error al obtener tokens de Google.',
        save: 'Error al guardar la conexión.',
        clinica: 'No se encontró la clínica asociada.',
      }
      setMensajeGcal({ tipo: 'error', texto: msgs[error] ?? 'Error desconocido.' })
    }
  }, [searchParams])

  useEffect(() => {
    if (tab !== 'google') return
    setGcalLoading(true)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setGcalLoading(false); return }
      const { data } = await supabase
        .from('google_calendar_tokens')
        .select('calendar_id, sync_mode')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setGcalStatus({ conectado: true, calendarId: data.calendar_id, syncMode: data.sync_mode as SyncMode })
        setSyncMode((data.sync_mode as SyncMode) ?? 'exportar')
      } else {
        setGcalStatus({ conectado: false })
      }
      setGcalLoading(false)
    })
  }, [tab])

  async function guardarPerfil() {
    setGuardando(true)
    setMensajePerfil(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { nombre } })
    if (error) setMensajePerfil({ tipo: 'error', texto: error.message })
    else setMensajePerfil({ tipo: 'ok', texto: 'Perfil actualizado.' })
    setGuardando(false)
  }

  async function guardarModo(modo: SyncMode) {
    setSyncMode(modo)
    setGuardandoModo(true)
    await fetch('/api/auth/google/sync-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncMode: modo }),
    })
    setGuardandoModo(false)
  }

  async function sincronizarAhora() {
    setSincronizando(true)
    setMensajeGcal(null)
    try {
      if (syncMode === 'exportar' || syncMode === 'bidireccional') {
        const res = await fetch('/api/auth/google/sync-all', { method: 'POST' })
        const json = await res.json() as { synced?: number; failed?: number; error?: string }
        if (!res.ok || json.error) {
          setMensajeGcal({ tipo: 'error', texto: json.error ?? 'Error al sincronizar.' })
          setSincronizando(false)
          return
        }
        if (syncMode === 'exportar') {
          setMensajeGcal({ tipo: 'ok', texto: `${json.synced} cita${json.synced !== 1 ? 's' : ''} exportada${json.synced !== 1 ? 's' : ''} a Google Calendar.` })
          setSincronizando(false)
          return
        }
      }
      if (syncMode === 'importar' || syncMode === 'bidireccional') {
        const res2 = await fetch('/api/auth/google/import-blocks', { method: 'POST' })
        const json2 = await res2.json() as { importados?: number; error?: string }
        if (!res2.ok || json2.error) {
          setMensajeGcal({ tipo: 'error', texto: json2.error ?? 'Error al importar.' })
        } else {
          setMensajeGcal({ tipo: 'ok', texto: syncMode === 'bidireccional'
            ? `Sincronización completa.`
            : `${json2.importados} evento${json2.importados !== 1 ? 's' : ''} de Google importado${json2.importados !== 1 ? 's' : ''} como bloqueos.`
          })
        }
      }
    } catch {
      setMensajeGcal({ tipo: 'error', texto: 'Error de red al sincronizar.' })
    }
    setSincronizando(false)
  }

  async function desconectarGoogle() {
    if (!confirm('¿Desconectar Google Calendar?')) return
    const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
    if (res.ok) {
      setGcalStatus({ conectado: false })
      setMensajeGcal({ tipo: 'ok', texto: 'Google Calendar desconectado.' })
    }
  }

  async function cambiarPassword() {
    if (passNueva !== passConfirm) {
      setMensajePass({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }
    if (passNueva.length < 8) {
      setMensajePass({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    setGuardandoPass(true)
    setMensajePass(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passNueva })
    if (error) setMensajePass({ tipo: 'error', texto: error.message })
    else {
      setMensajePass({ tipo: 'ok', texto: 'Contraseña actualizada.' })
      setPassNueva(''); setPassConfirm('')
    }
    setGuardandoPass(false)
  }

  function changeTab(t: Tab) {
    setTab(t)
    router.replace(`/mi-cuenta?tab=${t}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mi cuenta</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Gestiona tu perfil y preferencias personales</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon className="size-[14px]" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Perfil ── */}
        {tab === 'perfil' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-slate-800">Información personal</h2>
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-[11px] text-slate-400">El email no se puede cambiar desde aquí.</p>
            </div>
            {mensajePerfil && (
              <div className={`flex items-center gap-2 text-[13px] ${mensajePerfil.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {mensajePerfil.tipo === 'ok' ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                {mensajePerfil.texto}
              </div>
            )}
            <Button onClick={guardarPerfil} disabled={guardando} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {guardando && <Loader2 className="size-4 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </div>
        )}

        {/* ── Google Calendar ── */}
        {tab === 'google' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">Google Calendar</h2>
              <p className="text-[13px] text-slate-500 mt-1">
                Conecta una vez y elige cómo sincronizar tus citas.
              </p>
            </div>

            {mensajeGcal && (
              <div className={`flex items-start gap-2 text-[13px] rounded-xl p-3 ${mensajeGcal.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {mensajeGcal.tipo === 'ok' ? <Check className="size-4 mt-0.5 shrink-0" /> : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
                {mensajeGcal.texto}
              </div>
            )}

            {gcalLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-[13px]">Verificando conexión…</span>
              </div>
            ) : !gcalStatus?.conectado ? (
              /* ── No conectado ── */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[13px] font-medium text-slate-700">¿Cómo funciona?</p>
                  <ul className="text-[12px] text-slate-500 space-y-1 list-disc list-inside">
                    <li>Conecta con tu cuenta de Google una sola vez</li>
                    <li>Elige si quieres exportar, importar o ambas direcciones</li>
                    <li>Los cambios se sincronizan automáticamente</li>
                  </ul>
                </div>
                <a href="/api/auth/google/connect">
                  <Button className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                    <ExternalLink className="size-4 mr-2" />
                    Conectar con Google Calendar
                  </Button>
                </a>
              </div>
            ) : (
              /* ── Conectado ── */
              <div className="space-y-6">
                {/* Status pill */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="size-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-green-800">Conectado</p>
                    <p className="text-[11px] text-green-600">Calendario: {gcalStatus.calendarId ?? 'primary'}</p>
                  </div>
                </div>

                {/* Sync mode selector */}
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-slate-700">Modo de sincronización</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SYNC_MODES.map(m => {
                      const Icon = m.icon
                      const selected = syncMode === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => guardarModo(m.id)}
                          disabled={guardandoModo}
                          className={`relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${selected ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          {selected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
                              <Check className="size-2.5 text-white" />
                            </div>
                          )}
                          <Icon className={`size-4 ${selected ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                          <p className={`text-[12px] font-semibold leading-tight ${selected ? 'text-[#2563EB]' : 'text-slate-700'}`}>{m.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{m.descripcion}</p>
                        </button>
                      )
                    })}
                  </div>
                  {syncMode === 'importar' && (
                    <p className="text-[11px] text-slate-400">
                      Los eventos de Google se importan como bloqueos de horario para tu profesional vinculado.
                    </p>
                  )}
                  {syncMode === 'bidireccional' && (
                    <p className="text-[11px] text-slate-400">
                      Tus citas aparecen en Google Calendar y tus eventos de Google bloquean horarios en la agenda.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={sincronizarAhora}
                    disabled={sincronizando || importando}
                    variant="outline"
                    className="text-[13px]"
                  >
                    {sincronizando ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                    Sincronizar ahora
                  </Button>
                  <Button
                    onClick={desconectarGoogle}
                    variant="outline"
                    className="text-[13px] text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <Unlink className="size-4 mr-2" />
                    Desconectar
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400">
                  La sincronización automática ocurre al crear, editar o cancelar citas. Usa "Sincronizar ahora" para actualizar citas existentes.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Seguridad ── */}
        {tab === 'seguridad' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-slate-800">Cambiar contraseña</h2>
            <div className="space-y-1">
              <Label htmlFor="passNueva">Nueva contraseña</Label>
              <Input id="passNueva" type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="passConfirm">Confirmar contraseña</Label>
              <Input id="passConfirm" type="password" value={passConfirm} onChange={e => setPassConfirm(e.target.value)} />
            </div>
            {mensajePass && (
              <div className={`flex items-center gap-2 text-[13px] ${mensajePass.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {mensajePass.tipo === 'ok' ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                {mensajePass.texto}
              </div>
            )}
            <Button onClick={cambiarPassword} disabled={guardandoPass} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {guardandoPass && <Loader2 className="size-4 animate-spin mr-2" />}
              Cambiar contraseña
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MiCuentaPage() {
  return (
    <Suspense>
      <MiCuentaContent />
    </Suspense>
  )
}
