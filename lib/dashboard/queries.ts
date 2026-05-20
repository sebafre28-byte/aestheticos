import { montoIngresoCobrado } from '@/lib/cobros/utils'
import { createClient } from '@/lib/supabase/server'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from 'date-fns'

type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

type PagoEstado = 'pendiente' | 'pagado' | 'parcial'

type CitaDashboardRow = {
  id: string
  inicio: string
  estado: EstadoCita
  pago_monto: number
  pago_estado: PagoEstado
  pacientes: { nombre: string }[] | { nombre: string } | null
  profesionales: { nombre: string }[] | { nombre: string } | null
  servicios: { nombre: string; precio: number }[] | { nombre: string; precio: number } | null
  servicio_id: string
}

export type ProximaCitaItem = {
  id: string
  hora: string
  paciente: string
  servicio: string
  profesional: string
  estado: EstadoCita
}

export type TopServicioItem = {
  id: string
  nombre: string
  total: number
}

export type DashboardData = {
  citasHoy: {
    total: number
    confirmadas: number
    pendientes: number
  }
  ingresosHoy: number
  ocupacionSemanal: {
    realizadas: number
    slotsDisponibles: number
    tasa: number
  }
  pacientesNuevos: {
    mesActual: number
    mesAnterior: number
  }
  proximasCitas: ProximaCitaItem[]
  topServicios: TopServicioItem[]
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return {
    nowIso: now.toISOString(),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

function parseHoraToMinutes(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':')
  return Number(h) * 60 + Number(m)
}

function fromMaybeArray<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function countWeekdayOccurrences(weekStart: Date, weekEnd: Date, isoDay: number): number {
  const day = new Date(weekStart)
  let count = 0
  while (day <= weekEnd) {
    const jsDay = day.getDay() === 0 ? 7 : day.getDay()
    if (jsDay === isoDay) count += 1
    day.setDate(day.getDate() + 1)
  }
  return count
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const { nowIso, startIso, endIso } = getTodayRange()
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const previousMonth = subMonths(now, 1)
  const previousMonthStart = startOfMonth(previousMonth)
  const previousMonthEnd = endOfMonth(previousMonth)

  const [
    citasHoyResult,
    citasSemanaCompletadasResult,
    disponibilidadResult,
    duracionPromedioResult,
    pacientesMesActualResult,
    pacientesMesAnteriorResult,
    citasTopServiciosResult,
  ] = await Promise.all([
    supabase
      .from('citas')
      .select(`
        id,
        inicio,
        estado,
        pago_monto,
        pago_estado,
        servicio_id,
        pacientes(nombre),
        profesionales(nombre),
        servicios(nombre, precio)
      `)
      .gte('inicio', startIso)
      .lte('inicio', endIso)
      .order('inicio', { ascending: true }),
    supabase
      .from('citas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'completada')
      .gte('inicio', weekStart.toISOString())
      .lte('inicio', weekEnd.toISOString()),
    supabase
      .from('agenda_disponibilidad')
      .select('dia_semana, hora_inicio, hora_fin')
      .eq('activo', true),
    supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('activo', true),
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString()),
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString()),
    supabase
      .from('citas')
      .select(`
        servicio_id,
        estado,
        servicios(nombre)
      `)
      .gte('inicio', weekStart.toISOString())
      .lte('inicio', weekEnd.toISOString())
      .not('estado', 'in', '("cancelada","no_asistio")'),
  ])

  const citasHoyData = (citasHoyResult.data ?? []) as CitaDashboardRow[]
  const citasHoyValidas = citasHoyData.filter((cita) => cita.estado !== 'cancelada' && cita.estado !== 'no_asistio')

  const totalCitasHoy = citasHoyValidas.length
  const confirmadasHoy = citasHoyValidas.filter((cita) => cita.estado === 'confirmada').length
  const pendientesHoy = citasHoyValidas.filter((cita) => cita.estado === 'pendiente').length
  const ingresosHoy = citasHoyValidas.reduce(
    (acc, cita) => acc + montoIngresoCobrado(cita.pago_estado ?? 'pendiente', cita.pago_monto ?? 0),
    0,
  )

  const proximasCitas = citasHoyValidas
    .filter((cita) => cita.inicio >= nowIso)
    .slice(0, 5)
    .map((cita) => {
      const paciente = fromMaybeArray(cita.pacientes)
      const servicio = fromMaybeArray(cita.servicios)
      const profesional = fromMaybeArray(cita.profesionales)
      return {
        id: cita.id,
        hora: format(new Date(cita.inicio), 'HH:mm'),
        paciente: paciente?.nombre ?? 'Paciente',
        servicio: servicio?.nombre ?? 'Servicio',
        profesional: profesional?.nombre ?? 'Profesional',
        estado: cita.estado,
      }
    })

  const citasRealizadas = citasSemanaCompletadasResult.count ?? 0
  const duraciones = (duracionPromedioResult.data ?? []) as { duracion_minutos: number }[]
  const avgDuracion = duraciones.length
    ? Math.max(
        1,
        Math.round(
          duraciones.reduce((acc, servicio) => acc + (servicio.duracion_minutos || 60), 0) / duraciones.length,
        ),
      )
    : 60

  const disponibilidad = (disponibilidadResult.data ?? []) as {
    dia_semana: number
    hora_inicio: string
    hora_fin: string
  }[]

  const minutosDisponiblesSemana = disponibilidad.reduce((acc, slot) => {
    const minutosSlot = Math.max(0, parseHoraToMinutes(slot.hora_fin) - parseHoraToMinutes(slot.hora_inicio))
    const repeticiones = countWeekdayOccurrences(weekStart, weekEnd, slot.dia_semana)
    return acc + minutosSlot * repeticiones
  }, 0)
  const slotsDisponibles = Math.max(0, Math.floor(minutosDisponiblesSemana / avgDuracion))
  const tasaOcupacion = slotsDisponibles > 0 ? Math.round((citasRealizadas / slotsDisponibles) * 100) : 0

  const topServiciosMap = new Map<string, TopServicioItem>()
  for (const item of citasTopServiciosResult.data ?? []) {
    const row = item as { servicio_id: string; servicios: { nombre: string }[] | { nombre: string } | null }
    const servicio = fromMaybeArray(row.servicios)
    const id = row.servicio_id
    const current = topServiciosMap.get(id)
    if (current) {
      current.total += 1
      continue
    }
    topServiciosMap.set(id, {
      id,
      nombre: servicio?.nombre ?? 'Servicio',
      total: 1,
    })
  }

  const topServicios = Array.from(topServiciosMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return {
    citasHoy: {
      total: totalCitasHoy,
      confirmadas: confirmadasHoy,
      pendientes: pendientesHoy,
    },
    ingresosHoy,
    ocupacionSemanal: {
      realizadas: citasRealizadas,
      slotsDisponibles,
      tasa: tasaOcupacion,
    },
    pacientesNuevos: {
      mesActual: pacientesMesActualResult.count ?? 0,
      mesAnterior: pacientesMesAnteriorResult.count ?? 0,
    },
    proximasCitas,
    topServicios,
  }
}
