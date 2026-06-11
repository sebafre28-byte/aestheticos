import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ ok: false, error: 'Email requerido' }, { status: 400 })

    // Get usuario_clinica row to get nombre and clinica_id
    const { data: uc } = await supabaseAdmin
      .from('usuarios_clinica')
      .select('nombre, rol, clinica_id')
      .eq('email', email)
      .is('user_id', null)
      .single()

    if (!uc) return NextResponse.json({ ok: false, error: 'Usuario no encontrado o ya activado' })

    // Verify the caller is an admin of the same clinic
    const { data: callerUc } = await supabase
      .from('usuarios_clinica')
      .select('clinica_id, rol')
      .eq('user_id', user.id)
      .eq('clinica_id', uc.clinica_id)
      .maybeSingle()

    if (!callerUc || callerUc.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
    const redirectTo = `${base}/invite/accept`

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { nombre: uc.nombre, rol: uc.rol, clinica_id: uc.clinica_id }, redirectTo },
    })

    if (linkError) return NextResponse.json({ ok: false, error: linkError.message })

    const inviteUrl = linkData?.properties?.action_link
    if (!inviteUrl) return NextResponse.json({ ok: false, error: 'No se pudo generar el link' })

    const { data: clinica } = await supabaseAdmin
      .from('clinicas')
      .select('nombre, logo_url')
      .eq('id', uc.clinica_id)
      .single()

    await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({
        tipo: 'invitacion_equipo',
        destinatario: email,
        datos: {
          nombre_invitado: uc.nombre,
          rol: uc.rol,
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
