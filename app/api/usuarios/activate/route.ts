import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient()

// Called after invite acceptance to link auth.user to usuarios_clinica row
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  // Use admin client to bypass RLS — a recepcionista can't update their own row
  const { error } = await supabaseAdmin
    .from('usuarios_clinica')
    .update({ user_id: user.id })
    .eq('email', user.email!)
    .is('user_id', null)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({ ok: true })
}
