import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data: token, error } = await supabase
    .from('google_calendar_tokens')
    .select('token_expiry, calendar_id, sync_mode')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    // Fallback: sync_mode column may not exist yet — select without it
    const { data: tokenFallback } = await supabase
      .from('google_calendar_tokens')
      .select('token_expiry, calendar_id')
      .eq('user_id', user.id)
      .maybeSingle()
    return NextResponse.json({ connected: !!tokenFallback, token: tokenFallback ?? null })
  }

  return NextResponse.json({ connected: !!token, token: token ?? null })
}
