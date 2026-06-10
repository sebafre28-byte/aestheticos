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
  const { data, error } = await supabase.rpc('cancelar_cita_por_token', { p_token: token })

  if (error) {
    console.error('[book/cancelar] RPC error:', error)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }

  const result = data as {
    ok: boolean
    error?: string
    estado?: string
    cita_id?: string
    inicio?: string
    fin?: string
    paciente_nombre?: string
    paciente_email?: string
    paciente_telefono?: string
    servicio_nombre?: string
    profesional_nombre?: string
    clinica_nombre?: string
    clinica_email?: string
    clinica_telefono?: string
    clinica_direccion?: string
    clinica_logo_url?: string
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  // Fire patient + admin notifications via notificar-cita (non-blocking)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
  const secret = process.env.CRON_SECRET ?? ''

  fetch(`${base}/api/notificar-cita`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify({
      tipo: 'cancelacion',
      paciente: {
        nombre:   result.paciente_nombre!,
        email:    result.paciente_email,
        telefono: result.paciente_telefono,
      },
      profesional: { nombre: result.profesional_nombre! },
      servicio:    { nombre: result.servicio_nombre! },
      clinica: {
        nombre:    result.clinica_nombre!,
        email:     result.clinica_email,
        telefono:  result.clinica_telefono,
        direccion: result.clinica_direccion,
        logo_url:  result.clinica_logo_url,
      },
      inicio: result.inicio!,
      fin:    result.fin!,
      canal:  'book',
    }),
  }).catch((err) => console.error('[book/cancelar] notificar error:', err))

  return NextResponse.json({ ok: true })
}
