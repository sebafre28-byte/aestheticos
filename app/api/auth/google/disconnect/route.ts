import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  await supabase.from('google_calendar_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('clinica_id', miembro.clinicaId)

  return NextResponse.json({ ok: true })
}
