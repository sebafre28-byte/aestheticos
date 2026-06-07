import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SyncMode = 'push_only' | 'pull_only' | 'bidirectional'
const VALID_SYNC_MODES: SyncMode[] = ['push_only', 'pull_only', 'bidirectional']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sync_mode = (body as Record<string, unknown>)?.sync_mode
  if (!VALID_SYNC_MODES.includes(sync_mode as SyncMode)) {
    return NextResponse.json(
      { error: 'sync_mode must be one of: push_only, pull_only, bidirectional' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('google_calendar_tokens')
    .update({ sync_mode })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
