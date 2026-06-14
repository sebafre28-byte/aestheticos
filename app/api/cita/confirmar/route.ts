import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  let token: string
  try {
    const body = await req.json()
    token = body.token
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('confirmar_cita_por_token', { p_token: token })

  if (error) {
    console.error('[cita/confirmar] RPC error:', error)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string; estado?: string; cita_id?: string }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
