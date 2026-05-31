import { createClient } from '@/lib/supabase/client'

export type RolUsuario = 'admin' | 'profesional' | 'recepcionista'

export type UsuarioClinica = {
  id: string
  clinica_id: string
  user_id: string | null
  rol: RolUsuario
  nombre: string
  email: string | null
  activo: boolean
  created_at: string
}

export type RolActual = RolUsuario | null

const ROL_LABELS: Record<RolUsuario, string> = {
  admin: 'Administrador',
  profesional: 'Profesional',
  recepcionista: 'Recepcionista',
}

export function rolLabel(rol: RolUsuario): string {
  return ROL_LABELS[rol]
}

export async function getUsuariosClinica(): Promise<UsuarioClinica[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('usuarios_clinica')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as UsuarioClinica[]
}

export async function getRolActual(): Promise<RolActual> {
  const supabase = createClient()
  const { data } = await supabase.rpc('auth_rol_usuario')
  return (data as RolActual) ?? null
}

export async function invitarUsuario(input: {
  nombre: string
  email: string
  rol: RolUsuario
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()

  const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
  if (!clinicaId) return { ok: false, error: 'No se pudo obtener la clínica' }

  const { error } = await supabase.from('usuarios_clinica').insert({
    clinica_id: clinicaId,
    nombre: input.nombre,
    email: input.email,
    rol: input.rol,
    activo: true,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function actualizarRolUsuario(id: string, rol: RolUsuario): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('usuarios_clinica')
    .update({ rol })
    .eq('id', id)
  return !error
}

export async function toggleActivoUsuario(id: string, activo: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('usuarios_clinica')
    .update({ activo })
    .eq('id', id)
  return !error
}

export async function eliminarUsuario(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('usuarios_clinica')
    .delete()
    .eq('id', id)
  return !error
}
