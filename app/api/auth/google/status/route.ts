import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('id, calendar_id, updated_at')
    .eq('user_id', user.id)
    .eq('clinica_id', miembro.clinicaId)
    .maybeSingle()

  return NextResponse.json({ connected: !!data, token: data ?? null })
}
