import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 })

    // Verify caller is authenticated and belongs to the same clinic
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })

    // Get the target row — use RLS-scoped client so cross-tenant access is blocked by policy
    const { data: row, error: fetchError } = await supabase
      .from('usuarios_clinica')
      .select('user_id, email, clinica_id')
      .eq('id', id)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verify caller is admin/owner of that same clinic
    const { data: membership } = await supabase
      .from('usuarios_clinica')
      .select('rol')
      .eq('user_id', user.id)
      .eq('clinica_id', row.clinica_id)
      .maybeSingle()

    const { data: ownedClinic } = await supabase
      .from('clinicas')
      .select('id')
      .eq('id', row.clinica_id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (membership?.rol !== 'admin' && !ownedClinic) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    // Delete from auth.users if we have a user_id (accepted invite)
    if (row.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(row.user_id)
    } else if (row.email) {
      // Pending invite: find auth user by email and delete
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
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
