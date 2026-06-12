import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()

  // Get authenticated user's clinic
  const { data: clinicaIdData } = await supabase.rpc('auth_clinica_id')
  const clinicaId = clinicaIdData as string | null
  if (!clinicaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar límite de pacientes
  const { count } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId)

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, estado, trial_ends_at')
    .eq('clinica_id', clinicaId)
    .single()

  const limites = { free: 200, pro: 1000, clinica: 5000 }
  const esTrial = sub?.estado === 'trial' && sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date()
  const planKey = esTrial ? 'clinica' : (sub?.plan ?? 'free')
  const limitePacientes = limites[planKey as keyof typeof limites] ?? 200

  if ((count ?? 0) >= limitePacientes) {
    return NextResponse.json({
      error: `Límite de pacientes alcanzado (${limitePacientes}). Actualiza tu plan para agregar más.`,
      codigo: 'LIMITE_PACIENTES',
    }, { status: 403 })
  }

  // Parse body and create patient
  const body = await req.json()
  const { data, error } = await supabase
    .from('pacientes')
    .insert({ ...body, clinica_id: clinicaId })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
