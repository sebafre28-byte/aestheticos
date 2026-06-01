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

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { nombre, rol, clinica_id },
    })

    if (inviteError) {
      const msg = inviteError.message.toLowerCase()
      if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('user already')) {
        return NextResponse.json({ ok: false, error: 'Este email ya tiene una cuenta registrada.' })
      }
      return NextResponse.json({ ok: false, error: inviteError.message })
    }

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
