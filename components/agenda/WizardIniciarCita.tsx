'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X, ChevronRight, ChevronLeft, Check, User, FileText,
  Camera, ClipboardList, CheckCircle2, Loader2, Upload, Trash2, Image,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'
import { actualizarEstadoCita } from '@/lib/agenda/queries'
import { crearNotaClinica } from '@/lib/pacientes/queries'
import { crearFicha } from '@/lib/fichas/queries'
import { TEMPLATES, TIPOS_TRATAMIENTO, type TipoTratamiento } from '@/lib/fichas/templates'
import { getClinicaConfig, WIZARD_PASOS_DEFAULT, type WizardPasosConfig } from '@/lib/onboarding/queries'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  cita: CitaConRelaciones
  onCerrar: () => void
  onCompletada: (citaId: string) => void
}

type Paso = {
  id: number
  titulo: string
  icono: React.ElementType
}

const PASOS: Paso[] = [
  { id: 1, titulo: 'Paciente',       icono: User },
  { id: 2, titulo: 'Ficha clínica',  icono: FileText },
  { id: 3, titulo: 'Fotos',          icono: Camera },
  { id: 4, titulo: 'Notas',          icono: ClipboardList },
  { id: 5, titulo: 'Cierre',         icono: CheckCircle2 },
]

type FotoPreview = { file: File; url: string; tipo: 'antes' | 'despues'; subiendo: boolean; id?: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferirTipoTratamiento(nombreServicio: string): TipoTratamiento {
  const n = nombreServicio.toLowerCase()
  if (n.includes('botox') || n.includes('toxina'))           return 'botox'
  if (n.includes('relleno') || n.includes('filler'))         return 'relleno'
  if (n.includes('laser') || n.includes('láser') || n.includes('ipl')) return 'laser'
  if (n.includes('facial') || n.includes('limpieza'))        return 'facial'
  if (n.includes('corporal') || n.includes('cavitac') || n.includes('drenaje')) return 'corporal'
  if (n.includes('mesoterapia'))                             return 'mesoterapia'
  return 'general'
}

// ─── Paso 1: Paciente ─────────────────────────────────────────────────────────

function PasoPaciente({ cita }: { cita: CitaConRelaciones }) {
  const paciente = cita.pacientes
  const [rut, setRut] = useState(paciente?.rut ?? '')
  const [email, setEmail] = useState(paciente?.email ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const tieneDatosFaltantes = !paciente?.rut || !paciente?.email

  async function guardarDatos() {
    if (!paciente?.id) return
    setGuardando(true)
    const supabase = createClient()
    const updates: Record<string, string> = {}
    if (rut.trim() && !paciente.rut) updates.rut = rut.trim()
    if (email.trim() && !paciente.email) updates.email = email.trim()
    if (Object.keys(updates).length > 0) {
      await supabase.from('pacientes').update(updates).eq('id', paciente.id)
    }
    setGuardando(false)
    setGuardado(true)
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)' }}>
            {paciente?.nombre?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">{paciente?.nombre ?? '—'}</p>
            <p className="text-[12px] text-gray-500">{paciente?.telefono ?? 'Sin teléfono'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">RUT</p>
            <p className="text-[13px] text-gray-900">{paciente?.rut ?? <span className="text-gray-400">Sin RUT</span>}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
            <p className="text-[13px] text-gray-900 truncate">{paciente?.email ?? <span className="text-gray-400">Sin email</span>}</p>
          </div>
        </div>
      </div>

      {tieneDatosFaltantes && !guardado && (
        <div className="space-y-3">
          <p className="text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Completa los datos faltantes antes de comenzar la atención
          </p>
          {!paciente?.rut && (
            <div>
              <Label className="text-[12px] text-gray-600 mb-1 block">RUT del paciente</Label>
              <Input value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" className="h-9 text-[13px]" />
            </div>
          )}
          {!paciente?.email && (
            <div>
              <Label className="text-[12px] text-gray-600 mb-1 block">Email del paciente</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="paciente@email.com" className="h-9 text-[13px]" />
            </div>
          )}
          <Button onClick={guardarDatos} disabled={guardando} className="h-8 text-[12px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
            {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Guardar datos'}
          </Button>
        </div>
      )}

      {(!tieneDatosFaltantes || guardado) && (
        <div className="flex items-center gap-2 text-[13px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <CheckCircle2 className="size-4 shrink-0" />
          Datos del paciente completos
        </div>
      )}

      <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-4">
        <p className="text-[12px] font-semibold text-[#2563EB] mb-2">Cita de hoy</p>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <span className="text-gray-500">Servicio:</span>
            <span className="ml-1.5 font-medium text-gray-900">{cita.servicios?.nombre ?? '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Profesional:</span>
            <span className="ml-1.5 font-medium text-gray-900">{cita.profesionales?.nombre ?? '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Hora inicio:</span>
            <span className="ml-1.5 font-medium text-gray-900">{format(parseISO(cita.inicio), 'HH:mm', { locale: es })}</span>
          </div>
          <div>
            <span className="text-gray-500">Duración:</span>
            <span className="ml-1.5 font-medium text-gray-900">{cita.servicios?.duracion_minutos ?? '—'} min</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Paso 2: Ficha clínica ────────────────────────────────────────────────────

function PasoFicha({
  cita,
  onFichaGuardada,
}: {
  cita: CitaConRelaciones
  onFichaGuardada: (id: string) => void
}) {
  const tipoInferido = inferirTipoTratamiento(cita.servicios?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoTratamiento>(tipoInferido)
  const [contenido, setContenido] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const template = TEMPLATES[tipo]

  async function guardar() {
    if (!cita.paciente_id) return
    setGuardando(true)
    setError(null)
    const { data, error: e } = await crearFicha({
      paciente_id: cita.paciente_id,
      tipo_tratamiento: tipo,
      contenido,
      notas: notas.trim() || null,
    })
    setGuardando(false)
    if (e || !data) { setError(e ?? 'Error al guardar ficha'); return }
    setGuardado(true)
    onFichaGuardada(data.id)
  }

  if (guardado) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <CheckCircle2 className="size-4 shrink-0" />
        Ficha clínica guardada correctamente
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de tipo */}
      <div>
        <Label className="text-[12px] text-gray-600 mb-2 block">Tipo de tratamiento</Label>
        <div className="flex flex-wrap gap-2">
          {TIPOS_TRATAMIENTO.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTipo(t); setContenido({}) }}
              className={`h-7 px-3 rounded-lg text-[11px] font-medium border transition-colors ${tipo === t ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {TEMPLATES[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Campos del template */}
      <div className="space-y-3 bg-gray-50 rounded-xl border border-gray-100 p-4">
        {template.campos.map(campo => (
          <div key={campo.key}>
            <Label className="text-[12px] text-gray-700 mb-1 block">
              {campo.label}{campo.requerido && <span className="text-red-400 ml-0.5">*</span>}
            </Label>
            {campo.tipo === 'textarea' ? (
              <textarea
                value={contenido[campo.key] ?? ''}
                onChange={e => setContenido(p => ({ ...p, [campo.key]: e.target.value }))}
                placeholder={campo.placeholder}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
              />
            ) : campo.tipo === 'select' ? (
              <select
                value={contenido[campo.key] ?? ''}
                onChange={e => setContenido(p => ({ ...p, [campo.key]: e.target.value }))}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              >
                <option value="">Seleccionar…</option>
                {campo.opciones?.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            ) : (
              <Input
                type={campo.tipo}
                value={contenido[campo.key] ?? ''}
                onChange={e => setContenido(p => ({ ...p, [campo.key]: e.target.value }))}
                placeholder={campo.placeholder}
                className="h-9 text-[13px]"
              />
            )}
          </div>
        ))}
        <div>
          <Label className="text-[12px] text-gray-700 mb-1 block">Observaciones adicionales</Label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas libres del profesional…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <Button onClick={guardar} disabled={guardando} className="h-8 text-[12px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
        {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Guardar ficha clínica'}
      </Button>
    </div>
  )
}

// ─── Paso 3: Fotos ────────────────────────────────────────────────────────────

function PasoFotos({ cita }: { cita: CitaConRelaciones }) {
  const [tab, setTab] = useState<'antes' | 'despues'>('antes')
  const [fotos, setFotos] = useState<FotoPreview[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const servicioNombre = cita.servicios?.nombre ?? ''

  function handleArchivos(files: FileList | null) {
    if (!files) return
    const nuevas: FotoPreview[] = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file),
      tipo: tab,
      subiendo: false,
    }))
    setFotos(p => [...p, ...nuevas])
  }

  async function subirFoto(idx: number) {
    const foto = fotos[idx]
    if (!foto || foto.subiendo || foto.id) return
    setFotos(p => p.map((f, i) => i === idx ? { ...f, subiendo: true } : f))

    const form = new FormData()
    form.append('file', foto.file)
    form.append('paciente_id', cita.paciente_id)
    form.append('cita_id', cita.id)
    form.append('tipo', foto.tipo)
    form.append('tratamiento', servicioNombre)
    form.append('fecha_foto', new Date().toISOString().slice(0, 10))

    try {
      const res = await fetch('/api/galeria/fotos/upload', { method: 'POST', body: form })
      const json = await res.json()
      setFotos(p => p.map((f, i) => i === idx ? { ...f, subiendo: false, id: json.data?.id } : f))
    } catch {
      setFotos(p => p.map((f, i) => i === idx ? { ...f, subiendo: false } : f))
    }
  }

  async function subirTodas() {
    const pendientes = fotos.map((f, i) => ({ f, i })).filter(({ f }) => !f.id && !f.subiendo)
    await Promise.all(pendientes.map(({ i }) => subirFoto(i)))
  }

  function eliminar(idx: number) {
    setFotos(p => p.filter((_, i) => i !== idx))
  }

  const fotosFiltradas = fotos.filter(f => f.tipo === tab)
  const pendientesSubir = fotos.filter(f => !f.id).length

  return (
    <div className="space-y-4">
      {/* Tabs antes/después */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['antes', 'despues'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'antes' ? 'Fotos antes' : 'Fotos después'}
          </button>
        ))}
      </div>

      {/* Zona de upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#2563EB]/50 hover:bg-blue-50/20 transition-colors"
      >
        <Upload className="size-7 text-gray-300 mx-auto mb-2" />
        <p className="text-[13px] text-gray-500">Haz clic para seleccionar fotos</p>
        <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG · Puedes seleccionar varias</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleArchivos(e.target.files)}
        />
      </div>

      {/* Grid de fotos */}
      {fotosFiltradas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {fotosFiltradas.map((foto, i) => {
            const idx = fotos.indexOf(foto)
            return (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt="" className="w-full h-full object-cover" />
                {foto.subiendo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="size-5 text-white animate-spin" />
                  </div>
                )}
                {foto.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                {!foto.id && !foto.subiendo && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={e => { e.stopPropagation(); eliminar(idx) }}
                      className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                    >
                      <Trash2 className="size-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {fotos.length > 0 && pendientesSubir > 0 && (
        <Button onClick={subirTodas} className="h-8 text-[12px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
          <Upload className="size-3.5 mr-1.5" />
          Subir {pendientesSubir} foto{pendientesSubir > 1 ? 's' : ''}
        </Button>
      )}

      {fotos.length === 0 && (
        <p className="text-[12px] text-gray-400 text-center">
          Puedes omitir este paso si no hay fotos para esta sesión
        </p>
      )}
    </div>
  )
}

// ─── Paso 4: Notas ────────────────────────────────────────────────────────────

function PasoNotas({
  cita,
  onNotaGuardada,
}: {
  cita: CitaConRelaciones
  onNotaGuardada: () => void
}) {
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    if (!nota.trim()) { onNotaGuardada(); return }
    setGuardando(true)
    setError(null)
    const ok = await crearNotaClinica({
      paciente_id: cita.paciente_id,
      contenido: nota.trim(),
      cita_id: cita.id,
    })
    setGuardando(false)
    if (!ok) { setError('No se pudo guardar la nota'); return }
    setGuardado(true)
    onNotaGuardada()
  }

  if (guardado) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <CheckCircle2 className="size-4 shrink-0" />
        Nota clínica guardada en el historial del paciente
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-gray-500">
        Registra observaciones de la sesión. Quedará en el historial clínico del paciente.
      </p>
      <textarea
        value={nota}
        onChange={e => setNota(e.target.value)}
        autoFocus
        rows={8}
        placeholder="Ej: Paciente toleró bien el procedimiento. Se aplicaron 20 unidades de Botox en frente y entrecejo. Sin reacciones adversas. Citar en 15 días para control…"
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
      />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={guardar} disabled={guardando} className="h-8 text-[12px] border-0 text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
          {guardando ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</> : 'Guardar nota'}
        </Button>
        <Button variant="outline" onClick={onNotaGuardada} className="h-8 text-[12px] border-gray-200 text-gray-500">
          Omitir
        </Button>
      </div>
    </div>
  )
}

// ─── Paso 5: Cierre ───────────────────────────────────────────────────────────

const METODOS_PAGO = ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Otro']

function PasoCierre({
  cita,
  onCompletada,
}: {
  cita: CitaConRelaciones
  onCompletada: () => void
}) {
  const precioServicio = cita.servicios?.precio ?? 0
  const [monto, setMonto] = useState(String(precioServicio > 0 ? precioServicio : ''))
  const [metodo, setMetodo] = useState<string>('Efectivo')
  const [completando, setCompletando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function completar() {
    setCompletando(true)
    setError(null)
    const supabase = createClient()

    const updates: Record<string, unknown> = { estado: 'completada' }
    const montoNum = parseFloat(monto)
    if (!isNaN(montoNum) && montoNum > 0) {
      updates.pago_monto = montoNum
      updates.pago_metodo = metodo.toLowerCase().replace(' ', '_')
      updates.pago_estado = 'pagado'
      updates.pago_registrado_at = new Date().toISOString()
    }

    const { error: e } = await supabase.from('citas').update(updates).eq('id', cita.id)
    setCompletando(false)
    if (e) { setError('No se pudo completar la cita'); return }
    onCompletada()
  }

  return (
    <div className="space-y-5">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-1">
        <p className="text-[14px] font-semibold text-emerald-800">¡Listo para completar la cita!</p>
        <p className="text-[12px] text-emerald-700">
          Registra el pago si aplica y marca la cita como completada.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
        <p className="text-[13px] font-semibold text-gray-900">Registro de pago</p>

        <div>
          <Label className="text-[12px] text-gray-600 mb-1.5 block">Monto cobrado</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">$</span>
            <Input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0"
              className="h-9 text-[13px] pl-7"
            />
          </div>
          {precioServicio > 0 && (
            <button
              type="button"
              onClick={() => setMonto(String(precioServicio))}
              className="text-[11px] text-[#2563EB] mt-1 hover:underline"
            >
              Usar precio del servicio: ${precioServicio.toLocaleString('es-CL')}
            </button>
          )}
        </div>

        <div>
          <Label className="text-[12px] text-gray-600 mb-1.5 block">Método de pago</Label>
          <div className="flex flex-wrap gap-2">
            {METODOS_PAGO.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodo(m)}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${metodo === m ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <Button
        onClick={completar}
        disabled={completando}
        className="w-full h-10 text-[13px] border-0 text-white font-semibold"
        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
      >
        {completando
          ? <><Loader2 className="size-4 animate-spin mr-2" />Completando…</>
          : <><CheckCircle2 className="size-4 mr-2" />Completar cita</>}
      </Button>
    </div>
  )
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

export default function WizardIniciarCita({ cita, onCerrar, onCompletada }: Props) {
  const [paso, setPaso] = useState(1)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [notaGuardada, setNotaGuardada] = useState(false)
  const [completada, setCompletada] = useState(false)
  const [config, setConfig] = useState<WizardPasosConfig>(WIZARD_PASOS_DEFAULT)
  const [cargandoConfig, setCargandoConfig] = useState(true)

  useEffect(() => {
    getClinicaConfig().then(cfg => {
      if (cfg.wizard_pasos) setConfig({ ...WIZARD_PASOS_DEFAULT, ...cfg.wizard_pasos })
      setCargandoConfig(false)
    })
  }, [])

  const paciente = cita.pacientes

  // Construir lista de pasos activos según config
  const pasosActivos: Paso[] = [
    PASOS[0], // Paciente — siempre
    ...(config.ficha ? [PASOS[1]] : []),
    ...(config.fotos ? [PASOS[2]] : []),
    ...(config.notas ? [PASOS[3]] : []),
    PASOS[4], // Cierre — siempre
  ]
  const totalPasos = pasosActivos.length
  const pasoActivo = pasosActivos[paso - 1]

  function handleCompletada() {
    setCompletada(true)
    setTimeout(() => {
      onCompletada(cita.id)
      onCerrar()
    }, 1800)
  }

  // Prevent scroll behind wizard
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (cargandoConfig) return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white">
      <Loader2 className="size-6 animate-spin text-gray-300" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
        <div>
          <p className="text-[14px] font-semibold text-gray-900">
            Atención en curso
          </p>
          <p className="text-[12px] text-gray-400">
            {paciente?.nombre} · {cita.servicios?.nombre}
          </p>
        </div>
        <button
          onClick={onCerrar}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="size-4 text-gray-400" />
        </button>
      </div>

      {/* ── Barra de progreso + pasos ── */}
      <div className="px-5 py-3 border-b border-gray-100 shrink-0">
        {/* Barra */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-3">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
            style={{ width: `${((paso - 1) / (totalPasos - 1)) * 100}%` }}
          />
        </div>
        {/* Chips de pasos activos */}
        <div className="flex justify-between">
          {pasosActivos.map((p, idx) => {
            const Icono = p.icono
            const numPaso = idx + 1
            const activo = paso === numPaso
            const completo = paso > numPaso
            return (
              <button
                key={p.id}
                onClick={() => completo && setPaso(numPaso)}
                className={`flex flex-col items-center gap-0.5 transition-opacity ${paso < numPaso ? 'opacity-30' : ''} ${completo ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${completo ? 'bg-[#2563EB]' : activo ? 'bg-[#2563EB]' : 'bg-gray-200'}`}>
                  {completo ? <Check className="size-3.5 text-white" /> : <Icono className={`size-3.5 ${activo ? 'text-white' : 'text-gray-400'}`} />}
                </div>
                <span className={`text-[9px] font-medium hidden sm:block ${activo ? 'text-[#2563EB]' : 'text-gray-400'}`}>{p.titulo}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenido del paso ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-6">

          {completada ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
              </div>
              <p className="text-[16px] font-semibold text-gray-900">Cita completada</p>
              <p className="text-[13px] text-gray-500 text-center">
                La atención de {paciente?.nombre} quedó registrada correctamente.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
                {pasoActivo?.titulo}
              </h2>

              {pasoActivo?.id === 1 && <PasoPaciente cita={cita} />}
              {pasoActivo?.id === 2 && <PasoFicha cita={cita} onFichaGuardada={id => setFichaId(id)} />}
              {pasoActivo?.id === 3 && <PasoFotos cita={cita} />}
              {pasoActivo?.id === 4 && <PasoNotas cita={cita} onNotaGuardada={() => setNotaGuardada(true)} />}
              {pasoActivo?.id === 5 && <PasoCierre cita={cita} onCompletada={handleCompletada} />}
            </>
          )}
        </div>
      </div>

      {/* ── Footer de navegación ── */}
      {!completada && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <button
            onClick={() => setPaso(p => Math.max(1, p - 1))}
            disabled={paso === 1}
            className="h-9 px-4 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="size-4" /> Anterior
          </button>

          <span className="text-[12px] text-gray-400">{paso} / {totalPasos}</span>

          {paso < totalPasos ? (
            <button
              onClick={() => setPaso(p => Math.min(totalPasos, p + 1))}
              className="h-9 px-4 rounded-lg border-0 text-[13px] font-medium text-white flex items-center gap-1.5 transition-colors"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              Siguiente <ChevronRight className="size-4" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
