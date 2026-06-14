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

  // Send confirmation email (non-blocking)
  supabase.rpc('get_cita_por_token', { p_token: token }).then(({ data: citaData }) => {
    const cita = citaData as {
      ok: boolean; inicio?: string; fin?: string
      paciente_nombre?: string; paciente_email?: string; paciente_telefono?: string
      servicio_nombre?: string; profesional_nombre?: string
      clinica_nombre?: string; clinica_email?: string; clinica_telefono?: string
      clinica_direccion?: string; clinica_logo_url?: string
    } | null
    if (!cita?.ok) return
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
    const secret = process.env.INTERNAL_API_SECRET ?? ''
    return fetch(`${base}/api/notificar-cita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({
        tipo: 'confirmacion',
        paciente: { nombre: cita.paciente_nombre!, email: cita.paciente_email, telefono: cita.paciente_telefono },
        profesional: { nombre: cita.profesional_nombre! },
        servicio: { nombre: cita.servicio_nombre! },
        clinica: { nombre: cita.clinica_nombre!, email: cita.clinica_email, telefono: cita.clinica_telefono, direccion: cita.clinica_direccion, logo_url: cita.clinica_logo_url },
        inicio: cita.inicio!,
        fin: cita.fin!,
        cancel_token: token,
        canal: 'book',
      }),
    })
  }).catch((err) => console.error('[cita/confirmar] notificar error:', err))

  return NextResponse.json({ ok: true })
}
