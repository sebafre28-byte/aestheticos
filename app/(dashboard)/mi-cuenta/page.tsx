'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import {
  User, CalendarDays, Shield, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, X, ChevronDown, Check,
} from 'lucide-react'
import { useRol } from '@/lib/auth/useRol'
import { useProfesionalId } from '@/lib/auth/useProfesionalId'
import { createClient } from '@/lib/supabase/client'
import {
  getDisponibilidadProfesional, setDisponibilidadProfesional,
  type DisponibilidadRow,
} from '@/lib/agenda/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'perfil' | 'disponibilidad' | 'google' | 'seguridad'
type SyncMode = 'push_only' | 'pull_only' | 'bidirectional'
type GCalendar = { id: string; summary: string; backgroundColor?: string; primary: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Feedback({ f }: { f: { tipo: 'ok' | 'error'; msg: string } | null }) {
  if (!f) return null
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-[13px] ${f.tipo === 'ok' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-600'}`}>
      {f.tipo === 'ok' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {f.msg}
    </div>
  )
}

function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${activo ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${activo ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

const MEDIAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 rounded-lg border border-slate-200 bg-white px-2 pr-6 text-[12px] font-medium text-slate-700 focus:border-[#2563EB] focus:outline-none appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      {MEDIAS.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  )
}

const DIAS_SEMANA = [
  { num: 1, label: 'Lunes' }, { num: 2, label: 'Martes' }, { num: 3, label: 'Miércoles' },
  { num: 4, label: 'Jueves' }, { num: 5, label: 'Viernes' }, { num: 6, label: 'Sábado' }, { num: 7, label: 'Domingo' },
]

type DiaDisp = { dia_semana: number; activo: boolean; hora_inicio: string; hora_fin: string }

function buildVacia(): DiaDisp[] {
  return DIAS_SEMANA.map(d => ({ dia_semana: d.num, activo: d.num <= 5, hora_inicio: '09:00', hora_fin: '18:00' }))
}

// ─── Sección Perfil ───────────────────────────────────────────────────────────

function SeccionPerfil() {
  const { rol } = useRol()
  const profesionalId = useProfesionalId()
  const [nombre, setNombre] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [bio, setBio] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)
  const fotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const meta = user.user_metadata ?? {}
      setNombre((meta.nombre as string) ?? user.email?.split('@')[0] ?? '')
      // Si es profesional, cargar datos adicionales
      if (rol === 'profesional' && profesionalId) {
        const { data } = await supabase
          .from('profesionales')
          .select('especialidad, bio, foto_url')
          .eq('id', profesionalId)
          .single()
        if (data) {
          setEspecialidad(data.especialidad ?? '')
          setBio(data.bio ?? '')
          setFotoUrl(data.foto_url ?? '')
        }
      }
      setCargando(false)
    })
  }, [rol, profesionalId])

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profesionalId) return
    if (file.size > 5 * 1024 * 1024) { setFeedback({ tipo: 'error', msg: 'La imagen no debe superar 5 MB.' }); return }
    setSubiendoFoto(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const clinicaId = (await supabase.rpc('auth_clinica_id')).data as string
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${clinicaId}/${profesionalId}.${ext}`
    const { error } = await supabase.storage.from('profesionales').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setFeedback({ tipo: 'error', msg: 'No se pudo subir la foto.' }); setSubiendoFoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('profesionales').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`
    setFotoUrl(url)
    await supabase.from('profesionales').update({ foto_url: url }).eq('id', profesionalId)
    setSubiendoFoto(false)
    setFeedback({ tipo: 'ok', msg: 'Foto actualizada.' })
    setTimeout(() => setFeedback(null), 3000)
    void user
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    setFeedback(null)
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { nombre: nombre.trim() } })
    if (rol === 'profesional' && profesionalId) {
      await supabase.from('profesionales').update({
        nombre: nombre.trim(),
        especialidad: especialidad.trim() || null,
        bio: bio.trim() || null,
      }).eq('id', profesionalId)
    }
    setGuardando(false)
    setFeedback({ tipo: 'ok', msg: 'Perfil actualizado correctamente.' })
    setTimeout(() => setFeedback(null), 3000)
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  const initials = nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <form onSubmit={guardar} className="space-y-5">
      <Feedback f={feedback} />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-white text-[18px] font-bold"
          style={{ background: fotoUrl ? undefined : 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
          {fotoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={fotoUrl} alt="foto" className="w-full h-full object-cover" />
            : initials || '?'}
        </div>
        <div>
          {rol === 'profesional' && (
            <>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
              <button type="button" disabled={subiendoFoto} onClick={() => fotoRef.current?.click()}
                className="h-7 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5">
                {subiendoFoto ? <><Loader2 className="size-3 animate-spin" />Subiendo…</> : 'Cambiar foto'}
              </button>
              <p className="text-[11px] text-gray-400 mt-1">PNG o JPG · Máx 5 MB</p>
            </>
          )}
          {rol !== 'profesional' && (
            <p className="text-[12px] text-gray-500">Tu nombre visible en el sistema</p>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Nombre <span className="text-red-400">*</span></Label>
        <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo" className="h-9 text-[13px]" />
      </div>

      {/* Campos extra solo para profesional */}
      {rol === 'profesional' && (
        <>
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Especialidad</Label>
            <Input value={especialidad} onChange={e => setEspecialidad(e.target.value)} placeholder="Ej: Estética facial" className="h-9 text-[13px]" />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Bio</Label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Cuéntanos sobre ti…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" />
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

// ─── Sección Disponibilidad (solo profesional) ────────────────────────────────

function SeccionDisponibilidad({ profesionalId }: { profesionalId: string }) {
  const [dias, setDias] = useState<DiaDisp[]>(buildVacia())
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    getDisponibilidadProfesional(profesionalId).then((rows) => {
      if (rows.length > 0) {
        setDias(DIAS_SEMANA.map(d => {
          const row = rows.find(r => r.dia_semana === d.num)
          return row
            ? { dia_semana: d.num, activo: row.activo, hora_inicio: row.hora_inicio, hora_fin: row.hora_fin }
            : { dia_semana: d.num, activo: false, hora_inicio: '09:00', hora_fin: '18:00' }
        }))
      }
      setCargando(false)
    })
  }, [profesionalId])

  async function guardar() {
    setGuardando(true)
    setFeedback(null)
    const filas: DisponibilidadRow[] = dias.map(d => ({
      id: '', clinica_id: '', profesional_id: profesionalId,
      dia_semana: d.dia_semana, hora_inicio: d.hora_inicio, hora_fin: d.hora_fin, activo: d.activo,
    }))
    const ok = await setDisponibilidadProfesional(profesionalId, filas)
    setGuardando(false)
    if (ok) {
      setFeedback({ tipo: 'ok', msg: 'Disponibilidad guardada correctamente.' })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ tipo: 'error', msg: 'No se pudo guardar. Intenta nuevamente.' })
    }
  }

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <p className="text-[12px] text-gray-400 mb-4">Define los días y horarios en que estás disponible para atender.</p>
      <Feedback f={feedback} />
      <div className="space-y-2 mb-5">
        {dias.map(d => {
          const label = DIAS_SEMANA.find(x => x.num === d.dia_semana)?.label ?? ''
          return (
            <div key={d.dia_semana} className={`bg-gray-50 rounded-xl border border-gray-100 p-3 flex items-center gap-4 transition-opacity ${!d.activo ? 'opacity-60' : ''}`}>
              <Toggle activo={d.activo} onChange={() => setDias(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, activo: !x.activo } : x))} />
              <span className="w-24 text-[13px] font-medium text-gray-800 shrink-0">{label}</span>
              {d.activo ? (
                <div className="flex items-center gap-2 flex-1">
                  <TimeSelect value={d.hora_inicio} onChange={v => setDias(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, hora_inicio: v } : x))} />
                  <span className="text-[12px] text-gray-400">–</span>
                  <TimeSelect value={d.hora_fin} onChange={v => setDias(prev => prev.map(x => x.dia_semana === d.dia_semana ? { ...x, hora_fin: v } : x))} />
                </div>
              ) : (
                <span className="text-[12px] text-gray-400 flex-1">No trabajo este día</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={guardar} disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Guardar disponibilidad'}
        </Button>
      </div>
    </div>
  )
}

// ─── Sección Google Calendar ──────────────────────────────────────────────────

const SYNC_OPTIONS: { value: SyncMode; label: string; desc: string }[] = [
  { value: 'push_only', label: 'Exportar a Google Calendar', desc: 'Tus citas de SimpliClinic aparecen automáticamente en Google Calendar' },
]

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
    <path d="M6.3 14.7l7.4 5.4C15.5 16 19.4 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
    <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 36.7 26.9 37.5 24 37.5c-5.8 0-10.6-3.9-12.4-9.2l-7.3 5.7C7.9 41.3 15.4 46 24 46z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.6 5.6C41.1 37.3 44.5 31.1 44.5 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
  </svg>
)

function SeccionGoogleCalendar() {
  const [conectado, setConectado] = useState(false)
  const [tokenEmail, setTokenEmail] = useState<string | null>(null)
  const [tokenExpirado, setTokenExpirado] = useState(false)
  const [syncMode, setSyncMode] = useState<SyncMode>('push_only')
  const [cargando, setCargando] = useState(true)
  const [desconectando, setDesconectando] = useState(false)
  const [guardandoMode, setGuardandoMode] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)

  // Calendar selector
  const [calendarios, setCalendarios] = useState<GCalendar[]>([])
  const [calendarId, setCalendarId] = useState<string>('primary')
  const [cargandoCals, setCargandoCals] = useState(false)
  const [guardandoCal, setGuardandoCal] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'success') setFeedback({ tipo: 'ok', msg: 'Google Calendar conectado correctamente.' })
    else if (g === 'error') setFeedback({ tipo: 'error', msg: 'No se pudo conectar con Google Calendar. Intenta nuevamente.' })
    else if (g === 'no_refresh_token') setFeedback({ tipo: 'error', msg: 'No se recibió el token. Intenta desconectar y volver a conectar.' })

    fetch('/api/auth/google/status')
      .then(r => r.json())
      .then((data: { connected: boolean; token: { calendar_id?: string; sync_mode?: SyncMode; token_expiry?: number } | null }) => {
        setConectado(data.connected)
        setTokenEmail(data.token?.calendar_id ?? null)
        if (data.token?.sync_mode) setSyncMode(data.token.sync_mode)
        if (data.token?.calendar_id) setCalendarId(data.token.calendar_id)
        // Detect expired token (token_expiry is a Unix timestamp in ms)
        if (data.connected && data.token?.token_expiry) {
          setTokenExpirado(Date.now() > data.token.token_expiry)
        }
        setCargando(false)
        if (data.connected) cargarCalendarios()
      })
      .catch(() => setCargando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function cargarCalendarios() {
    setCargandoCals(true)
    try {
      const res = await fetch('/api/auth/google/calendars')
      if (res.ok) {
        const data = await res.json()
        setCalendarios(data.calendars ?? [])
        if (data.selected) setCalendarId(data.selected)
      }
    } finally {
      setCargandoCals(false)
    }
  }

  async function desconectar() {
    setDesconectando(true)
    const res = await fetch('/api/auth/google/disconnect', { method: 'DELETE' })
    setDesconectando(false)
    if (res.ok) { setConectado(false); setTokenEmail(null); setCalendarios([]); setFeedback({ tipo: 'ok', msg: 'Google Calendar desconectado.' }) }
    else setFeedback({ tipo: 'error', msg: 'No se pudo desconectar.' })
  }

  async function cambiarSyncMode(mode: SyncMode) {
    setSyncMode(mode)
    setGuardandoMode(true)
    await fetch('/api/auth/google/sync-mode', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sync_mode: mode }) })
    setGuardandoMode(false)
  }

  async function cambiarCalendario(id: string) {
    setCalendarId(id)
    setDropdownAbierto(false)
    setGuardandoCal(true)
    const res = await fetch('/api/auth/google/calendar-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar_id: id }),
    })
    setGuardandoCal(false)
    if (res.ok) setFeedback({ tipo: 'ok', msg: 'Calendario actualizado. Las próximas citas se sincronizarán aquí.' })
    else setFeedback({ tipo: 'error', msg: 'No se pudo actualizar el calendario.' })
  }

  const calSeleccionado = calendarios.find(c => c.id === calendarId)
  const nombreCal = calSeleccionado?.summary ?? (calendarId === 'primary' ? 'Calendario principal' : calendarId)

  if (cargando) return <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400"><Loader2 className="size-4 animate-spin" /> Cargando…</div>

  return (
    <div>
      <Feedback f={feedback} />
      <div className={`rounded-xl border p-4 mb-5 ${conectado ? 'bg-[#25D366]/5 border-[#25D366]/20' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
            <GoogleIcon size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">{conectado ? 'Conectado a Google Calendar' : 'Google Calendar no conectado'}</p>
            <p className="text-[12px] text-gray-500">{conectado ? (tokenEmail ?? 'Cuenta conectada') : 'Conecta para sincronizar tus citas automáticamente'}</p>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${conectado ? 'bg-emerald-50 text-[#10B981]' : 'bg-gray-100 text-gray-500'}`}>
            {conectado ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {conectado && tokenExpirado && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-amber-800">Tu conexión con Google Calendar expiró</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Las citas ya no se están sincronizando. Reconecta para restaurar la sincronización.</p>
          </div>
          <a
            href="/api/auth/google"
            className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold px-3 py-1.5 transition-colors"
          >
            Reconectar
          </a>
        </div>
      )}

      {conectado ? (
        <>
          {/* Selector de calendario */}
          <p className="text-[12px] font-semibold text-gray-700 mb-2">
            Calendario destino {guardandoCal && <span className="text-gray-400 font-normal ml-1">Guardando…</span>}
          </p>
          <div ref={dropdownRef} className="relative mb-5">
            <button
              type="button"
              onClick={() => setDropdownAbierto(v => !v)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-700 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {calSeleccionado?.backgroundColor && (
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: calSeleccionado.backgroundColor }} />
                )}
                <span className="truncate">{nombreCal}</span>
                {(calSeleccionado?.primary || calendarId === 'primary') && (
                  <span className="text-[11px] text-gray-400 shrink-0">· principal</span>
                )}
              </div>
              {cargandoCals
                ? <Loader2 className="size-3.5 animate-spin text-gray-400 shrink-0" />
                : <ChevronDown className="size-3.5 text-gray-400 shrink-0" />
              }
            </button>

            {dropdownAbierto && calendarios.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                {calendarios.map(cal => (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => cambiarCalendario(cal.id)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cal.backgroundColor ?? '#4285F4' }}
                    />
                    <span className="flex-1 truncate">{cal.summary}</span>
                    {cal.primary && <span className="text-[11px] text-gray-400">principal</span>}
                    {cal.id === calendarId && <Check className="size-3.5 text-[#2563EB] shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sincronización activa */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3 mb-5">
            <CheckCircle2 className="size-4 text-[#2563EB] shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-900">Exportar a Google Calendar</p>
              <p className="text-[11px] text-gray-500">Tus citas de SimpliClinic aparecen automáticamente en Google Calendar</p>
            </div>
            {guardandoMode && <Loader2 className="size-3.5 animate-spin text-gray-400 shrink-0" />}
          </div>
          <button onClick={desconectar} disabled={desconectando}
            className="h-9 px-4 rounded-lg border border-red-200 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center gap-2">
            {desconectando ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            Desconectar
          </button>
        </>
      ) : (
        <a href="/api/auth/google"
          className="inline-flex items-center gap-2.5 h-10 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <GoogleIcon size={16} />
          Conectar con Google Calendar
        </a>
      )}
    </div>
  )
}

// ─── Sección Seguridad ────────────────────────────────────────────────────────

function SeccionSeguridad() {
  const [mostrar, setMostrar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null)
  const [pw, setPw] = useState({ nueva: '', confirmar: '' })

  async function cambiar(e: React.FormEvent) {
    e.preventDefault()
    if (pw.nueva !== pw.confirmar) { setFeedback({ tipo: 'error', msg: 'Las contraseñas no coinciden.' }); return }
    if (pw.nueva.length < 8) { setFeedback({ tipo: 'error', msg: 'Mínimo 8 caracteres.' }); return }
    setGuardando(true)
    setFeedback(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: pw.nueva })
    setGuardando(false)
    if (error) setFeedback({ tipo: 'error', msg: error.message })
    else { setFeedback({ tipo: 'ok', msg: 'Contraseña actualizada correctamente.' }); setPw({ nueva: '', confirmar: '' }); setTimeout(() => setFeedback(null), 3000) }
  }

  return (
    <div>
      <p className="text-[12px] text-gray-400 mb-4">Actualiza tu contraseña de acceso al sistema.</p>
      <Feedback f={feedback} />
      <form onSubmit={cambiar} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Nueva contraseña</Label>
          <Input type="password" value={pw.nueva} onChange={e => setPw(p => ({ ...p, nueva: e.target.value }))} placeholder="Mínimo 8 caracteres" className="h-9 text-[13px]" />
        </div>
        <div>
          <Label className="mb-1.5 block text-[12px] font-medium text-gray-700">Confirmar contraseña</Label>
          <div className="relative">
            <Input type={mostrar ? 'text' : 'password'} value={pw.confirmar} onChange={e => setPw(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repetir contraseña" className="h-9 text-[13px] pr-9" />
            <button type="button" onClick={() => setMostrar(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={guardando} className="h-8 text-[13px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
            {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Actualizar contraseña'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Header de usuario ────────────────────────────────────────────────────────

function UserHeader() {
  const { rol } = useRol()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setNombre((user.user_metadata?.nombre as string) ?? user.email?.split('@')[0] ?? '')
      setEmail(user.email ?? '')
    })
  }, [])

  const rolLabels: Record<string, string> = { admin: 'Administrador', profesional: 'Profesional', recepcionista: 'Coordinador/a' }
  const initials = nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shrink-0">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
        {initials || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-900 leading-tight">{nombre || '…'}</p>
        <p className="text-[12px] text-gray-500 truncate">{email}</p>
      </div>
      {rol && (
        <span className="text-[11px] font-medium bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full shrink-0">
          {rolLabels[rol] ?? rol}
        </span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MiCuentaInner() {
  const { rol, cargando: cargandoRol } = useRol()
  const profesionalId = useProfesionalId()
  const [tab, setTab] = useState<Tab>('perfil')

  // Tabs disponibles según rol
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'perfil',         label: 'Mi perfil',      icon: User },
    ...(rol === 'profesional' ? [{ id: 'disponibilidad' as Tab, label: 'Disponibilidad', icon: CalendarDays }] : []),
    { id: 'google',         label: 'Google Calendar', icon: CalendarDays },
    { id: 'seguridad',      label: 'Seguridad',       icon: Shield },
  ]

  if (cargandoRol) return null

  const tabTitles: Record<Tab, { title: string; subtitle: string }> = {
    perfil:         { title: 'Mi perfil', subtitle: 'Nombre, foto y datos personales' },
    disponibilidad: { title: 'Mi disponibilidad', subtitle: 'Días y horarios en que atiendes' },
    google:         { title: 'Google Calendar', subtitle: 'Sincroniza tus citas con tu calendario' },
    seguridad:      { title: 'Seguridad', subtitle: 'Contraseña de acceso' },
  }

  const current = tabTitles[tab]

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-5 max-w-[900px]">
      <div className="shrink-0">
        <h1 className="text-[18px] font-semibold text-gray-900">Mi cuenta</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Gestiona tu perfil y preferencias personales</p>
      </div>

      <UserHeader />

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 flex-1 min-h-0">
        {/* Nav lateral */}
        <nav className="sm:w-[200px] w-full shrink-0 space-y-0.5">
          {tabs.map(item => {
            const Icon = item.icon
            const isActive = tab === item.id
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-colors text-left ${isActive ? 'bg-blue-50 text-[#2563EB]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon className={`size-[15px] shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}`} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Contenido */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 overflow-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">{current.title}</h2>
              <p className="text-[13px] text-gray-400 mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          {tab === 'perfil'         && <SeccionPerfil />}
          {tab === 'disponibilidad' && profesionalId && <SeccionDisponibilidad profesionalId={profesionalId} />}
          {tab === 'disponibilidad' && !profesionalId && (
            <p className="text-[13px] text-gray-400 py-8 text-center">Tu cuenta aún no está vinculada a un profesional.<br />Pídele al administrador que te vincule en la sección Usuarios y roles.</p>
          )}
          {tab === 'google'    && <SeccionGoogleCalendar />}
          {tab === 'seguridad' && <SeccionSeguridad />}
        </div>
      </div>
    </div>
  )
}

export default function MiCuentaPage() {
  return (
    <Suspense>
      <MiCuentaInner />
    </Suspense>
  )
}
