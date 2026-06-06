import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('email, expires_at, sync_mode')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ connected: !!token, token: token ?? null })
}
