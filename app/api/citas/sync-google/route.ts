import { NextRequest, NextResponse } from 'next/server'
import { syncCitaToGoogle, SyncAction } from '@/lib/google-calendar/sync'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cita_id, action } = body as { cita_id: string; action?: SyncAction }
  if (!cita_id) return NextResponse.json({ error: 'cita_id required' }, { status: 400 })

  try {
    await syncCitaToGoogle(cita_id, action ?? 'update')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[sync-google] Error syncing cita', cita_id, err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
