import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the clinica_id for the authenticated user.
 * Checks usuarios_clinica first (invited members), then clinicas.owner_id (clinic owners).
 */
export async function getClinicaIdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ clinicaId: string; rol: string } | null> {
  const { data: miembro } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id, rol')
    .eq('user_id', userId)
    .maybeSingle()

  if (miembro?.clinica_id) return { clinicaId: miembro.clinica_id, rol: miembro.rol }

  // Fallback: user is the clinic owner
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (clinica?.id) return { clinicaId: clinica.id, rol: 'admin' }

  return null
}
