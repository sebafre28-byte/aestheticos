import { createClient } from '@/lib/supabase/server'
import { AgendaView } from '@/components/agenda/AgendaView'

export default async function AgendaPage() {
  const supabase = await createClient()
  const [{ data: rol }, { data: profesionalId }] = await Promise.all([
    supabase.rpc('auth_rol_usuario'),
    supabase.rpc('auth_profesional_id'),
  ])

  const esProfe = rol === 'profesional'

  return (
    <AgendaView
      isVistaProfe={esProfe}
      profesionalPropio={esProfe && profesionalId ? profesionalId : undefined}
    />
  )
}
