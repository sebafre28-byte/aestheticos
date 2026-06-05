import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversaciones')
    .select(`
      id, telefono, estado, no_leidos, ultimo_mensaje_at, created_at,
      pacientes(nombre),
      mensajes_inbox(contenido, created_at, direccion)
    `)
    .eq('estado', 'activa')
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(1, { referencedTable: 'mensajes_inbox' })
    .order('created_at', { ascending: false, referencedTable: 'mensajes_inbox' })

  if (error) {
    console.error('[inbox/conversaciones]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const conversaciones = (data ?? []).map(c => ({
    id: c.id,
    telefono: c.telefono,
    estado: c.estado,
    no_leidos: c.no_leidos,
    ultimo_mensaje_at: c.ultimo_mensaje_at,
    paciente_nombre: Array.isArray(c.pacientes) ? (c.pacientes[0]?.nombre ?? null) : ((c.pacientes as { nombre: string } | null)?.nombre ?? null),
    ultimo_mensaje: Array.isArray(c.mensajes_inbox) && c.mensajes_inbox.length > 0
      ? (c.mensajes_inbox[0] as { contenido: string }).contenido
      : '',
  }))

  return NextResponse.json(conversaciones)
}
