import { AgendaView } from '@/components/agenda/AgendaView'

// Server Component — simplemente renderiza el cliente
// La carga de datos ocurre en los Client Components usando el Supabase browser client
export default function AgendaPage() {
  return <AgendaView />
}
