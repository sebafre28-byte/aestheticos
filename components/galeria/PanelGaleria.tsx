'use client'

import { useEffect, useRef, useState } from 'react'
import { ScrollableTabs } from '@/components/ui/ScrollableTabs'
import { useRol } from '@/lib/auth/useRol'
import { getGaleriaFotosPaciente, subirFotoGaleria, eliminarFotoGaleria, type FotoGaleria } from '@/lib/galeria/queries'
import { Camera, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X, Upload } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type TipoFoto = 'antes' | 'durante' | 'progreso' | 'despues' | 'control'

const TIPOS_FOTO: { value: TipoFoto; label: string; color: string; dot: string }[] = [
  { value: 'antes', label: 'Antes', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  { value: 'durante', label: 'Durante', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  { value: 'progreso', label: 'Progreso', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  { value: 'despues', label: 'Después', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-400' },
  { value: 'control', label: 'Control', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
]

const TRATAMIENTOS_SUGERIDOS = ['Botox', 'Relleno dérmico', 'Láser / IPL', 'Facial', 'Corporal', 'Mesoterapia', 'Limpieza', 'Otro']

function getTipoInfo(tipo: TipoFoto) {
  return TIPOS_FOTO.find((t) => t.value === tipo) ?? TIPOS_FOTO[0]
}

export default function PanelGaleria({ pacienteId, clinicaId }: { pacienteId: string; clinicaId?: string }) {
  const { rol } = useRol()
  const [fotos, setFotos] = useState<FotoGaleria[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ fotos: FotoGaleria[]; idx: number } | null>(null)
  const [creando, setCreando] = useState(false)
  const [tipoFoto, setTipoFoto] = useState<TipoFoto>('antes')
  const [tratamiento, setTratamiento] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorSubir, setErrorSubir] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const puedeEliminar = rol === 'admin' || rol === 'profesional'
  const clinicaIdResuelto = clinicaId

  useEffect(() => {
    getGaleriaFotosPaciente(pacienteId).then((data) => { setFotos(data); setLoading(false) })
  }, [pacienteId])

  function resetForm() {
    setFile(null); setPreview(null); setTipoFoto('antes'); setTratamiento(''); setDescripcion(''); setFecha(new Date().toISOString().slice(0, 10)); setNotas(''); setCreando(false)
  }

  function pickFile(f: File) {
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function handleGuardar() {
    if (!file) return
    setSubiendo(true)
    setErrorSubir(null)

    const form = new FormData()
    form.append('file', file)
    form.append('paciente_id', pacienteId)
    form.append('tipo', tipoFoto)
    form.append('fecha_foto', fecha)
    if (tratamiento) form.append('tratamiento', tratamiento)
    if (descripcion) form.append('descripcion', descripcion)
    if (notas) form.append('notas', notas)

    const res = await fetch('/api/galeria/fotos/upload', { method: 'POST', body: form })

    if (res.ok) {
      const data = await getGaleriaFotosPaciente(pacienteId)
      setFotos(data)
      resetForm()
    } else {
      const json = await res.json().catch(() => ({}))
      setErrorSubir(json.error ?? `Error ${res.status} al guardar la foto`)
    }
    setSubiendo(false)
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    const ok = await eliminarFotoGaleria(id)
    if (ok) setFotos((prev) => prev.filter((f) => f.id !== id))
  }

  // Group fotos by tratamiento for timeline
  const groups: { label: string; fotos: FotoGaleria[] }[] = []
  for (const foto of fotos) {
    const label = foto.tratamiento ?? 'Sin tratamiento'
    const existing = groups.find((g) => g.label === label)
    if (existing) existing.fotos.push(foto)
    else groups.push({ label, fotos: [foto] })
  }

  return (
    <div className="space-y-3">
      {!creando && (
        <button
          onClick={() => setCreando(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-[13px] text-gray-500 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50 transition-colors"
        >
          <Plus className="size-4" /> Agregar foto
        </button>
      )}

      {/* Upload form — full screen on mobile */}
      {creando && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto sm:relative sm:inset-auto sm:z-auto sm:rounded-xl sm:border sm:border-blue-200 sm:bg-blue-50/40">
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white sm:bg-transparent py-2 -mx-4 px-4 border-b border-gray-100 sm:border-0">
              <p className="text-[15px] font-semibold text-gray-800">Nueva foto</p>
              <button onClick={resetForm} className="p-2 rounded-xl hover:bg-gray-100"><X className="size-5 text-gray-500" /></button>
            </div>

            {/* Tipo selector */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Tipo de foto</label>
              <ScrollableTabs className="mt-2">
                {TIPOS_FOTO.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTipoFoto(t.value)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-colors border ${tipoFoto === t.value ? t.color + ' border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                    <span className={`size-2 rounded-full ${t.dot}`} />
                    {t.label}
                  </button>
                ))}
              </ScrollableTabs>
            </div>

            {/* Photo picker */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Foto</label>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 flex flex-col items-center justify-center overflow-hidden bg-gray-50 transition-colors"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="size-8 text-gray-300 mb-2" />
                    <span className="text-[13px] text-gray-400">Toca para elegir foto</span>
                    <span className="text-[11px] text-gray-300 mt-0.5">JPG, PNG, WebP</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Fecha de la foto</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Tratamiento</label>
              <input
                type="text"
                list="tratamientos-list"
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                placeholder="Ej: Botox, Relleno..."
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
              <datalist id="tratamientos-list">
                {TRATAMIENTOS_SUGERIDOS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Descripción (opcional)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Sesión 1, antes del tratamiento"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Notas (opcional)</label>
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones sobre la foto..."
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>

            <button
              onClick={handleGuardar}
              disabled={subiendo || !file}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-[14px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {subiendo ? <><Upload className="size-4 animate-bounce" /> Subiendo...</> : 'Guardar foto'}
            </button>
            {errorSubir && (
              <p className="text-[12px] text-red-500 text-center">{errorSubir}</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <Loader2 className="size-6 animate-spin mb-2 text-blue-400" />
          <p className="text-[13px]">Cargando galería...</p>
        </div>
      ) : fotos.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-300">
          <Camera className="size-10 mb-3" />
          <p className="text-[13px] text-gray-400 font-medium">Sin fotos aún</p>
          <p className="text-[12px] text-gray-400 mt-1 text-center">Documenta el antes, progreso y resultado del tratamiento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide px-2">{group.label}</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.fotos.map((foto) => {
                  const tipoInfo = getTipoInfo(foto.tipo as TipoFoto)
                  return (
                    <div key={foto.id} className="relative group">
                      <button
                        onClick={() => setLightbox({ fotos: group.fotos, idx: group.fotos.indexOf(foto) })}
                        className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100"
                      >
                        {foto.foto_signed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={foto.foto_signed} alt={foto.tipo} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="size-6 text-gray-300" />
                          </div>
                        )}
                      </button>
                      <div className="absolute top-1.5 left-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${tipoInfo.color} shadow-sm`}>{tipoInfo.label}</span>
                      </div>
                      {puedeEliminar && (
                        <button
                          onClick={() => handleEliminar(foto.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 text-center">
                        {format(parseISO(foto.fecha_foto), 'd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox centrado */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="size-6" />
          </button>

          {lightbox.fotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, idx: (l.idx - 1 + l.fotos.length) % l.fotos.length } : null) }}
              >
                <ChevronLeft className="size-7" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightbox((l) => l ? { ...l, idx: (l.idx + 1) % l.fotos.length } : null) }}
              >
                <ChevronRight className="size-7" />
              </button>
            </>
          )}

          <div className="flex flex-col items-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.fotos[lightbox.idx].foto_signed ?? undefined}
              alt="foto"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex flex-col items-center gap-1">
              {(() => {
                const f = lightbox.fotos[lightbox.idx]
                const tipoInfo = getTipoInfo(f.tipo as TipoFoto)
                return (
                  <>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${tipoInfo.color}`}>{tipoInfo.label}</span>
                    <p className="text-white/70 text-[12px]">{format(parseISO(f.fecha_foto), "d 'de' MMMM yyyy", { locale: es })}</p>
                    {f.descripcion && <p className="text-white/60 text-[12px]">{f.descripcion}</p>}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
