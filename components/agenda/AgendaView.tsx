'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  format, addDays, subDays, startOfWeek, endOfWeek,
  addWeeks, subWeeks, isSameDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, AlignLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  CitaConRelaciones, ProfesionalRow, ServicioRow, EstadoCita
} from '@/lib/agenda/queries'
import {
  getCitasDelDia, getCitasDeSemana, getProfesionales, getServicios, getClinicaId
} from '@/lib/agenda/queries'
import { CalendarioDia } from './CalendarioDia'
import { CalendarioSemana } from './CalendarioSemana'
import { ModalCita } from './ModalCita'
import { PanelDetalleCita } from './PanelDetalleCita'
import { ListaPendientes } from './ListaPendientes'

type Vista = 'dia' | 'semana' | 'lista'

type Props = {
  // Simula vista de profesional (sin acceso admin). En producción vendría del sesión.
  isVistaProfe?: boolean
  profesionalPropio?: string  // ID del profesional autenticado, requerido si isVistaProfe=true
}

export function AgendaView({ isVistaProfe = false, profesionalPropio }: Props) {
  // ─── Estado general ───────────────────────────────────────────────────────
  const [vista, setVista] = useState<Vista>('dia')
  const [fechaActual, setFechaActual] = useState(new Date())
  const [citas, setCitas] = useState<CitaConRelaciones[]>([])
  const [profesionales, setProfesionales] = useState<ProfesionalRow[]>([])
  const [servicios, setServicios] = useState<ServicioRow[]>([])
  const [cargando, setCargando] = useState(false)

  const [profsFiltrados, setProfsFiltrados] = useState<string[]>([])

  // ─── Estado del modal y panel ─────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false)
  const [citaParaEditar, setCitaParaEditar] = useState<CitaConRelaciones | null>(null)
  const [profesionalModalId, setProfesionalModalId] = useState<string | undefined>()
  const [fechaHoraModal, setFechaHoraModal] = useState<Date | undefined>()

  const [citaDetalle, setCitaDetalle] = useState<CitaConRelaciones | null>(null)

  // ─── Cargar datos ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const clinicaId = await getClinicaId()
      console.log('clinicaId recibido:', clinicaId)
      const [profs, servs] = await Promise.all([getProfesionales(), getServicios()])
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
    let datos: CitaConRelaciones[]

    if (vista === 'dia' || vista === 'lista') {
      datos = await getCitasDelDia(format(fechaActual, 'yyyy-MM-dd'))
    } else {
      const lunes = startOfWeek(fechaActual, { weekStartsOn: 1 })
      const domingo = endOfWeek(fechaActual, { weekStartsOn: 1 })
      datos = await getCitasDeSemana(
        format(lunes, 'yyyy-MM-dd'),
        format(domingo, 'yyyy-MM-dd')
      )
    }

    // En vista profesional, mostrar solo sus propias citas
    if (isVistaProfe && profesionalPropio) {
      datos = datos.filter((c) => c.profesional_id === profesionalPropio)
    }

    setCitas(datos)
    setCargando(false)
  }

  // ─── Navegación de fecha ──────────────────────────────────────────────────
  function irAnterior() {
    setFechaActual((f) => (vista === 'semana' ? subWeeks(f, 1) : subDays(f, 1)))
  }

  function irSiguiente() {
    setFechaActual((f) => (vista === 'semana' ? addWeeks(f, 1) : addDays(f, 1)))
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
  function handleClickCelda(profesionalId: string, hora: Date) {
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
    const esHoy = isSameDay(fechaActual, new Date())
    const dia = format(fechaActual, "EEEE d 'de' MMMM", { locale: es })
    return esHoy ? `Hoy · ${dia}` : dia
  })()

  // ─── Vista lista: citas filtradas y ordenadas ─────────────────────────────
  const citasLista = [...citas]
    .filter((c) =>
      profsFiltrados.length === 0 || profsFiltrados.includes(c.profesional_id)
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio))

  // ─── Profesionales visibles en los chips ─────────────────────────────────
  // En vista profesional solo se muestra el chip propio (sin opción de filtrar)
  const profsParaChips = isVistaProfe && profesionalPropio
    ? profesionales.filter((p) => p.id === profesionalPropio)
    : profesionales

  return (
    <div className="p-5 h-full flex flex-col gap-4">
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
          {!isVistaProfe && <ListaPendientes onCitaConfirmada={handleCitaConfirmada} />}

          {/* Selector de vista */}
          <div className="flex items-center bg-white border border-gray-100 rounded-lg p-0.5 gap-0.5">
            {([
              { id: 'dia', icon: Clock, label: 'Día' },
              { id: 'semana', icon: CalendarDays, label: 'Semana' },
              { id: 'lista', icon: AlignLeft, label: 'Lista' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setVista(id)}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${
                  vista === id
                    ? 'bg-[#2563EB] text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
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

      {/* ── Cuerpo principal ── */}
      <div className="flex-1 min-h-0 relative">
        {cargando && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {vista === 'dia' && (
          <CalendarioDia
            fecha={fechaActual}
            profesionales={profesionales}
            citas={citas}
            profesionalesFiltrados={
              isVistaProfe && profesionalPropio
                ? [profesionalPropio]
                : profsFiltrados
            }
            onClickCita={handleClickCita}
            onClickCelda={handleClickCelda}
          />
        )}

        {vista === 'semana' && (
          <CalendarioSemana
            fechaBase={fechaActual}
            profesionales={profesionales}
            profesionalesFiltrados={
              isVistaProfe && profesionalPropio
                ? [profesionalPropio]
                : profsFiltrados
            }
            citas={citas}
            onClickCita={handleClickCita}
            onClickCelda={handleClickCelda}
            onVerDia={handleVerDia}
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
                  const horaInicio = cita.inicio.slice(11, 16)
                  const horaFin = cita.fin.slice(11, 16)

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
          cita={citaDetalle}
          isVistaProfe={isVistaProfe}
          onCerrar={() => setCitaDetalle(null)}
          onEditar={handleEditarDesdePanel}
          onEstadoActualizado={handleEstadoActualizado}
        />
      )}
    </div>
  )
}
