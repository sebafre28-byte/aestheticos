import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Called after invite acceptance to link auth.user to usuarios_clinica row
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  const { error } = await supabase
    .from('usuarios_clinica')
    .update({ user_id: user.id })
    .eq('email', user.email!)
    .is('user_id', null)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({ ok: true })
}
