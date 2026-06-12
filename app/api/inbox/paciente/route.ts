import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: clinicaData } = await supabase.rpc('auth_clinica_id')
  const clinicaId = (clinicaData as string | null) ?? null
  if (!clinicaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const telefono = req.nextUrl.searchParams.get('telefono')
  if (!telefono) return NextResponse.json({ error: 'telefono required' }, { status: 400 })

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nombre, rut, email, telefono')
    .eq('clinica_id', clinicaId)
    .eq('telefono', telefono)
    .single()

  if (!paciente) return NextResponse.json(null)

  const { data: citas } = await supabase
    .from('citas')
    .select('id, inicio, fin, estado, servicios(nombre), profesionales(nombre)')
    .eq('paciente_id', paciente.id)
    .eq('clinica_id', clinicaId)
    .order('inicio', { ascending: false })
    .limit(5)

  return NextResponse.json({ ...paciente, citas: citas ?? [] })
}
