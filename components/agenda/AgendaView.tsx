'use client'

import { useState, useEffect } from 'react'
import {
  format, addDays, subDays, startOfWeek, endOfWeek,
  addWeeks, subWeeks, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, AlignLeft, Grid3X3, Keyboard, Search, Lock
} from 'lucide-react'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'
import { Button } from '@/components/ui/button'
import type {
  CitaConRelaciones, ProfesionalRow, ServicioRow, EstadoCita, PagoEstado, PagoMetodo,
} from '@/lib/agenda/queries'
import type { PagoCitaFields } from '@/lib/cobros/queries'
import {
  getCitasDelDia, getCitasDeSemana, getCitasDelMes, getProfesionales, getServiciosAgenda, getClinicaId, editarCita
} from '@/lib/agenda/queries'
import { CalendarioDia } from './CalendarioDia'
import { CalendarioSemana } from './CalendarioSemana'
import { ModalCita } from './ModalCita'
import { PanelDetalleCita } from './PanelDetalleCita'
import { ListaPendientes } from './ListaPendientes'
import { CalendarioMes } from './CalendarioMes'
import { citaWallClockTime } from '@/lib/agenda/datetime'
import { trackAgendaMetric } from '@/lib/agenda/metrics'

type Vista = 'dia' | 'semana' | 'lista' | 'mes'

type Props = {
  // Simula vista de profesional (sin acceso admin). En producción vendría del sesión.
  isVistaProfe?: boolean
  profesionalPropio?: string  // ID del profesional autenticado, requerido si isVistaProfe=true
}

export function AgendaView({ isVistaProfe = false, profesionalPropio }: Props) {
  const { puedeUsar } = useSubscripcion()

  // ─── Estado general ───────────────────────────────────────────────────────
  const [vista, setVista] = useState<Vista>('dia')

  // Force día view on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setVista('dia')
    }
  }, [])
  const [fechaActual, setFechaActual] = useState(new Date())
  const [citas, setCitas] = useState<CitaConRelaciones[]>([])
  const [profesionales, setProfesionales] = useState<ProfesionalRow[]>([])
  const [servicios, setServicios] = useState<ServicioRow[]>([])
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [profsFiltrados, setProfsFiltrados] = useState<string[]>([])
  const [fechaJump, setFechaJump] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mostrarAyudaTeclado, setMostrarAyudaTeclado] = useState(false)

  // ─── Estado del modal y panel ─────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false)
  const [citaParaEditar, setCitaParaEditar] = useState<CitaConRelaciones | null>(null)
  const [profesionalModalId, setProfesionalModalId] = useState<string | undefined>()
  const [fechaHoraModal, setFechaHoraModal] = useState<Date | undefined>()

  const [citaDetalle, setCitaDetalle] = useState<CitaConRelaciones | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // ─── Cargar datos ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const clinicaId = await getClinicaId()
const [profs, servs] = await Promise.all([getProfesionales(), getServiciosAgenda(true)])
      setProfesionales(profs)
      setServicios(servs)
    }
    init()
  }, [])

  useEffect(() => {
    cargarCitas()
  }, [fechaActual, vista])

  async function cargarCitas() {
    setCargando(true)
    const startedAt = performance.now()
    try {
      let datos: CitaConRelaciones[]

      if (vista === 'mes') {
        const inicioMes = startOfMonth(fechaActual)
        const finMes = endOfMonth(fechaActual)
        datos = await getCitasDelMes(
          format(inicioMes, 'yyyy-MM-dd'),
          format(finMes, 'yyyy-MM-dd')
        )
      } else if (vista === 'dia' || vista === 'lista') {
        datos = await getCitasDelDia(format(fechaActual, 'yyyy-MM-dd'))
      } else {
        const lunes = startOfWeek(fechaActual, { weekStartsOn: 1 })
        const domingo = endOfWeek(fechaActual, { weekStartsOn: 1 })
        datos = await getCitasDeSemana(
          format(lunes, 'yyyy-MM-dd'),
          format(domingo, 'yyyy-MM-dd')
        )
      }

      if (isVistaProfe && profesionalPropio) {
        datos = datos.filter((c) => c.profesional_id === profesionalPropio)
      }

      setCitas(datos)
      setErrorCarga(null)
      trackAgendaMetric('agenda_load_succeeded', {
        vista,
        totalCitas: datos.length,
        elapsedMs: Math.round(performance.now() - startedAt),
      })
    } catch {
      setErrorCarga('No se pudo cargar la agenda. Intenta nuevamente.')
      trackAgendaMetric('agenda_load_failed', {
        vista,
        elapsedMs: Math.round(performance.now() - startedAt),
      })
    } finally {
      setCargando(false)
    }
  }

  // ─── Navegación de fecha ──────────────────────────────────────────────────
  function irAnterior() {
    setFechaActual((f) =>
      vista === 'semana' ? subWeeks(f, 1) : vista === 'mes' ? subMonths(f, 1) : subDays(f, 1)
    )
  }

  function irSiguiente() {
    setFechaActual((f) =>
      vista === 'semana' ? addWeeks(f, 1) : vista === 'mes' ? addMonths(f, 1) : addDays(f, 1)
    )
  }

  function irHoy() {
    setFechaActual(new Date())
  }

  // ─── Navegación con teclado ───────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignorar si el foco está en un campo de texto
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          irAnterior()
          break
        case 'ArrowRight':
          e.preventDefault()
          irSiguiente()
          break
        case 'd':
          setVista('dia')
          break
        case 's':
          setVista('semana')
          break
        case 'l':
          setVista('lista')
          break
        case 'm':
          setVista('mes')
          break
        case '?':
          setMostrarAyudaTeclado((v) => !v)
          break
        case 'n':
          if (!modalAbierto && !isVistaProfe) abrirNuevaCita()
          break
        case 'Escape':
          if (modalAbierto) { setModalAbierto(false); setCitaParaEditar(null) }
          if (citaDetalle) setCitaDetalle(null)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [vista, modalAbierto, citaDetalle, isVistaProfe])

  // ─── Chips de filtro de profesionales ────────────────────────────────────
  function toggleProfesional(id: string) {
    setProfsFiltrados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  // ─── Abrir modal en celda vacía ───────────────────────────────────────────
  function handleClickCelda(profesionalId: string | undefined, hora: Date) {
    if (isVistaProfe) return
    setProfesionalModalId(profesionalId)
    setFechaHoraModal(hora)
    setCitaParaEditar(null)
    setModalAbierto(true)
  }

  // ─── Abrir modal de nueva cita ────────────────────────────────────────────
  function abrirNuevaCita() {
    setProfesionalModalId(undefined)
    setFechaHoraModal(undefined)
    setCitaParaEditar(null)
    setModalAbierto(true)
  }

  // ─── Click en una cita → panel de detalle ────────────────────────────────
  function handleClickCita(cita: CitaConRelaciones) {
    setCitaDetalle(cita)
  }

  async function moverCita(cita: CitaConRelaciones, profesionalId: string, horaDestino: Date) {
    const inicioActual = new Date(cita.inicio)
    const finActual = new Date(cita.fin)
    const duracionMs = finActual.getTime() - inicioActual.getTime()
    const inicioNuevo = new Date(horaDestino)
    const finNuevo = new Date(inicioNuevo.getTime() + duracionMs)

    const actualizada = await editarCita(cita.id, {
      profesional_id: profesionalId,
      inicio: inicioNuevo.toISOString(),
      fin: finNuevo.toISOString(),
    })
    if (!actualizada) return

    setCitas((prev) => prev.map((item) => (item.id === cita.id ? actualizada : item)))
    if (citaDetalle?.id === cita.id) setCitaDetalle(actualizada)
    trackAgendaMetric('appointment_drag_moved', { citaId: cita.id })
  }

  async function redimensionarCita(cita: CitaConRelaciones, deltaMinutos: number) {
    if (deltaMinutos === 0) return
    const inicio = new Date(cita.inicio)
    const finActual = new Date(cita.fin)
    const finNuevo = new Date(finActual.getTime() + deltaMinutos * 60_000)
    if (finNuevo <= inicio) return

    const actualizada = await editarCita(cita.id, {
      fin: finNuevo.toISOString(),
    })
    if (!actualizada) return
    setCitas((prev) => prev.map((item) => (item.id === cita.id ? actualizada : item)))
    if (citaDetalle?.id === cita.id) setCitaDetalle(actualizada)
    trackAgendaMetric('appointment_resized', { citaId: cita.id, deltaMinutos })
  }

  // ─── Al guardar una cita ──────────────────────────────────────────────────
  function handleCitaGuardada(cita: CitaConRelaciones) {
    setModalAbierto(false)
    setCitaParaEditar(null)
    setCitas((prev) => {
      const existe = prev.findIndex((c) => c.id === cita.id)
      if (existe >= 0) {
        const actualizada = [...prev]
        actualizada[existe] = cita
        return actualizada
      }
      return [...prev, cita]
    })
    if (citaDetalle?.id === cita.id) setCitaDetalle(cita)
    trackAgendaMetric('appointment_saved', { citaId: cita.id, estado: cita.estado })
  }

  // ─── Editar desde panel ───────────────────────────────────────────────────
  function handleEditarDesdePanel(cita: CitaConRelaciones) {
    setCitaParaEditar(cita)
    setCitaDetalle(null)
    setModalAbierto(true)
  }

  // ─── Actualización optimista de estado ───────────────────────────────────
  function handleEstadoActualizado(citaId: string, nuevoEstado: EstadoCita) {
    setCitas((prev) =>
      prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c))
    )
    if (citaDetalle?.id === citaId) {
      setCitaDetalle((prev) => prev ? { ...prev, estado: nuevoEstado } : prev)
    }
  }

  function handlePagoActualizado(citaId: string, pago: PagoCitaFields) {
    const patch = {
      pago_monto: pago.pago_monto,
      pago_estado: pago.pago_estado as PagoEstado,
      pago_metodo: pago.pago_metodo as PagoMetodo | null,
      pago_registrado_at: pago.pago_registrado_at,
    }
    setCitas((prev) => prev.map((c) => (c.id === citaId ? { ...c, ...patch } : c)))
    if (citaDetalle?.id === citaId) {
      setCitaDetalle((prev) => (prev ? { ...prev, ...patch } : prev))
    }
  }

  function handleCitaConfirmada(citaId: string) {
    handleEstadoActualizado(citaId, 'confirmada')
  }

  // Ir a vista día de una fecha específica (desde click en header semana)
  function handleVerDia(fecha: Date) {
    setFechaActual(fecha)
    setVista('dia')
  }

  // ─── Etiqueta de fecha según vista ───────────────────────────────────────
  const etiquetaFecha = (() => {
    if (isVistaProfe) {
      const esHoy = isSameDay(fechaActual, new Date())
      const dia = format(fechaActual, "EEEE d 'de' MMMM", { locale: es })
      return `Mi agenda · ${esHoy ? 'hoy' : dia}`
    }
    if (vista === 'semana') {
      const lunes = startOfWeek(fechaActual, { weekStartsOn: 1 })
      const domingo = endOfWeek(fechaActual, { weekStartsOn: 1 })
      return `${format(lunes, "d MMM", { locale: es })} – ${format(domingo, "d MMM yyyy", { locale: es })}`
    }
    if (vista === 'mes') {
      return format(fechaActual, 'MMMM yyyy', { locale: es })
    }
    const esHoy = isSameDay(fechaActual, new Date())
    const dia = format(fechaActual, "EEEE d 'de' MMMM", { locale: es })
    return esHoy ? `Hoy · ${dia}` : dia
  })()

  // ─── Citas con búsqueda aplicada (todas las vistas) ──────────────────────
  const citasFiltradas = busqueda.trim()
    ? citas.filter((c) =>
        c.pacientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.servicios?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : citas

  // ─── Vista lista: citas filtradas y ordenadas ─────────────────────────────
  const citasLista = [...citasFiltradas]
    .filter((c) => profsFiltrados.length === 0 || profsFiltrados.includes(c.profesional_id))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))

  // ─── Profesionales visibles en los chips ─────────────────────────────────
  // En vista profesional solo se muestra el chip propio (sin opción de filtrar)
  const profsParaChips = isVistaProfe && profesionalPropio
    ? profesionales.filter((p) => p.id === profesionalPropio)
    : profesionales

  return (
    <div className="p-3 sm:p-5 h-full flex flex-col gap-3 sm:gap-4">
      {/* ── Header ── */}
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">Agenda</h1>
          <p className="text-[12px] text-gray-400 mt-0.5 capitalize">{etiquetaFecha}</p>
          {/* Mini-resumen del día */}
          {(vista === 'dia' || vista === 'lista') && citas.length > 0 && (() => {
            const pendientes = citas.filter((c) => c.estado === 'pendiente').length
            const hayUrgentes = pendientes > 0 && citas.some((c) => {
              if (c.estado !== 'pendiente') return false
              const diffMs = new Date(c.inicio).getTime() - Date.now()
              return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000
            })
            return (
              <p className={`text-[11px] font-medium mt-0.5 ${hayUrgentes ? 'text-red-500' : 'text-gray-400'}`}>
                {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
                {pendientes > 0 && ` · ${pendientes} pendiente${pendientes > 1 ? 's' : ''} de confirmar`}
              </p>
            )
          })()}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Búsqueda de paciente */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar paciente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-lg border border-gray-100 bg-white text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 w-[160px] focus:w-[200px] transition-all"
            />
          </div>
          {!isVistaProfe && <ListaPendientes onCitaConfirmada={handleCitaConfirmada} />}

          {/* Selector de vista */}
          <div className="flex items-center bg-white border border-gray-100 rounded-lg p-0.5 gap-0.5">
            {([
              { id: 'dia',    icon: Clock,        label: 'Día',    feature: null,           mobileHidden: false },
              { id: 'semana', icon: CalendarDays,  label: 'Semana', feature: 'agenda_semana', mobileHidden: true },
              { id: 'lista',  icon: AlignLeft,     label: 'Lista',  feature: null,           mobileHidden: false },
              { id: 'mes',    icon: Grid3X3,       label: 'Mes',    feature: 'agenda_mes',   mobileHidden: true },
            ] as const).map(({ id, icon: Icon, label, feature, mobileHidden }) => {
              const bloqueado = feature !== null && !puedeUsar(feature)
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (bloqueado) {
                      window.location.href = '/configuracion?tab=plan'
                      return
                    }
                    setVista(id)
                  }}
                  title={bloqueado ? 'Requiere plan Pro — Ver planes' : undefined}
                  className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${mobileHidden ? 'hidden md:flex' : 'flex'} ${
                    vista === id
                      ? 'bg-[#2563EB] text-white'
                      : bloqueado
                      ? 'text-gray-300 cursor-pointer'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {bloqueado ? <Lock className="size-3.5" /> : <Icon className="size-3.5" />}
                  {label}
                </button>
              )
            })}

          </div>

          {/* Navegación de fecha */}
          <div className="flex items-center bg-white border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={irAnterior}
              className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={irHoy}
              className={`text-[12px] font-medium px-3 border-x border-gray-100 h-8 transition-colors ${
                isSameDay(fechaActual, new Date())
                  ? 'text-gray-400 cursor-default'
                  : 'text-[#2563EB] font-semibold hover:bg-blue-50'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={irSiguiente}
              className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center bg-white border border-gray-100 rounded-lg px-2 gap-2 h-8">
            <input
              type="date"
              value={fechaJump}
              onChange={(e) => {
                setFechaJump(e.target.value)
                if (e.target.value) {
                  setFechaActual(new Date(`${e.target.value}T09:00:00`))
                }
              }}
              className="text-[12px] text-gray-600 outline-none"
            />
          </div>

          <button
            onClick={() => setMostrarAyudaTeclado((v) => !v)}
            className="hidden md:flex h-8 px-2.5 rounded-lg text-[12px] border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 items-center gap-1.5"
            aria-label="Mostrar atajos de teclado"
          >
            <Keyboard className="size-3.5" />
            Atajos
          </button>

          {/* Nueva cita — solo recepción */}
          {!isVistaProfe && (
            <Button
              onClick={abrirNuevaCita}
              className="h-8 text-[13px] font-medium gap-1.5 border-0 text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              <Plus className="size-3.5" />
              Nueva cita
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile date strip ── */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(new Date(), i - 1)
          const isSelected = isSameDay(d, fechaActual)
          return (
            <button
              key={i}
              onClick={() => setFechaActual(d)}
              className={`flex flex-col items-center justify-center shrink-0 w-12 h-14 rounded-xl text-center transition-colors ${
                isSelected
                  ? 'bg-[#2563EB] text-white'
                  : isSameDay(d, new Date())
                  ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                  : 'bg-white border border-gray-100 text-gray-600'
              }`}
            >
              <span className="text-[10px] font-medium capitalize">
                {format(d, 'EEE', { locale: es })}
              </span>
              <span className="text-[15px] font-bold leading-tight">{format(d, 'd')}</span>
            </button>
          )
        })}
      </div>

      {/* ── Chips de filtro de profesionales (vista día y semana) ── */}
      {(vista === 'dia' || vista === 'semana') && profsParaChips.length > 0 && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[11px] text-gray-400 font-medium">Mostrar:</span>

          {/* "Todos" solo visible si no es vista profesional */}
          {!isVistaProfe && (
            <button
              onClick={() => setProfsFiltrados([])}
              className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                profsFiltrados.length === 0
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          )}

          {profsParaChips.map((prof) => {
            const activo = profsFiltrados.includes(prof.id) || isVistaProfe
            return (
              <button
                key={prof.id}
                onClick={() => !isVistaProfe && toggleProfesional(prof.id)}
                className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 border ${
                  activo
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                } ${isVistaProfe ? 'cursor-default' : ''}`}
                style={activo ? { backgroundColor: prof.color, borderColor: prof.color } : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activo ? 'rgba(255,255,255,0.8)' : prof.color }}
                />
                {prof.nombre}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Stats strip (día/lista/semana) ── */}
      {(vista === 'dia' || vista === 'lista' || vista === 'semana') && citas.length > 0 && (() => {
        const validas = citas.filter(c => c.estado !== 'cancelada' && c.estado !== 'no_asistio')
        const confirmadas = citas.filter(c => c.estado === 'confirmada').length
        const pendientes = citas.filter(c => c.estado === 'pendiente').length
        const completadas = citas.filter(c => c.estado === 'completada').length
        const ingresos = citas.reduce((acc, c) => {
          if (c.pago_estado === 'pagado' || c.pago_estado === 'parcial') return acc + (c.pago_monto ?? 0)
          return acc
        }, 0)
        return (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white border border-gray-100 text-[11px] font-medium text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {validas.length} citas
            </div>
            {confirmadas > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-teal-50 border border-teal-100 text-[11px] font-medium text-teal-700">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                {confirmadas} confirmadas
              </div>
            )}
            {pendientes > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-medium text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {pendientes} pendientes
              </div>
            )}
            {completadas > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px] font-medium text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {completadas} completadas
              </div>
            )}
            {ingresos > 0 && (
              <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(ingresos)} cobrados
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Cuerpo principal ── */}
      <div className="flex-1 min-h-0 relative">
        {errorCarga && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-red-50 border border-red-100">
            <div className="text-center">
              <p className="text-[13px] font-semibold text-red-600">Error cargando agenda</p>
              <p className="text-[12px] text-red-500 mt-1">{errorCarga}</p>
            </div>
          </div>
        )}
        {cargando && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {vista === 'dia' && (
          <CalendarioDia
            fecha={fechaActual}
            profesionales={profesionales}
            citas={citasFiltradas}
            profesionalesFiltrados={
              isVistaProfe && profesionalPropio
                ? [profesionalPropio]
                : profsFiltrados
            }
            onClickCita={handleClickCita}
            onClickCelda={handleClickCelda}
            onDropCita={moverCita}
            onResizeCita={redimensionarCita}
          />
        )}
        {vista === 'dia' && citas.length === 0 && !cargando && (
          <EstadoVacioAgenda
            titulo="Sin citas para este día"
            descripcion="Puedes crear una nueva cita o cambiar la fecha."
            onNueva={!isVistaProfe ? abrirNuevaCita : undefined}
            onHoy={irHoy}
          />
        )}

        {vista === 'semana' && (
          <CalendarioSemana
            fechaBase={fechaActual}
            profesionalesFiltrados={
              isVistaProfe && profesionalPropio
                ? [profesionalPropio]
                : profsFiltrados
            }
            citas={citasFiltradas}
            onClickCita={handleClickCita}
            onClickCelda={handleClickCelda}
            onDropCita={moverCita}
            onResizeCita={redimensionarCita}
            onVerDia={handleVerDia}
          />
        )}
        {vista === 'semana' && citas.length === 0 && !cargando && (
          <EstadoVacioAgenda
            titulo="Semana sin citas"
            descripcion="No hay citas registradas para esta semana."
            onNueva={!isVistaProfe ? abrirNuevaCita : undefined}
            onHoy={irHoy}
          />
        )}

        {vista === 'mes' && (
          <CalendarioMes
            fechaBase={fechaActual}
            citas={citasFiltradas}
            onVerDia={handleVerDia}
            onClickCita={handleClickCita}
          />
        )}

        {vista === 'lista' && (
          <div className="h-full bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 shrink-0">
              <p className="text-[13px] font-semibold text-gray-900">
                {format(fechaActual, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {citasLista.length} {citasLista.length === 1 ? 'cita' : 'citas'}
                {profsFiltrados.length > 0 && ' · filtradas'}
              </p>
            </div>

            {citasLista.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <CalendarDays className="size-10 text-gray-200 mb-3" />
                <p className="text-[14px] font-medium text-gray-500">Sin citas este día</p>
                <p className="text-[12px] text-gray-400 mt-1">
                  {isVistaProfe
                    ? 'No tienes citas asignadas'
                    : 'Haz click en "Nueva cita" para agregar una'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto divide-y divide-gray-50">
                {citasLista.map((cita) => {
                  const color = cita.profesionales?.color ?? '#2563EB'
                  const horaInicio = citaWallClockTime(cita.inicio)
                  const horaFin = citaWallClockTime(cita.fin)

                  const estadoLabel: Record<string, string> = {
                    pendiente: 'Pendiente',
                    confirmada: 'Confirmada',
                    completada: 'Completada',
                    cancelada: 'Cancelada',
                    no_asistio: 'No asistió',
                  }
                  const estadoStyle: Record<string, string> = {
                    pendiente: 'bg-amber-50 text-amber-600',
                    confirmada: 'bg-teal-50 text-teal-600',
                    completada: 'bg-blue-50 text-blue-600',
                    cancelada: 'bg-red-50 text-red-500',
                    no_asistio: 'bg-red-100 text-red-700',
                  }

                  return (
                    <button
                      key={cita.id}
                      onClick={() => handleClickCita(cita)}
                      className={`w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors text-left ${
                        cita.estado === 'cancelada' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-16 shrink-0 text-right">
                        <p className="text-[12px] font-bold text-gray-700">{horaInicio}</p>
                        <p className="text-[10px] text-gray-400">{horaFin}</p>
                      </div>
                      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold text-gray-900 truncate ${cita.estado === 'cancelada' ? 'line-through' : ''}`}>
                          {cita.pacientes?.nombre ?? '—'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {cita.servicios?.nombre} · {cita.profesionales?.nombre}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${estadoStyle[cita.estado] ?? ''}`}>
                        {estadoLabel[cita.estado] ?? cita.estado}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal crear/editar cita ── */}
      {modalAbierto && (
        <ModalCita
          citaExistente={citaParaEditar}
          profesionalIdInicial={profesionalModalId}
          fechaHoraInicial={fechaHoraModal}
          profesionales={profesionales}
          servicios={servicios}
          onGuardada={handleCitaGuardada}
          onCerrar={() => { setModalAbierto(false); setCitaParaEditar(null) }}
        />
      )}

      {/* ── Panel de detalle de cita ── */}
      {citaDetalle && (
        <PanelDetalleCita
          key={citaDetalle.id}
          cita={citaDetalle}
          isVistaProfe={isVistaProfe}
          onCerrar={() => setCitaDetalle(null)}
          onEditar={handleEditarDesdePanel}
          onEstadoActualizado={handleEstadoActualizado}
          onPagoActualizado={handlePagoActualizado}
        />
      )}

      {mostrarAyudaTeclado && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/25" onClick={() => setMostrarAyudaTeclado(false)} />
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-2xl p-5 w-full max-w-md">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-3">Atajos de teclado</h3>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-gray-600">
              <p><span className="font-semibold">D</span> vista día</p>
              <p><span className="font-semibold">S</span> vista semana</p>
              <p><span className="font-semibold">L</span> vista lista</p>
              <p><span className="font-semibold">M</span> vista mes</p>
              <p><span className="font-semibold">N</span> nueva cita</p>
              <p><span className="font-semibold">←/→</span> navegar fecha</p>
              <p><span className="font-semibold">Esc</span> cerrar panel/modal</p>
              <p><span className="font-semibold">?</span> ver atajos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EstadoVacioAgenda({
  titulo,
  descripcion,
  onNueva,
  onHoy,
}: {
  titulo: string
  descripcion: string
  onNueva?: () => void
  onHoy: () => void
}) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white/95 border border-gray-100 rounded-xl shadow-sm px-6 py-5 text-center max-w-sm">
        <p className="text-[14px] font-semibold text-gray-900">{titulo}</p>
        <p className="text-[12px] text-gray-500 mt-1">{descripcion}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          {onNueva && (
            <button
              onClick={onNueva}
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-white bg-[#2563EB]"
            >
              Nueva cita
            </button>
          )}
          <button
            onClick={onHoy}
            className="h-8 px-3 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-700"
          >
            Ir a hoy
          </button>
        </div>
      </div>
    </div>
  )
}
