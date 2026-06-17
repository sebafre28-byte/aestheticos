import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaId } from '@/lib/onboarding/queries'

export const runtime = 'nodejs'

// Normalizes a header string for matching
function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

const HEADER_MAP: Record<string, string> = {
  nombre: 'nombre',
  rut: 'rut',
  telefono: 'telefono',
  fono: 'telefono',
  celular: 'telefono',
  email: 'email',
  correo: 'email',
  'correo electronico': 'email',
  'fecha nacimiento': 'fecha_nacimiento',
  nacimiento: 'fecha_nacimiento',
  'fecha de nacimiento': 'fecha_nacimiento',
  genero: 'genero',
  sexo: 'genero',
  direccion: 'direccion',
  domicilio: 'direccion',
  alergias: 'alergias',
  condiciones: 'condiciones',
  notas: 'notas',
  observaciones: 'notas',
}

function mapHeaders(rawHeaders: string[]): Record<number, string> {
  const map: Record<number, string> = {}
  for (let i = 0; i < rawHeaders.length; i++) {
    const key = norm(rawHeaders[i])
    if (HEADER_MAP[key]) map[i] = HEADER_MAP[key]
  }
  return map
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let inQuote = false
    let cell = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++ }
        else inQuote = !inQuote
      } else if ((ch === ',' || ch === ';') && !inQuote) {
        cells.push(cell); cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell)
    rows.push(cells)
  }
  return rows
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null
  // dd/mm/yyyy or dd-mm-yyyy
  const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  // yyyy-mm-dd
  const m2 = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`
  return null
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Solo admins pueden importar' }, { status: 403 })
  }

  const clinicaId = miembro.clinica_id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  let rows: string[][]

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    // Parse XLSX server-side
    const { read, utils } = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = utils.sheet_to_csv(ws)
    rows = parseCSV(data)
  } else {
    const text = await file.text()
    rows = parseCSV(text)
  }

  if (rows.length < 2) {
    return NextResponse.json({ error: 'El archivo no contiene datos' }, { status: 400 })
  }

  // Remove BOM from first cell if present
  rows[0][0] = rows[0][0].replace(/^﻿/, '')

  const headerMap = mapHeaders(rows[0])
  if (!Object.values(headerMap).includes('nombre')) {
    return NextResponse.json({ error: 'No se encontró la columna "Nombre" en el archivo' }, { status: 400 })
  }

  let importados = 0
  let omitidos = 0
  const errores: string[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const record: Record<string, string | null> = {}
    for (const [idx, field] of Object.entries(headerMap)) {
      record[field] = row[Number(idx)]?.trim() || null
    }

    if (!record.nombre) { omitidos++; continue }

    const fechaNacimiento = record.fecha_nacimiento ? normalizeDate(record.fecha_nacimiento) : null

    // Check for duplicate by RUT or phone (within same clinic)
    if (record.rut) {
      const { data: existing } = await supabase
        .from('pacientes')
        .select('id')
        .eq('clinica_id', clinicaId)
        .eq('rut', record.rut)
        .maybeSingle()
      if (existing) { omitidos++; continue }
    }

    const { error } = await supabase.from('pacientes').insert({
      clinica_id: clinicaId,
      nombre: record.nombre,
      rut: record.rut,
      email: record.email,
      telefono: record.telefono,
      fecha_nacimiento: fechaNacimiento,
      genero: record.genero,
      direccion: record.direccion,
      alergias: record.alergias,
      condiciones: record.condiciones,
      notas: record.notas,
      activo: true,
    })

    if (error) {
      errores.push(`Fila ${i + 1} (${record.nombre}): ${error.message}`)
    } else {
      importados++
    }
  }

  return NextResponse.json({ importados, omitidos, errores })
}
