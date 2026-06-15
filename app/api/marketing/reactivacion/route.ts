import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMarketingEmail } from '@/lib/marketing/emails'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: rol } = await supabase.rpc('auth_rol_usuario')
  if (rol !== 'admin' && rol !== 'coordinador') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
  if (!clinicaId) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  const body = await req.json() as { dias: number; mensaje?: string; paciente_ids?: string[] }
  const { dias = 60, mensaje, paciente_ids } = body

  if (dias < 1) return NextResponse.json({ error: 'Días inválido' }, { status: 400 })

  const fechaCorte = new Date()
  fechaCorte.setDate(fechaCorte.getDate() - dias)

  // Get clinica info for email
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('nombre, logo_url, slug')
    .eq('id', clinicaId)
    .single()

  const bookUrl = clinica?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'}/book/${clinica.slug}`
    : null

  // Find patients without appointment since cutoff date
  let q = supabase
    .from('pacientes')
    .select('id, nombre, email')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .not('email', 'is', null)

  if (paciente_ids?.length) {
    q = q.in('id', paciente_ids)
  }

  const { data: pacientes } = await q

  // Filter those with no cita since cutoff
  const { data: citasRecientes } = await supabase
    .from('citas')
    .select('paciente_id')
    .eq('clinica_id', clinicaId)
    .gte('inicio', fechaCorte.toISOString())
    .not('estado', 'eq', 'cancelada')

  const conCitaReciente = new Set((citasRecientes ?? []).map(c => c.paciente_id))

  const inactivos = (pacientes ?? []).filter(p => !conCitaReciente.has(p.id) && p.email)

  let enviados = 0
  let omitidos = 0

  for (const p of inactivos) {
    if (!p.email) continue

    // Check dedup: no reactivation to same patient in last 30 days
    const { data: reciente } = await supabase
      .from('whatsapp_logs')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', p.id)
      .eq('tipo', 'email_reactivacion')
      .gte('enviado_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle()

    if (reciente) { omitidos++; continue }

    const ok = await sendMarketingEmail({
      tipo: 'email_reactivacion',
      destinatario: p.email,
      datos: {
        paciente_nombre: p.nombre,
        clinica_nombre: clinica?.nombre ?? 'La clínica',
        clinica_logo_url: clinica?.logo_url ?? null,
        dias_sin_cita: dias,
        book_url: bookUrl,
        mensaje_personalizado: mensaje ?? null,
      },
    })

    if (ok) {
      await supabase.from('whatsapp_logs').insert({
        clinica_id: clinicaId,
        paciente_id: p.id,
        tipo: 'email_reactivacion',
        enviado_at: new Date().toISOString(),
        canal: 'email',
      })
      enviados++
    }
  }

  return NextResponse.json({ ok: true, enviados, omitidos, total_inactivos: inactivos.length })
}
