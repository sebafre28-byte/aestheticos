import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'



export async function POST(request: NextRequest) {
  try {
    // Auth guard — only authenticated admin/owner can invite
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

    const { nombre, email, rol, clinica_id, profesional_id } = await request.json()

    if (!nombre || !email || !rol || !clinica_id) {
      return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify caller belongs to this clinic and is admin/owner
    const { data: membership } = await supabase
      .from('usuarios_clinica')
      .select('rol, clinica_id')
      .eq('user_id', user.id)
      .eq('clinica_id', clinica_id)
      .maybeSingle()

    const { data: ownedClinic } = await supabase
      .from('clinicas')
      .select('id')
      .eq('id', clinica_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    const isAdmin = membership?.rol === 'admin' || !!ownedClinic
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    // Check for duplicate invite within this clinic
    const { data: existing } = await supabaseAdmin
      .from('usuarios_clinica')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: false, error: 'Este email ya pertenece a esta clínica.' })
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

    // Insert into usuarios_clinica FIRST — if it fails, don't send the email
    const row: Record<string, unknown> = { clinica_id, nombre, email, rol, activo: true }
    if (profesional_id) row.profesional_id = profesional_id

    const { error: insertError } = await supabaseAdmin
      .from('usuarios_clinica')
      .insert(row)

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message })
    }

    // Send branded invite email via Resend
    await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' },
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
