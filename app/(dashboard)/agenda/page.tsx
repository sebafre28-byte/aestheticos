import { createClient } from '@/lib/supabase/server'
import { AgendaView } from '@/components/agenda/AgendaView'

export default async function AgendaPage() {
  const supabase = await createClient()
  const [{ data: rol }, { data: profesionalId }] = await Promise.all([
    supabase.rpc('auth_rol_usuario'),
    supabase.rpc('auth_profesional_id'),
  ])

  const esProfe = rol === 'profesional'
  // Si es profesional pero sin profesional_id vinculado, usamos un UUID imposible
  // para que solo vea una agenda vacía (no la de todos)
  const profesionalPropio = esProfe
    ? (profesionalId as string | null) ?? '00000000-0000-0000-0000-000000000000'
    : undefined

  return (
    <AgendaView
      isVistaProfe={esProfe}
      profesionalPropio={profesionalPropio}
    />
  )
}
