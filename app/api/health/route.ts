import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let db = false
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('clinicas').select('id', { count: 'exact', head: true }).limit(1)
    db = !error
  } catch {
    db = false
  }

  return NextResponse.json(
    { ok: db, db, timestamp: new Date().toISOString() },
    { status: db ? 200 : 503 },
  )
}
