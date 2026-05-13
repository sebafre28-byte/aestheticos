import { NextResponse, type NextRequest } from 'next/server'

import { runHourlyRecordatorios } from '@/lib/whatsapp/jobs'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const stats = await runHourlyRecordatorios()
    return NextResponse.json(stats)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[cron/recordatorios]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
