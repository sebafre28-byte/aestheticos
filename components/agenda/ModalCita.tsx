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
  citaInstantMs,
  citaWallClockTime,
  isoToClinicLocalDateForForm,
  isoToClinicLocalTimeForForm,
  modalWallClockFinIso,
  modalWallClockToIso,
} from '@/lib/agenda/datetime'
import {
  getPacientesBusqueda, crearPacienteRapido, crearCita, crearCitasRecurrentes, editarCita,
  verificarConflicto, getClinicaId, getCitasDelDia, getDisponibilidadProfesional, getBloqueosRango, crearRecordatorioCita,
} from '@/lib/agenda/queries'
import { useDialogA11y } from './useDialogA11y'

// Slots de 08:00 a 19:45 en intervalos de 15 min
const SLOTS_HORA: string[] = Array.from({ length: 48 }, (_, i) => {
  const totalMin = 8 * 60 + i * 15
  const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
  const m = (totalMin % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

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
  const esEdicion = !!citaExistente

  // ─── Estado del formulario ─────────────────────────────────────────────────
  const [busquedaPaciente, setBusquedaPaciente] = useState(citaExistente?.pacientes?.nombre ?? '')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteRow | null>(citaExistente?.pacientes ?? null)
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PacienteRow[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarCrearPaciente, setMostrarCrearPaciente] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: '', telefono: '', email: '' })
  const [creandoPaciente, setCreandoPaciente] = useState(false)

  const [profesionalId, setProfesionalId] = useState(
    citaExistente?.profesional_id ?? profesionalIdInicial ?? profesionales[0]?.id ?? ''
  )
  const [servicioId, setServicioId] = useState(
    citaExistente?.servicio_id ?? servicios[0]?.id ?? ''
  )
  const [fecha, setFecha] = useState(
    citaExistente
      ? isoToClinicLocalDateForForm(citaExistente.inicio)
      : fechaHoraInicial
      ? format(fechaHoraInicial, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  )
  const [hora, setHora] = useState(
    citaExistente
      ? isoToClinicLocalTimeForForm(citaExistente.inicio)
      : fechaHoraInicial
      ? format(fechaHoraInicial, 'HH:mm')
      : '09:00'
  )
  const [notas, setNotas] = useState(citaExistente?.notas ?? '')
  const [recurrenceKind, setRecurrenceKind] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(
    (citaExistente?.recurrence_kind as 'none' | 'daily' | 'weekly' | 'monthly' | undefined) ?? 'none'
  )
  const [recurrenceCount, setRecurrenceCount] = useState(8)
  const [serieEditMode, setSerieEditMode] = useState<'single' | 'future' | 'all'>('single')

  const [conflicto, setConflicto] = useState<CitaConRelaciones | null>(null)
  const [alertaSoft, setAlertaSoft] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordatorioWhatsApp, setRecordatorioWhatsApp] = useState(true)
  const [recordatorioMinutos, setRecordatorioMinutos] = useState(120)

  // ─── Time picker ───────────────────────────────────────────────────────────
  const [abiertoPicker, setAbiertoPicker] = useState(false)
  const [citasDelProfesional, setCitasDelProfesional] = useState<CitaConRelaciones[]>([])
  const pickerRef = useRef<HTMLDivElement>(null)
  const servicioActual = servicios.find((s) => s.id === servicioId)

  const slotSeleccionadoRef = useRef<HTMLButtonElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(dialogRef, onCerrar)

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
    if (!profesionalId || !fecha) { return }
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

  useEffect(() => {
    let active = true
    async function validarDisponibilidad() {
      if (!profesionalId || !fecha || !hora || !servicioActual) return
      const diaSemana = new Date(`${fecha}T12:00:00`).getDay()
      const diaSemanaISO = diaSemana === 0 ? 7 : diaSemana
      const disponibilidad = await getDisponibilidadProfesional(profesionalId)
      const tramosDia = disponibilidad.filter((d) => d.dia_semana === diaSemanaISO)
      if (tramosDia.length === 0) {
        // No hay horario específico configurado para este profesional — no bloquear
        if (active) setAlertaSoft(null)
        return
      }

      const inicioMin = parseInt(hora.slice(0, 2), 10) * 60 + parseInt(hora.slice(3, 5), 10)
      const finIso = modalWallClockFinIso(fecha, hora, servicioActual.duracion_minutos)
      const finMin = (() => {
        const t = citaWallClockTime(finIso)
        return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10)
      })()
      const dentro = tramosDia.some((d) => {
        const inicioDisp = parseInt(d.hora_inicio.slice(0, 2), 10) * 60 + parseInt(d.hora_inicio.slice(3, 5), 10)
        const finDisp = parseInt(d.hora_fin.slice(0, 2), 10) * 60 + parseInt(d.hora_fin.slice(3, 5), 10)
        return inicioMin >= inicioDisp && finMin <= finDisp
      })

      const bloqueos = await getBloqueosRango(`${fecha}T00:00:00`, `${fecha}T23:59:59`)
      const inicioIso = modalWallClockToIso(fecha, hora)
      const bloquea = bloqueos.some(
        (b) =>
          (b.profesional_id === null || b.profesional_id === profesionalId) &&
          citaInstantMs(b.fin) > citaInstantMs(inicioIso) &&
          citaInstantMs(b.inicio) < citaInstantMs(finIso),
      )

      if (active) {
        if (!dentro) setAlertaSoft('Horario fuera de disponibilidad del profesional.')
        else if (bloquea) setAlertaSoft('Existe un bloqueo de agenda para ese horario.')
        else setAlertaSoft(null)
      }
    }
    validarDisponibilidad()
    return () => {
      active = false
    }
  }, [profesionalId, fecha, hora, servicioActual])

  const horaFin = (() => {
    if (!fecha || !hora || !servicioActual) return ''
    return citaWallClockTime(modalWallClockFinIso(fecha, hora, servicioActual.duracion_minutos))
  })()

  // Detectar si un slot está ocupado por otra cita del profesional
  function slotOcupado(slotHora: string): boolean {
    if (!servicioActual) return false
    const slotInicio = modalWallClockToIso(fecha, slotHora)
    const slotFin = modalWallClockFinIso(fecha, slotHora, servicioActual.duracion_minutos)
    return citasDelProfesional.some(
      (c) => citaInstantMs(c.inicio) < citaInstantMs(slotFin) && citaInstantMs(c.fin) > citaInstantMs(slotInicio),
    )
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
        const finConflicto = citaWallClockTime(conflicto.fin)
        const finConflictoH = parseInt(finConflicto.slice(0, 2), 10)
        const finConflictoM = parseInt(finConflicto.slice(3, 5), 10)
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
    const paciente = await crearPacienteRapido(nuevoPaciente.nombre, nuevoPaciente.telefono, clinicaId, nuevoPaciente.email || undefined)
    setCreandoPaciente(false)
    if (paciente) {
      seleccionarPaciente(paciente)
      setMostrarCrearPaciente(false)
      setNuevoPaciente({ nombre: '', telefono: '', email: '' })
    }
  }

  // ─── Verificar conflicto al cambiar profesional/fecha/hora ───────────────
  useEffect(() => {
    async function verificar() {
      if (!profesionalId || !fecha || !hora || !servicioActual) { setConflicto(null); return }
      try {
        const inicio = modalWallClockToIso(fecha, hora)
        const fin = modalWallClockFinIso(fecha, hora, servicioActual.duracion_minutos)
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
    if (conflicto) { setError('Existe conflicto de horario. Selecciona otro bloque.'); return }

    setError(null)
    setGuardando(true)

    try {
      const inicio = modalWallClockToIso(fecha, hora)
      const fin = modalWallClockFinIso(fecha, hora, servicioActual!.duracion_minutos)

      let resultado: CitaConRelaciones | null

      if (esEdicion && citaExistente) {
        resultado = await editarCita(citaExistente.id, {
          paciente_id: pacienteSeleccionado.id,
          profesional_id: profesionalId,
          servicio_id: servicioId,
          inicio,
          fin,
          notas: notas || undefined,
          recurrence_kind: recurrenceKind,
          recurrence_rule: recurrenceKind === 'none' ? null : `FREQ=${recurrenceKind.toUpperCase()}`,
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
          recurrence_kind: recurrenceKind,
          recurrence_rule: recurrenceKind === 'none' ? null : `FREQ=${recurrenceKind.toUpperCase()}`,
        }
        if (recurrenceKind !== 'none') {
          resultado = await crearCitasRecurrentes(datos, recurrenceKind as 'daily' | 'weekly' | 'monthly', recurrenceCount)
        } else {
          resultado = await crearCita(datos)
        }
      }

      if (!resultado) {
        setError('Error al guardar la cita. Inténtalo de nuevo.')
      } else {
        if (recordatorioWhatsApp) {
          const clinicaId = await getClinicaId()
          if (clinicaId) {
            await crearRecordatorioCita(clinicaId, resultado.id, 'whatsapp', recordatorioMinutos)
          }
        }
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? 'Editar cita' : 'Nueva cita'}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
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
                <input
                  type="email"
                  value={nuevoPaciente.email}
                  onChange={(e) => setNuevoPaciente((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email (opcional)"
                  className="w-full h-8 px-2.5 text-[12px] rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
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
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Servicio</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {servicios.filter(s => s.activo).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServicioId(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                    servicioId === s.id
                      ? 'border-[#2563EB] bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#2563EB' }} />
                    <span className={`text-[13px] font-medium ${servicioId === s.id ? 'text-[#2563EB]' : 'text-gray-800'}`}>{s.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>{s.duracion_minutos} min</span>
                    {s.precio > 0 && <span>${s.precio.toLocaleString('es-CL')}</span>}
                  </div>
                </button>
              ))}
            </div>
            {servicioActual && (
              <p className="mt-1.5 text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="size-3" />
                {servicioActual.duracion_minutos} min · Termina a las {horaFin}
              </p>
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
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white"
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
                          disabled={ocupado}
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

          <div className="space-y-2">
            <Label className="text-[12px] font-semibold text-gray-700 mb-1 block">Recurrencia</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRecurrenceKind(k)}
                  className={`h-8 rounded-lg text-[12px] font-medium border transition-all ${
                    recurrenceKind === k
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {k === 'none' ? 'Una vez' : k === 'daily' ? 'Diaria' : k === 'weekly' ? 'Semanal' : 'Mensual'}
                </button>
              ))}
            </div>
            {recurrenceKind !== 'none' && !esEdicion && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[12px] text-gray-500">Repetir</span>
                <input
                  type="number"
                  min={2}
                  max={52}
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                  className="w-16 h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-gray-700 text-center focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                />
                <span className="text-[12px] text-gray-500">
                  veces en total ({recurrenceKind === 'daily' ? 'días' : recurrenceKind === 'weekly' ? 'semanas' : 'meses'})
                </span>
              </div>
            )}
          </div>
          {esEdicion && recurrenceKind !== 'none' && (
            <div>
              <Label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">
                Aplicar cambios a
              </Label>
              <select
                value={serieEditMode}
                onChange={(e) => setSerieEditMode(e.target.value as 'single' | 'future' | 'all')}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              >
                <option value="single">Solo esta cita</option>
                <option value="future">Esta y siguientes</option>
                <option value="all">Toda la serie</option>
              </select>
            </div>
          )}

          {/* ── Advertencia de conflicto mejorada ── */}
          {conflicto && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-amber-700">Conflicto de horario</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    <span className="font-medium">{conflicto.pacientes?.nombre}</span> tiene cita a esta hora
                    ({isoToClinicLocalTimeForForm(conflicto.inicio)} – {isoToClinicLocalTimeForForm(conflicto.fin)}).
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

          {alertaSoft && !conflicto && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-[12px] font-semibold text-orange-700">Alerta de agenda</p>
              <p className="text-[11px] text-orange-600 mt-0.5">{alertaSoft}</p>
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Recordatorios</p>
            <label className="flex items-center gap-2 text-[12px] text-gray-700">
              <input
                type="checkbox"
                checked={recordatorioWhatsApp}
                onChange={(e) => setRecordatorioWhatsApp(e.target.checked)}
              />
              Enviar recordatorio por WhatsApp
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-600">Minutos antes</span>
              <Input
                type="number"
                min={15}
                step={15}
                value={recordatorioMinutos}
                onChange={(e) => setRecordatorioMinutos(Number(e.target.value))}
                className="h-8 max-w-[100px] text-[12px]"
              />
            </div>
          </div>

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
