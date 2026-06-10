import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { syncCitaToGoogle } from '@/lib/google-calendar/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Get clinica_id
  const { data: ucData } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()
  let clinicaId = ucData?.clinica_id as string | null
  if (!clinicaId) {
    const { data: own } = await supabase.from('clinicas').select('id').eq('owner_id', user.id).maybeSingle()
    clinicaId = own?.id ?? null
  }
  if (!clinicaId) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 400 })

  // Check token exists
  const { data: token } = await sb
    .from('google_calendar_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinicaId)
    .maybeSingle()

  if (!token) return NextResponse.json({ error: 'Google Calendar no conectado' }, { status: 400 })

  // Fetch citas: last 7 days + next 60 days
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const hasta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: citas } = await sb
    .from('citas')
    .select('id')
    .eq('clinica_id', clinicaId)
    .gte('inicio', `${desde}T00:00:00`)
    .lte('inicio', `${hasta}T23:59:59`)
    .not('estado', 'eq', 'cancelada')

  if (!citas || citas.length === 0) return NextResponse.json({ synced: 0, failed: 0 })

  let synced = 0
  let failed = 0
  for (const cita of citas) {
    const ok = await syncCitaToGoogle(cita.id, user.id, clinicaId, 'create')
    if (ok) synced++
    else failed++
  }

  if (synced === 0 && failed > 0) {
    return NextResponse.json(
      { error: 'No se pudo sincronizar. Verifica GOOGLE_CLIENT_ID/SECRET en variables de entorno de Vercel o reconecta Google Calendar.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ synced, failed })
}
