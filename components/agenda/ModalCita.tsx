'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Search, Plus, AlertTriangle, Loader2, User, Clock, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  CitaConRelaciones, ProfesionalRow, ServicioRow, PacienteRow, NuevaCitaData,
} from '@/lib/agenda/queries'
import {
  getPacientesBusqueda, crearPacienteRapido, crearCita, editarCita,
  verificarConflicto, getClinicaId, getCitasDelDia,
} from '@/lib/agenda/queries'

// Slots de 08:00 a 19:45 en intervalos de 15 min
const SLOTS_HORA: string[] = Array.from({ length: 48 }, (_, i) => {
  const totalMin = 8 * 60 + i * 15
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const m = (totalMin % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

function calcularFin(fecha: string, hora: string, duracionMin: number): string {
  const [hh, mm] = hora.split(':').map(Number)
  const totalMin = hh * 60 + mm + duracionMin
  const finHH = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const finMM = (totalMin % 60).toString().padStart(2, '0')
  return `${fecha}T${finHH}:${finMM}:00`
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

type Props = {
  citaExistente?: CitaConRelaciones | null
  profesionalIdInicial?: string
  fechaHoraInicial?: Date
  profesionales: ProfesionalRow[]
  servicios: ServicioRow[]
  onGuardada: (cita: CitaConRelaciones) => void
  onCerrar: () => void
}

export function ModalCita({
  citaExistente,
  profesionalIdInicial,
  fechaHoraInicial,
  profesionales,
  servicios,
  onGuardada,
  onCerrar,
}: Props) {
  function inferirCategoriaServicio(servicio: ServicioRow): string {
    const texto = `${servicio.nombre} ${servicio.descripcion ?? ''}`.toLowerCase()
    if (texto.includes('laser')) return 'Láser'
    if (texto.includes('toxina') || texto.includes('botox') || texto.includes('relleno')) return 'Inyectables'
    if (texto.includes('facial') || texto.includes('piel') || texto.includes('limpieza')) return 'Facial'
    if (texto.includes('corporal') || texto.includes('masaje') || texto.includes('drenaje')) return 'Corporal'
    if (texto.includes('depil')) return 'Depilación'
    return 'General'
  }

  const esEdicion = !!citaExistente

  // ─── Estado del formulario ─────────────────────────────────────────────────
  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteRow | null>(null)
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PacienteRow[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarCrearPaciente, setMostrarCrearPaciente] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: '', telefono: '' })
  const [creandoPaciente, setCreandoPaciente] = useState(false)
  const [servicioBusqueda, setServicioBusqueda] = useState('')
  const [filtroEstadoServicio, setFiltroEstadoServicio] = useState<'activos' | 'todos'>('activos')
  const [categoriaServicio, setCategoriaServicio] = useState<string>('todas')

  const [profesionalId, setProfesionalId] = useState(
    citaExistente?.profesional_id ?? profesionalIdInicial ?? profesionales[0]?.id ?? ''
  )
  const [servicioId, setServicioId] = useState(
    citaExistente?.servicio_id ?? servicios[0]?.id ?? ''
  )
  const [fecha, setFecha] = useState(
    citaExistente
      ? citaExistente.inicio.slice(0, 10)
      : fechaHoraInicial
      ? format(fechaHoraInicial, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [hora, setHora] = useState(
    citaExistente
      ? citaExistente.inicio.slice(11, 16)
      : fechaHoraInicial
      ? format(fechaHoraInicial, 'HH:mm')
      : '09:00'
  )
  const [notas, setNotas] = useState(citaExistente?.notas ?? '')

  const [conflicto, setConflicto] = useState<CitaConRelaciones | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Time picker ───────────────────────────────────────────────────────────
  const [abiertoPicker, setAbiertoPicker] = useState(false)
  const [citasDelProfesional, setCitasDelProfesional] = useState<CitaConRelaciones[]>([])
  const pickerRef = useRef<HTMLDivElement>(null)
  const slotSeleccionadoRef = useRef<HTMLButtonElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cerrar picker al hacer click fuera
  useEffect(() => {
    if (!abiertoPicker) return
    function handleClickFuera(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setAbiertoPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [abiertoPicker])

  // Scroll al slot seleccionado cuando se abre el picker
  useEffect(() => {
    if (abiertoPicker && slotSeleccionadoRef.current) {
      setTimeout(() => slotSeleccionadoRef.current?.scrollIntoView({ block: 'center' }), 0)
    }
  }, [abiertoPicker])

  // Cargar citas del profesional para detectar slots ocupados
  useEffect(() => {
    if (!profesionalId || !fecha) { setCitasDelProfesional([]); return }
    getCitasDelDia(fecha).then((todas) => {
      setCitasDelProfesional(
        todas.filter(
          (c) =>
            c.profesional_id === profesionalId &&
            c.estado !== 'cancelada' &&
            c.estado !== 'no_asistio' &&
            c.id !== citaExistente?.id
        )
      )
    })
  }, [profesionalId, fecha, citaExistente?.id])

  const servicioActual = servicios.find((s) => s.id === servicioId)
  const categoriasServicio = ['todas', ...Array.from(new Set(servicios.map(inferirCategoriaServicio))).sort()]
  const serviciosFiltrados = servicios.filter((s) => {
    if (filtroEstadoServicio === 'activos' && !s.activo) return false
    if (categoriaServicio !== 'todas' && inferirCategoriaServicio(s) !== categoriaServicio) return false
    if (servicioBusqueda.trim()) {
      const t = servicioBusqueda.trim().toLowerCase()
      const target = `${s.nombre} ${s.descripcion ?? ''}`.toLowerCase()
      if (!target.includes(t)) return false
    }
    return true
  })

  const horaFin = (() => {
    if (!fecha || !hora || !servicioActual) return ''
    return calcularFin(fecha, hora, servicioActual.duracion_minutos).slice(11, 16)
  })()

  // Detectar si un slot está ocupado por otra cita del profesional
  function slotOcupado(slotHora: string): boolean {
    if (!servicioActual) return false
    const slotInicio = `${fecha}T${slotHora}:00`
    const slotFin = calcularFin(fecha, slotHora, servicioActual.duracion_minutos)
    return citasDelProfesional.some((c) => c.inicio < slotFin && c.fin > slotInicio)
  }

  // Próximos 3 slots libres (solo cuando no viene hora pre-llenada)
  const sugerencias = !fechaHoraInicial && profesionalId && fecha && servicioActual
    ? SLOTS_HORA.filter((s) => !slotOcupado(s)).slice(0, 3)
    : []

  // Siguiente slot libre después del conflicto
  const siguienteLibre = conflicto
    ? SLOTS_HORA.find((s) => {
        const [hh, mm] = s.split(':').map(Number)
        const slotMin = hh * 60 + mm
        const finConflictoH = parseInt(conflicto.fin.slice(11, 13))
        const finConflictoM = parseInt(conflicto.fin.slice(14, 16))
        const finMin = finConflictoH * 60 + finConflictoM
        return slotMin >= finMin && !slotOcupado(s)
      })
    : null

  // Color del profesional para el preview
  const profesionalActual = profesionales.find((p) => p.id === profesionalId)
  const profesionalColor = profesionalActual?.color ?? '#2563EB'

  // ─── Buscar pacientes con debounce ────────────────────────────────────────
  const buscarPacientes = useCallback(async (termino: string) => {
    if (termino.length < 2) { setResultadosBusqueda([]); return }
    setBuscando(true)
    const resultados = await getPacientesBusqueda(termino)
    setResultadosBusqueda(resultados)
    setBuscando(false)
  }, [])

  function handleCambioBusqueda(valor: string) {
    setBusquedaPaciente(valor)
    setPacienteSeleccionado(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscarPacientes(valor), 300)
  }

  function seleccionarPaciente(p: PacienteRow) {
    setPacienteSeleccionado(p)
    setBusquedaPaciente(p.nombre)
    setResultadosBusqueda([])
    setMostrarCrearPaciente(false)
  }

  async function handleCrearPaciente() {
    if (!nuevoPaciente.nombre.trim()) return
    setCreandoPaciente(true)
    const clinicaId = await getClinicaId()
    if (!clinicaId) { setCreandoPaciente(false); return }
    const paciente = await crearPacienteRapido(nuevoPaciente.nombre, nuevoPaciente.telefono, clinicaId)
    setCreandoPaciente(false)
    if (paciente) {
      seleccionarPaciente(paciente)
      setMostrarCrearPaciente(false)
      setNuevoPaciente({ nombre: '', telefono: '' })
    }
  }

  useEffect(() => {
    if (citaExistente?.pacientes) {
      setPacienteSeleccionado(citaExistente.pacientes)
      setBusquedaPaciente(citaExistente.pacientes.nombre)
    }
  }, [citaExistente])

  // ─── Verificar conflicto al cambiar profesional/fecha/hora ───────────────
  useEffect(() => {
    async function verificar() {
      if (!profesionalId || !fecha || !hora || !servicioActual) { setConflicto(null); return }
      try {
        const inicio = `${fecha}T${hora}:00`
        const fin = calcularFin(fecha, hora, servicioActual.duracion_minutos)
        const c = await verificarConflicto(profesionalId, inicio, fin, citaExistente?.id)
        setConflicto(c)
      } catch {
        setConflicto(null)
      }
    }
    verificar()
  }, [profesionalId, fecha, hora, servicioId, servicioActual, citaExistente?.id])

  // ─── Guardar cita ─────────────────────────────────────────────────────────
  async function handleGuardar() {
    if (!pacienteSeleccionado) { setError('Selecciona un paciente'); return }
    if (!profesionalId) { setError('Selecciona un profesional'); return }
    if (!servicioId) { setError('Selecciona un servicio'); return }
    if (!fecha || !hora) { setError('Indica fecha y hora'); return }

    setError(null)
    setGuardando(true)

    try {
      const inicio = `${fecha}T${hora}:00`
      const fin = calcularFin(fecha, hora, servicioActual!.duracion_minutos)

      let resultado: CitaConRelaciones | null

      if (esEdicion && citaExistente) {
        resultado = await editarCita(citaExistente.id, {
          paciente_id: pacienteSeleccionado.id,
          profesional_id: profesionalId,
          servicio_id: servicioId,
          inicio,
          fin,
          notas: notas || undefined,
        })
      } else {
        const clinicaId = await getClinicaId()
        if (!clinicaId) { setError('No se pudo obtener la clínica'); setGuardando(false); return }
        const datos: NuevaCitaData = {
          clinica_id: clinicaId,
          paciente_id: pacienteSeleccionado.id,
          profesional_id: profesionalId,
          servicio_id: servicioId,
          inicio,
          fin,
          notas: notas || undefined,
        }
        resultado = await crearCita(datos)
      }

      if (!resultado) {
        setError('Error al guardar la cita. Inténtalo de nuevo.')
      } else {
        onGuardada(resultado)
      }
    } catch {
      setError('Error inesperado. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  // ─── Preview visible cuando todos los campos están completos ──────────────
  const mostrarPreview = !!(pacienteSeleccionado && profesionalId && servicioId && fecha && hora)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCerrar} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-[16px] font-semibold text-gray-900">
            {esEdicion ? 'Editar cita' : 'Nueva cita'}
          </h2>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Búsqueda de paciente ── */}
          <div>
            <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
              Paciente
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <Input
                value={busquedaPaciente}
                onChange={(e) => handleCambioBusqueda(e.target.value)}
                placeholder="Buscar por nombre o teléfono..."
                className="pl-9 text-[13px]"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 animate-spin" />
              )}
            </div>

            {resultadosBusqueda.length > 0 && !pacienteSeleccionado && (
              <div className="mt-1 border border-gray-100 rounded-lg shadow-lg overflow-hidden bg-white z-20 relative">
                {resultadosBusqueda.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => seleccionarPaciente(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <User className="size-3.5 text-[#2563EB]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{p.nombre}</p>
                      <p className="text-[11px] text-gray-500">{p.telefono ?? 'Sin teléfono'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pacienteSeleccionado && (
              <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="size-3 text-[#2563EB]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#2563EB] truncate">
                    {pacienteSeleccionado.nombre}
                  </p>
                  <p className="text-[11px] text-blue-600">{pacienteSeleccionado.telefono}</p>
                </div>
                <button
                  onClick={() => { setPacienteSeleccionado(null); setBusquedaPaciente('') }}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {!pacienteSeleccionado && busquedaPaciente.length >= 2 && resultadosBusqueda.length === 0 && !buscando && (
              <button
                onClick={() => setMostrarCrearPaciente(true)}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-[#2563EB] font-medium hover:text-blue-700"
              >
                <Plus className="size-3.5" />
                Crear paciente &quot;{busquedaPaciente}&quot;
              </button>
            )}

            {mostrarCrearPaciente && (
              <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50/50 space-y-2">
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                  Nuevo paciente
                </p>
                <Input
                  value={nuevoPaciente.nombre}
                  onChange={(e) => setNuevoPaciente((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre completo"
                  className="text-[12px] bg-white"
                />
                <Input
                  value={nuevoPaciente.telefono}
                  onChange={(e) => setNuevoPaciente((p) => ({ ...p, telefono: e.target.value }))}
                  placeholder="Teléfono (opcional)"
                  className="text-[12px] bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCrearPaciente}
                    disabled={creandoPaciente || !nuevoPaciente.nombre.trim()}
                    className="text-[12px] bg-[#2563EB] hover:bg-blue-700 text-white"
                  >
                    {creandoPaciente && <Loader2 className="size-3 animate-spin mr-1" />}
                    Crear
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMostrarCrearPaciente(false)}
                    className="text-[12px]"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Servicio ── */}
          <div>
            <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
              Servicio
            </Label>
            <div className="space-y-2">
              <Input
                value={servicioBusqueda}
                onChange={(e) => setServicioBusqueda(e.target.value)}
                placeholder="Buscar servicio..."
                className="text-[13px]"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroEstadoServicio('activos')}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                    filtroEstadoServicio === 'activos'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstadoServicio('todos')}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                    filtroEstadoServicio === 'todos'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {categoriasServicio.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaServicio(cat)}
                    className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                      categoriaServicio === cat
                        ? 'bg-teal-500 text-white'
                        : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                    }`}
                  >
                    {cat === 'todas' ? 'Todas' : cat}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            >
              <option value="">— Selecciona un servicio —</option>
              {serviciosFiltrados.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.duracion_minutos} min · ${s.precio.toLocaleString('es-CL')}
                  {!s.activo ? ' · Inactivo' : ''}
                </option>
              ))}
            </select>
            {serviciosFiltrados.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-400">No hay servicios con ese filtro.</p>
            )}
            {servicioActual && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                <Clock className="size-3 text-gray-400" />
                <span>{servicioActual.duracion_minutos} min</span>
                {horaFin && <span className="text-gray-400">· Termina a las {horaFin}</span>}
              </div>
            )}
          </div>

          {/* ── Profesional ── */}
          <div>
            <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
              Profesional
            </Label>
            <select
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            >
              <option value="">— Selecciona un profesional —</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.especialidad ? ` · ${p.especialidad}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Fecha y hora ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
                Fecha
              </Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="text-[13px]"
              />
            </div>

            {/* Selector de hora con dropdown personalizado */}
            <div>
              <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
                Hora inicio
              </Label>
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setAbiertoPicker((v) => !v)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 flex items-center justify-between"
                >
                  <span className={hora ? 'text-gray-700' : 'text-gray-400'}>
                    {hora || 'Seleccionar'}
                  </span>
                  <ChevronDown className={`size-3.5 text-gray-400 transition-transform ${abiertoPicker ? 'rotate-180' : ''}`} />
                </button>

                {abiertoPicker && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {SLOTS_HORA.map((slot) => {
                      const ocupado = slotOcupado(slot)
                      const seleccionado = slot === hora
                      return (
                        <button
                          key={slot}
                          type="button"
                          ref={seleccionado ? slotSeleccionadoRef : undefined}
                          disabled={false}
                          onClick={() => { setHora(slot); setAbiertoPicker(false) }}
                          className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors flex items-center justify-between ${
                            seleccionado
                              ? 'bg-blue-100 text-blue-700 font-semibold'
                              : ocupado
                              ? 'text-gray-300 cursor-default'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className={ocupado ? 'line-through' : ''}>{slot}</span>
                          {ocupado && (
                            <span className="text-[10px] text-gray-400 ml-2">Ocupado</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sugerencias de slots libres (solo modal vacío) */}
              {sugerencias.length > 0 && !abiertoPicker && (
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-gray-400">Libres:</span>
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setHora(s)}
                      className={`text-[11px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                        hora === s
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Notas ── */}
          <div>
            <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
              Notas internas
            </Label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Alergias, preferencias, observaciones..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 placeholder:text-gray-400"
            />
          </div>

          {/* ── Advertencia de conflicto mejorada ── */}
          {conflicto && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-amber-700">Conflicto de horario</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    <span className="font-medium">{conflicto.pacientes?.nombre}</span> tiene cita a esta hora
                    ({conflicto.inicio.slice(11, 16)} – {conflicto.fin.slice(11, 16)}).
                  </p>
                  {siguienteLibre && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Siguiente disponible:{' '}
                      <button
                        type="button"
                        onClick={() => setHora(siguienteLibre)}
                        className="font-bold underline hover:text-amber-700"
                      >
                        {siguienteLibre}
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Error general ── */}
          {error && (
            <p className="text-[12px] text-red-500 font-medium">{error}</p>
          )}

          {/* ── Preview de la cita ── */}
          {mostrarPreview && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Vista previa
              </p>
              <div
                className="rounded-lg p-2.5 border-l-4"
                style={{
                  backgroundColor: hexToRgba(profesionalColor, 0.1),
                  borderLeftColor: profesionalColor,
                }}
              >
                <p className="text-[13px] font-bold truncate" style={{ color: profesionalColor }}>
                  {pacienteSeleccionado?.nombre}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {servicioActual?.nombre}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {hora}{horaFin && ` — ${horaFin}`}
                  {fecha && ` · ${format(parseISO(fecha), "d 'de' MMM", { locale: es })}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <Button variant="ghost" size="sm" onClick={onCerrar} className="text-[13px]">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGuardar}
            disabled={guardando}
            className="text-[13px] text-white min-w-[100px]"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            {guardando ? (
              <><Loader2 className="size-3.5 animate-spin mr-1.5" />Guardando…</>
            ) : esEdicion ? 'Guardar cambios' : 'Crear cita'}
          </Button>
        </div>
      </div>
    </div>
  )
}
