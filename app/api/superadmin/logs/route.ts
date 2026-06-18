import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

export async function GET(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const clinica_id = request.nextUrl.searchParams.get('clinica_id')
  if (!clinica_id) return NextResponse.json({ error: 'clinica_id requerido' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('superadmin_logs')
    .select('*')
    .eq('clinica_id', clinica_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
