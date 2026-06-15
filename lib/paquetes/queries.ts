'use client'

import { createClient } from '@/lib/supabase/client'

export type Paquete = {
  id: string
  clinica_id: string
  nombre: string
  servicio_id: string
  sesiones_total: number
  precio: number
  activo: boolean
  created_at: string
  servicios?: { nombre: string } | null
}

export type PaqueteVendido = {
  id: string
  clinica_id: string
  paquete_id: string
  paciente_id: string
  sesiones_total: number
  sesiones_usadas: number
  precio_pagado: number
  activo: boolean
  vendido_at: string
  notas: string | null
  paquetes?: { nombre: string; servicio_id: string; servicios?: { nombre: string } | null } | null
}

// ─── Paquetes de la clínica ───────────────────────────────────────────────────

export async function getPaquetes(soloActivos = false): Promise<Paquete[]> {
  const supabase = createClient()
  let q = supabase
    .from('paquetes')
    .select('*, servicios(nombre)')
    .order('nombre')
  if (soloActivos) q = q.eq('activo', true)
  const { data } = await q
  return (data ?? []) as Paquete[]
}

export async function crearPaquete(input: {
  nombre: string
  servicio_id: string
  sesiones_total: number
  precio: number
}): Promise<Paquete | null> {
  const supabase = createClient()
  const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
  if (!clinicaId) return null
  const { data, error } = await supabase
    .from('paquetes')
    .insert({ ...input, clinica_id: clinicaId })
    .select('*, servicios(nombre)')
    .single()
  if (error) { console.error('crearPaquete:', error); return null }
  return data as Paquete
}

export async function actualizarPaquete(id: string, input: Partial<Pick<Paquete, 'nombre' | 'sesiones_total' | 'precio' | 'activo' | 'servicio_id'>>): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('paquetes').update(input).eq('id', id)
  return !error
}

// ─── Paquetes vendidos a un paciente ─────────────────────────────────────────

export async function getPaquetesVendidos(pacienteId: string, soloActivos = true): Promise<PaqueteVendido[]> {
  const supabase = createClient()
  let q = supabase
    .from('paquetes_vendidos')
    .select('*, paquetes(nombre, servicio_id, servicios(nombre))')
    .eq('paciente_id', pacienteId)
    .order('vendido_at', { ascending: false })
  if (soloActivos) q = q.eq('activo', true)
  const { data } = await q
  return (data ?? []) as PaqueteVendido[]
}

export async function venderPaquete(input: {
  paquete_id: string
  paciente_id: string
  sesiones_total: number
  precio_pagado: number
  notas?: string
}): Promise<PaqueteVendido | null> {
  const supabase = createClient()
  const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
  if (!clinicaId) return null
  const { data, error } = await supabase
    .from('paquetes_vendidos')
    .insert({ ...input, clinica_id: clinicaId })
    .select('*, paquetes(nombre, servicio_id, servicios(nombre))')
    .single()
  if (error) { console.error('venderPaquete:', error); return null }
  return data as PaqueteVendido
}

export async function usarSesionPaquete(paqueteVendidoId: string): Promise<{ sesiones_usadas: number; sesiones_total: number } | null> {
  const supabase = createClient()
  // Read current, then increment
  const { data: current } = await supabase
    .from('paquetes_vendidos')
    .select('sesiones_usadas, sesiones_total')
    .eq('id', paqueteVendidoId)
    .single()
  if (!current) return null

  if (current.sesiones_usadas >= current.sesiones_total) return null

  const nuevasUsadas = current.sesiones_usadas + 1
  const { error } = await supabase
    .from('paquetes_vendidos')
    .update({
      sesiones_usadas: nuevasUsadas,
      activo: nuevasUsadas < current.sesiones_total,
    })
    .eq('id', paqueteVendidoId)
  if (error) { console.error('usarSesionPaquete:', error); return null }
  return { sesiones_usadas: nuevasUsadas, sesiones_total: current.sesiones_total }
}

export async function getPaquetesActivosPaciente(pacienteId: string): Promise<PaqueteVendido[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('paquetes_vendidos')
    .select('*, paquetes(nombre, servicio_id, servicios(nombre))')
    .eq('paciente_id', pacienteId)
    .eq('activo', true)
    .lt('sesiones_usadas', 99999)
    .order('vendido_at', { ascending: false })
  return (data ?? []) as PaqueteVendido[]
}
