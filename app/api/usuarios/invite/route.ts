import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, rol, clinica_id } = await request.json()

    if (!nombre || !email || !rol || !clinica_id) {
      return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Generate invite link (does not send email automatically)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
    const redirectTo = `${base}/invite/accept`
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { nombre, rol, clinica_id }, redirectTo },
    })

    if (linkError) {
      const msg = linkError.message.toLowerCase()
      if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('user already')) {
        return NextResponse.json({ ok: false, error: 'Este email ya tiene una cuenta registrada.' })
      }
      return NextResponse.json({ ok: false, error: linkError.message })
    }

    const inviteUrl = linkData?.properties?.action_link
    if (!inviteUrl) {
      return NextResponse.json({ ok: false, error: 'No se pudo generar el link de invitación.' })
    }

    // Get clinic info for the email
    const { data: clinica } = await supabaseAdmin
      .from('clinicas')
      .select('nombre, logo_url')
      .eq('id', clinica_id)
      .single()

    // Send branded invite email via Resend
    await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'invitacion_equipo',
        destinatario: email,
        datos: {
          nombre_invitado: nombre,
          rol,
          clinica_nombre: clinica?.nombre ?? 'tu clínica',
          clinica_logo_url: clinica?.logo_url ?? undefined,
          invite_url: inviteUrl,
        },
      }),
    })

    // Insert into usuarios_clinica
    const { error: insertError } = await supabaseAdmin
      .from('usuarios_clinica')
      .insert({
        clinica_id,
        nombre,
        email,
        rol,
        activo: true,
      })

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
