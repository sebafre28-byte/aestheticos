import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 })

    // Verify caller is authenticated and belongs to the same clinic
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })

    // Get the usuarios_clinica row to find user_id and email
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('usuarios_clinica')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Delete from auth.users if we have a user_id (accepted invite)
    if (row.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(row.user_id)
    } else if (row.email) {
      // Pending invite: find auth user by email and delete
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      const authUser = authUsers?.users?.find(u => u.email === row.email)
      if (authUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      }
    }

    // Delete from usuarios_clinica
    const { error: deleteError } = await supabaseAdmin
      .from('usuarios_clinica')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
