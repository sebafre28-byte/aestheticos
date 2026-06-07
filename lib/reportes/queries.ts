// Queries de reportes: resumen mensual de citas, ingresos y top servicios (server-side).

import { createClient } from '@/lib/supabase/server'
import { getClinicaId } from '@/lib/onboarding/queries'
import { montoIngresoCobrado } from '@/lib/cobros/utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'

type PagoEstado = 'pendiente' | 'pagado' | 'parcial'
type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

export type CitaReporteRow = {
  id: string
  inicio: string
  estado: string
  pago_monto: number
  pago_estado: string
  paciente: string
  servicio: string
  profesional: string
  precio_servicio: number
}

export type ReporteData = {
  year: number
  month: number
  mesLabel: string
  citas: CitaReporteRow[]
  resumen: {
    totalCitas: number
    completadas: number
    canceladas: number
    pendientes: number
    ingresosTotales: number
    ticketPromedio: number
    pacientesAtendidos: number
  }
  topServicios: { nombre: string; total: number; ingresos: number }[]
}

function fromMaybeArray<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type CitaRaw = {
  id: string
  inicio: string
  estado: EstadoCita
  pago_monto: number
  pago_estado: PagoEstado
  paciente_id: string | null
  pacientes: { nombre: string }[] | { nombre: string } | null
  servicios: { nombre: string; precio: number }[] | { nombre: string; precio: number } | null
  profesionales: { nombre: string }[] | { nombre: string } | null
}

export async function getReporteData(year: number, month: number): Promise<ReporteData> {
  const supabase = await createClient()
  const clinicaId = await getClinicaId()

  const date = new Date(year, month - 1, 1)
  const rangeStart = startOfMonth(date)
  const rangeEnd = endOfMonth(date)
  const mesLabel = format(date, 'MMMM yyyy', { locale: es })

  let query = supabase
    .from('citas')
    .select(`
      id, inicio, estado, pago_monto, pago_estado, paciente_id,
      pacientes(nombre), servicios(nombre, precio), profesionales(nombre)
    `)
    .gte('inicio', rangeStart.toISOString())
    .lte('inicio', rangeEnd.toISOString())
    .order('inicio', { ascending: true })

  if (clinicaId) {
    query = query.eq('clinica_id', clinicaId)
  }

  const { data } = await query

  const rawCitas = (data ?? []) as unknown as CitaRaw[]

  const citas: CitaReporteRow[] = rawCitas.map((c) => {
    const paciente = fromMaybeArray(c.pacientes)
    const servicio = fromMaybeArray(c.servicios)
    const profesional = fromMaybeArray(c.profesionales)
    return {
      id: c.id,
      inicio: c.inicio,
      estado: c.estado,
      pago_monto: c.pago_monto ?? 0,
      pago_estado: c.pago_estado ?? 'pendiente',
      paciente: paciente?.nombre ?? 'Paciente',
      servicio: servicio?.nombre ?? 'Servicio',
      profesional: profesional?.nombre ?? 'Profesional',
      precio_servicio: servicio?.precio ?? 0,
    }
  })

  const completadas = citas.filter((c) => c.estado === 'completada').length
  const canceladas = citas.filter((c) => c.estado === 'cancelada' || c.estado === 'no_asistio').length
  const pendientes = citas.filter((c) => c.estado === 'pendiente').length

  const ingresosTotales = citas.reduce(
    (acc, c) => acc + montoIngresoCobrado(c.pago_estado as PagoEstado, c.pago_monto),
    0,
  )
  const ticketPromedio = completadas > 0 ? ingresosTotales / completadas : 0

  const pacientesAtendidosSet = new Set(
    rawCitas
      .filter((c) => c.estado === 'completada' || c.estado === 'confirmada')
      .map((c) => c.paciente_id)
      .filter((id): id is string => id !== null),
  )
  const pacientesAtendidos = pacientesAtendidosSet.size

  // Top servicios
  const serviciosMap = new Map<string, { total: number; ingresos: number }>()
  for (const c of citas) {
    const cur = serviciosMap.get(c.servicio)
    const ingreso = montoIngresoCobrado(c.pago_estado as PagoEstado, c.pago_monto)
    if (cur) { cur.total += 1; cur.ingresos += ingreso }
    else serviciosMap.set(c.servicio, { total: 1, ingresos: ingreso })
  }
  const topServicios = Array.from(serviciosMap.entries())
    .map(([nombre, val]) => ({ nombre, ...val }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 5)

  return {
    year,
    month,
    mesLabel,
    citas,
    resumen: {
      totalCitas: citas.length,
      completadas,
      canceladas,
      pendientes,
      ingresosTotales,
      ticketPromedio,
      pacientesAtendidos,
    },
    topServicios,
  }
}

export async function getMesesDisponibles(): Promise<{ year: number; month: number; label: string }[]> {
  const now = new Date()
  const meses: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i)
    meses.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, 'MMMM yyyy', { locale: es }),
    })
  }
  return meses
}
