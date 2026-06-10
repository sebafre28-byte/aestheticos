'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { User, CalendarDays, Shield, Check, AlertCircle, Loader2, ExternalLink, RefreshCw, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tab = 'perfil' | 'google' | 'seguridad'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',    label: 'Mi perfil',        icon: User },
  { id: 'google',   label: 'Google Calendar',  icon: CalendarDays },
  { id: 'seguridad', label: 'Seguridad',        icon: Shield },
]

type GCalStatus = {
  conectado: boolean
  calendarId?: string
  syncMode?: string
}

function MiCuentaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(tabParam ?? 'perfil')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajePerfil, setMensajePerfil] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [gcalStatus, setGcalStatus] = useState<GCalStatus | null>(null)
  const [gcalLoading, setGcalLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [mensajeGcal, setMensajeGcal] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [mensajePass, setMensajePass] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

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
    const gcalSuccess = searchParams.get('success')
    const gcalError = searchParams.get('error')
    if (gcalSuccess === 'connected') setMensajeGcal({ tipo: 'ok', texto: 'Google Calendar conectado exitosamente.' })
    if (gcalError) {
      const msgs: Record<string, string> = {
        cancelled: 'Conexión cancelada.',
        config: 'GOOGLE_CLIENT_ID/SECRET no configurados en el servidor.',
        token: 'Error al obtener tokens de Google.',
        save: 'Error al guardar la conexión.',
        clinica: 'No se encontró la clínica asociada.',
      }
      setMensajeGcal({ tipo: 'error', texto: msgs[gcalError] ?? 'Error desconocido.' })
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
      setGcalStatus({ conectado: !!data, calendarId: data?.calendar_id, syncMode: data?.sync_mode })
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

  async function desconectarGoogle() {
    if (!confirm('¿Desconectar Google Calendar?')) return
    const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
    if (res.ok) {
      setGcalStatus({ conectado: false })
      setMensajeGcal({ tipo: 'ok', texto: 'Google Calendar desconectado.' })
    }
  }

  async function sincronizarAhora() {
    setSincronizando(true)
    setMensajeGcal(null)
    try {
      const res = await fetch('/api/auth/google/sync-all', { method: 'POST' })
      const json = await res.json() as { synced?: number; failed?: number; error?: string }
      if (!res.ok || json.error) {
        setMensajeGcal({ tipo: 'error', texto: json.error ?? 'Error al sincronizar.' })
      } else {
        setMensajeGcal({ tipo: 'ok', texto: `${json.synced} cita${json.synced !== 1 ? 's' : ''} sincronizada${json.synced !== 1 ? 's' : ''}${json.failed ? ` (${json.failed} fallaron)` : ''}.` })
      }
    } catch {
      setMensajeGcal({ tipo: 'error', texto: 'Error de red al sincronizar.' })
    }
    setSincronizando(false)
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
      setPassActual(''); setPassNueva(''); setPassConfirm('')
    }
    setGuardandoPass(false)
  }

  function changeTab(t: Tab) {
    setTab(t)
    router.replace(`/mi-cuenta?tab=${t}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Mi cuenta</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200 p-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-[#2563EB] text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Icon className="size-[14px]" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Perfil */}
        {tab === 'perfil' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Información personal</h2>
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-[11px] text-slate-400">El email no se puede cambiar.</p>
            </div>
            {mensajePerfil && (
              <div className={`flex items-center gap-2 text-[13px] ${mensajePerfil.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {mensajePerfil.tipo === 'ok' ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                {mensajePerfil.texto}
              </div>
            )}
            <Button onClick={guardarPerfil} disabled={guardando} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
              {guardando ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Guardar cambios
            </Button>
          </div>
        )}

        {/* Google Calendar */}
        {tab === 'google' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800">Google Calendar</h2>
              <p className="text-[13px] text-slate-500 mt-1">
                Sincroniza tus citas con Google Calendar. Las citas se exportan automáticamente al crear, modificar o cancelar.
              </p>
            </div>

            {mensajeGcal && (
              <div className={`flex items-start gap-2 text-[13px] rounded-lg p-3 ${mensajeGcal.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {mensajeGcal.tipo === 'ok' ? <Check className="size-4 mt-0.5 shrink-0" /> : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
                {mensajeGcal.texto}
              </div>
            )}

            {gcalLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-[13px]">Verificando conexión…</span>
              </div>
            ) : gcalStatus?.conectado ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="size-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-green-800">Conectado</p>
                    <p className="text-[11px] text-green-600">Calendario: {gcalStatus.calendarId ?? 'primary'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={sincronizarAhora}
                    disabled={sincronizando}
                    variant="outline"
                    className="text-[13px]"
                  >
                    {sincronizando ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                    Sincronizar citas ahora
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
                  Las citas se sincronizan automáticamente al crearlas, editarlas o cancelarlas. Usa "Sincronizar ahora" para actualizar citas existentes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-[13px] font-medium text-slate-700">¿Cómo funciona?</p>
                  <ul className="text-[12px] text-slate-500 space-y-1 list-disc list-inside">
                    <li>Conecta una vez con tu cuenta de Google</li>
                    <li>Las citas nuevas aparecen automáticamente en tu Google Calendar</li>
                    <li>Los cambios y cancelaciones se reflejan en tiempo real</li>
                  </ul>
                </div>
                <a href="/api/auth/google/connect">
                  <Button className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                    <ExternalLink className="size-4 mr-2" />
                    Conectar con Google Calendar
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Seguridad */}
        {tab === 'seguridad' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Cambiar contraseña</h2>
            <div className="space-y-1">
              <Label htmlFor="passActual">Contraseña actual</Label>
              <Input id="passActual" type="password" value={passActual} onChange={e => setPassActual(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="passNueva">Nueva contraseña</Label>
              <Input id="passNueva" type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} />
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
              {guardandoPass ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
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
