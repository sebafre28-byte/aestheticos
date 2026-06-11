import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const calendar_id = (body as Record<string, unknown>)?.calendar_id
  if (!calendar_id || typeof calendar_id !== 'string') {
    return NextResponse.json({ error: 'calendar_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('google_calendar_tokens')
    .update({ calendar_id })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
