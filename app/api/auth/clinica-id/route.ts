import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await supabase.from('usuarios_clinica').select('clinica_id').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ clinica_id: data?.clinica_id ?? null })
}
