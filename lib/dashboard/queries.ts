import { montoIngresoCobrado } from '@/lib/cobros/utils'
import { createClient } from '@/lib/supabase/server'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

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
  ingresos: number
}

export type VentasMesItem = {
  mes: string
  mesIso: string
  ingresos: number
  citas: number
}

export type DashboardData = {
  citasHoy: { total: number; confirmadas: number; pendientes: number }
  ingresosHoy: number
  ingresosMes: number
  ingresosMesAnterior: number
  ocupacionSemanal: { realizadas: number; slotsDisponibles: number; tasa: number }
  pacientesNuevos: { mesActual: number; mesAnterior: number }
  citasMes: { total: number; completadas: number; canceladas: number }
  proximasCitas: ProximaCitaItem[]
  topServicios: TopServicioItem[]
  ventasUltimos6Meses: VentasMesItem[]
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  return { nowIso: now.toISOString(), startIso: start.toISOString(), endIso: end.toISOString() }
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
  const prevMonthStart = startOfMonth(previousMonth)
  const prevMonthEnd = endOfMonth(previousMonth)
  const mes6Start = startOfMonth(subMonths(now, 5))

  const [
    citasHoyResult,
    citasSemanaResult,
    disponibilidadResult,
    duracionPromedioResult,
    pacientesMesResult,
    pacientesPrevResult,
    citasTopResult,
    citasMesResult,
    citasPrevMesResult,
    citas6MesesResult,
  ] = await Promise.all([
    supabase.from('citas').select(`
      id, inicio, estado, pago_monto, pago_estado, servicio_id,
      pacientes(nombre), profesionales(nombre), servicios(nombre, precio)
    `).gte('inicio', startIso).lte('inicio', endIso).order('inicio', { ascending: true }),

    supabase.from('citas').select('id', { count: 'exact', head: true })
      .eq('estado', 'completada')
      .gte('inicio', weekStart.toISOString()).lte('inicio', weekEnd.toISOString()),

    supabase.from('agenda_disponibilidad').select('dia_semana, hora_inicio, hora_fin').eq('activo', true),

    supabase.from('servicios').select('duracion_minutos').eq('activo', true),

    supabase.from('pacientes').select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString()),

    supabase.from('pacientes').select('id', { count: 'exact', head: true })
      .gte('created_at', prevMonthStart.toISOString()).lte('created_at', prevMonthEnd.toISOString()),

    supabase.from('citas').select('servicio_id, estado, pago_monto, pago_estado, servicios(nombre, precio)')
      .gte('inicio', weekStart.toISOString()).lte('inicio', weekEnd.toISOString())
      .not('estado', 'in', '("cancelada","no_asistio")'),

    supabase.from('citas').select('id, estado, pago_monto, pago_estado')
      .gte('inicio', monthStart.toISOString()).lte('inicio', monthEnd.toISOString()),

    supabase.from('citas').select('id, pago_monto, pago_estado, estado')
      .gte('inicio', prevMonthStart.toISOString()).lte('inicio', prevMonthEnd.toISOString()),

    supabase.from('citas').select('inicio, estado, pago_monto, pago_estado')
      .gte('inicio', mes6Start.toISOString())
      .lte('inicio', monthEnd.toISOString())
      .not('estado', 'in', '("cancelada","no_asistio")'),
  ])

  const citasHoyData = (citasHoyResult.data ?? []) as CitaDashboardRow[]
  const citasValidas = citasHoyData.filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio')
  const ingresosHoy = citasValidas.reduce(
    (acc, c) => acc + montoIngresoCobrado(c.pago_estado ?? 'pendiente', c.pago_monto ?? 0), 0,
  )
  const proximasCitas = citasValidas.filter((c) => c.inicio >= nowIso).slice(0, 5).map((c) => ({
    id: c.id,
    hora: format(new Date(c.inicio), 'HH:mm'),
    paciente: fromMaybeArray(c.pacientes)?.nombre ?? 'Paciente',
    servicio: fromMaybeArray(c.servicios)?.nombre ?? 'Servicio',
    profesional: fromMaybeArray(c.profesionales)?.nombre ?? 'Profesional',
    estado: c.estado,
  }))

  const duraciones = (duracionPromedioResult.data ?? []) as { duracion_minutos: number }[]
  const avgDuracion = duraciones.length
    ? Math.max(1, Math.round(duraciones.reduce((a, s) => a + (s.duracion_minutos || 60), 0) / duraciones.length))
    : 60
  const disponibilidad = (disponibilidadResult.data ?? []) as { dia_semana: number; hora_inicio: string; hora_fin: string }[]
  const minDisp = disponibilidad.reduce((acc, slot) => {
    const mins = Math.max(0, parseHoraToMinutes(slot.hora_fin) - parseHoraToMinutes(slot.hora_inicio))
    return acc + mins * countWeekdayOccurrences(weekStart, weekEnd, slot.dia_semana)
  }, 0)
  const slotsDisponibles = Math.max(0, Math.floor(minDisp / avgDuracion))
  const citasRealizadas = citasSemanaResult.count ?? 0
  const tasaOcupacion = slotsDisponibles > 0 ? Math.round((citasRealizadas / slotsDisponibles) * 100) : 0

  type TopRow = { servicio_id: string; pago_monto: number; pago_estado: string; servicios: { nombre: string; precio: number }[] | { nombre: string; precio: number } | null }
  const topMap = new Map<string, TopServicioItem>()
  for (const item of (citasTopResult.data ?? []) as unknown as TopRow[]) {
    const s = fromMaybeArray(item.servicios)
    const id = item.servicio_id
    const ingreso = montoIngresoCobrado(item.pago_estado as PagoEstado ?? 'pendiente', item.pago_monto ?? 0)
    const cur = topMap.get(id)
    if (cur) { cur.total += 1; cur.ingresos += ingreso }
    else topMap.set(id, { id, nombre: s?.nombre ?? 'Servicio', total: 1, ingresos: ingreso })
  }
  const topServicios = Array.from(topMap.values()).sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)

  type PagoRow = { pago_monto: number; pago_estado: string; estado: string }
  const ingresosMes = (citasMesResult.data ?? [] as PagoRow[]).reduce(
    (acc, c) => acc + montoIngresoCobrado(c.pago_estado as PagoEstado ?? 'pendiente', c.pago_monto ?? 0), 0,
  )
  const ingresosMesAnterior = (citasPrevMesResult.data ?? [] as PagoRow[]).reduce(
    (acc, c) => acc + montoIngresoCobrado(c.pago_estado as PagoEstado ?? 'pendiente', c.pago_monto ?? 0), 0,
  )
  const citasMesTodos = (citasMesResult.data ?? []) as PagoRow[]
  const citasMesCompletadas = citasMesTodos.filter((c) => c.estado === 'completada').length
  const citasMesCanceladas = citasMesTodos.filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio').length

  type Cita6Row = { inicio: string; pago_monto: number; pago_estado: string }
  const ventasMapa = new Map<string, { ingresos: number; citas: number }>()
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const key = format(m, 'yyyy-MM')
    ventasMapa.set(key, { ingresos: 0, citas: 0 })
  }
  for (const c of (citas6MesesResult.data ?? []) as Cita6Row[]) {
    const key = c.inicio.slice(0, 7)
    const entry = ventasMapa.get(key)
    if (!entry) continue
    entry.citas += 1
    entry.ingresos += montoIngresoCobrado(c.pago_estado as PagoEstado ?? 'pendiente', c.pago_monto ?? 0)
  }
  const ventasUltimos6Meses: VentasMesItem[] = Array.from(ventasMapa.entries()).map(([key, val]) => {
    const [year, month] = key.split('-')
    const d = new Date(Number(year), Number(month) - 1, 1)
    return {
      mes: format(d, 'MMM', { locale: es }).replace('.', ''),
      mesIso: key,
      ingresos: val.ingresos,
      citas: val.citas,
    }
  })

  return {
    citasHoy: {
      total: citasValidas.length,
      confirmadas: citasValidas.filter((c) => c.estado === 'confirmada').length,
      pendientes: citasValidas.filter((c) => c.estado === 'pendiente').length,
    },
    ingresosHoy,
    ingresosMes,
    ingresosMesAnterior,
    ocupacionSemanal: { realizadas: citasRealizadas, slotsDisponibles, tasa: tasaOcupacion },
    pacientesNuevos: { mesActual: pacientesMesResult.count ?? 0, mesAnterior: pacientesPrevResult.count ?? 0 },
    citasMes: { total: citasMesTodos.length, completadas: citasMesCompletadas, canceladas: citasMesCanceladas },
    proximasCitas,
    topServicios,
    ventasUltimos6Meses,
  }
}
