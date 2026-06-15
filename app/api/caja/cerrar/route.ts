import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  const hoy = new Date().toISOString().split('T')[0]

  // Compute totals from today's paid citas
  const { data: citas } = await supabase
    .from('citas')
    .select('pago_monto, pago_metodo')
    .gte('inicio', `${hoy}T00:00:00`)
    .lte('inicio', `${hoy}T23:59:59`)
    .in('pago_estado', ['pagado', 'parcial'])
    .eq('clinica_id', clinicaId)

  const rows = citas ?? []
  const total = rows.reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const efectivo = rows.filter(c => c.pago_metodo === 'efectivo').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const transferencia = rows.filter(c => c.pago_metodo === 'transferencia').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const debito = rows.filter(c => c.pago_metodo === 'debito').reduce((s, c) => s + (c.pago_monto ?? 0), 0)
  const credito = rows.filter(c => c.pago_metodo === 'credito').reduce((s, c) => s + (c.pago_monto ?? 0), 0)

  const { error } = await supabase
    .from('cierres_caja')
    .upsert({ clinica_id: clinicaId, fecha: hoy, total, efectivo, transferencia, debito, credito, cerrado_por: user.id }, { onConflict: 'clinica_id,fecha' })

  if (error) {
    console.error('[caja/cerrar]', error)
    return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, fecha: hoy, total })
}
