import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: miembro } = await supabase
    .from('clinica_miembros')
    .select('clinica_id, rol')
    .eq('user_id', user.id)
    .eq('estado', 'activo')
    .maybeSingle()

  if (!miembro?.clinica_id || miembro.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden exportar' }, { status: 403 })
  }

  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('nombre, rut, email, telefono, fecha_nacimiento, genero, direccion, alergias, condiciones, notas, activo, created_at')
    .eq('clinica_id', miembro.clinica_id)
    .order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const format = request.nextUrl.searchParams.get('format') ?? 'csv'
  const fecha = new Date().toISOString().slice(0, 10)

  const headers = ['Nombre', 'RUT', 'Email', 'Teléfono', 'Fecha de nacimiento', 'Género', 'Dirección', 'Alergias', 'Condiciones', 'Notas', 'Activo', 'Fecha de registro']

  if (format === 'xlsx') {
    const { utils, write } = await import('xlsx')
    const rows = (pacientes ?? []).map(p => ({
      Nombre: p.nombre ?? '',
      RUT: p.rut ?? '',
      Email: p.email ?? '',
      Teléfono: p.telefono ?? '',
      'Fecha de nacimiento': p.fecha_nacimiento ?? '',
      Género: p.genero ?? '',
      Dirección: p.direccion ?? '',
      Alergias: p.alergias ?? '',
      Condiciones: p.condiciones ?? '',
      Notas: (p.notas ?? '').replace(/\n/g, ' '),
      Activo: p.activo ? 'Sí' : 'No',
      'Fecha de registro': p.created_at ? new Date(p.created_at).toLocaleDateString('es-CL') : '',
    }))

    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Pacientes')
    const buf = write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pacientes-${fecha}.xlsx"`,
      },
    })
  }

  // CSV (default)
  const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`
  const lines = (pacientes ?? []).map(p =>
    [
      esc(p.nombre),
      esc(p.rut),
      esc(p.email),
      esc(p.telefono),
      esc(p.fecha_nacimiento),
      esc(p.genero),
      esc(p.direccion),
      esc(p.alergias),
      esc(p.condiciones),
      esc((p.notas ?? '').replace(/\n/g, ' ')),
      p.activo ? 'Sí' : 'No',
      p.created_at ? new Date(p.created_at).toLocaleDateString('es-CL') : '',
    ].join(',')
  )

  const BOM = '﻿'
  const csv = BOM + [headers.join(','), ...lines].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pacientes-${fecha}.csv"`,
    },
  })
}
