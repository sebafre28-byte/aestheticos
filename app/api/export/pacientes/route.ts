import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Resolve clinica for this user
  const { data: miembro } = await supabase
    .from('clinica_miembros')
    .select('clinica_id')
    .eq('user_id', user.id)
    .eq('estado', 'activo')
    .maybeSingle()

  if (!miembro?.clinica_id) {
    return NextResponse.json({ error: 'No perteneces a ninguna clínica' }, { status: 403 })
  }

  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('nombre, apellido, rut, email, telefono, fecha_nacimiento, direccion, notas, created_at')
    .eq('clinica_id', miembro.clinica_id)
    .order('apellido')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build CSV
  const header = ['Nombre', 'Apellido', 'RUT', 'Email', 'Teléfono', 'Fecha nacimiento', 'Dirección', 'Notas', 'Fecha registro']
  const rows = (pacientes ?? []).map(p => [
    p.nombre ?? '',
    p.apellido ?? '',
    p.rut ?? '',
    p.email ?? '',
    p.telefono ?? '',
    p.fecha_nacimiento ?? '',
    p.direccion ?? '',
    (p.notas ?? '').replace(/\n/g, ' '),
    p.created_at ? new Date(p.created_at).toLocaleDateString('es-CL') : '',
  ])

  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '﻿' // UTF-8 BOM for Excel compatibility
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pacientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
