import { createClient } from '@/lib/supabase/server'

export type ResumenCaja = {
  fecha: string
  total: number
  efectivo: number
  transferencia: number
  debito: number
  credito: number
  citas: number
  yaCerrado: boolean
  id?: string
  cerrado_por?: string | null
}

export type ComisionProfesional = {
  profesional_id: string
  nombre: string
  comision_porcentaje: number
  citas_cobradas: number
  monto_cobrado: number
  comision_total: number
}

export async function getResumenCajaHoy(): Promise<ResumenCaja> {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: citasData }, { data: cierreData }] = await Promise.all([
    supabase
      .from('citas')
      .select('pago_monto, pago_estado, pago_metodo')
      .gte('inicio', `${hoy}T00:00:00`)
      .lte('inicio', `${hoy}T23:59:59`)
      .in('pago_estado', ['pagado', 'parcial']),
    supabase
      .from('cierres_caja')
      .select('id, total, efectivo, transferencia, debito, credito, cerrado_por')
      .eq('fecha', hoy)
      .maybeSingle(),
  ])

  const citas = citasData ?? []
  const total = citas.reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const efectivo = citas.filter(c => c.pago_metodo === 'efectivo').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const transferencia = citas.filter(c => c.pago_metodo === 'transferencia').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const debito = citas.filter(c => c.pago_metodo === 'debito').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const credito = citas.filter(c => c.pago_metodo === 'credito').reduce((s, c) => s + (c.pago_monto ?? 0), 0)

  return {
    fecha: hoy,
    total,
    efectivo,
    transferencia,
    debito,
    credito,
    citas: citas.length,
    yaCerrado: !!cierreData,
    id: cierreData?.id,
    cerrado_por: cierreData?.cerrado_por ?? null,
  }
}

export async function getHistorialCierres(limit = 30): Promise<{
  id: string; fecha: string; total: number; efectivo: number; transferencia: number; debito: number; credito: number; created_at: string
}[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cierres_caja')
    .select('id, fecha, total, efectivo, transferencia, debito, credito, created_at')
    .order('fecha', { ascending: false })
    .limit(limit)
  return (data ?? []) as { id: string; fecha: string; total: number; efectivo: number; transferencia: number; debito: number; credito: number; created_at: string }[]
}

export async function getComisionesPeriodo(desde: string, hasta: string): Promise<ComisionProfesional[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('citas')
    .select(`
      comision_monto, pago_estado, pago_monto,
      profesional_id,
      profesionales(id, nombre, comision_porcentaje)
    `)
    .gte('inicio', `${desde}T00:00:00`)
    .lte('inicio', `${hasta}T23:59:59`)
    .in('pago_estado', ['pagado', 'parcial'])
    .gt('comision_monto', 0)

  const map = new Map<string, ComisionProfesional>()
  for (const c of (data ?? []) as { comision_monto: number; pago_monto: number; profesional_id: string; profesionales: { id: string; nombre: string; comision_porcentaje: number } | { id: string; nombre: string; comision_porcentaje: number }[] | null }[]) {
    const prof = Array.isArray(c.profesionales) ? c.profesionales[0] : c.profesionales
    if (!prof) continue
    const cur = map.get(prof.id) ?? {
      profesional_id: prof.id,
      nombre: prof.nombre,
      comision_porcentaje: prof.comision_porcentaje,
      citas_cobradas: 0,
      monto_cobrado: 0,
      comision_total: 0,
    }
    cur.citas_cobradas += 1
    cur.monto_cobrado += c.pago_monto ?? 0
    cur.comision_total += c.comision_monto ?? 0
    map.set(prof.id, cur)
  }

  return Array.from(map.values()).sort((a, b) => b.comision_total - a.comision_total)
}
