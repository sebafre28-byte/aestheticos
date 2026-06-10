// Harness de pruebas E2E del agente IA de agendamiento.
// Simula un mensaje entrante de WhatsApp y devuelve la respuesta del agente
// SIN enviar nada por WhatsApp real. Solo para admins autenticados.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { responderConAgente } from '@/lib/whatsapp/agente'

export const runtime = 'nodejs'

const TELEFONO_DEFAULT = '+56900000001'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Resolver clínica del usuario autenticado
    const { data: clinicaData } = await supabase.rpc('auth_clinica_id')
    const clinicaId = (clinicaData as string | null) ?? null
    if (!clinicaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Solo admins pueden usar el simulador
    const { data: uc } = await supabase
      .from('usuarios_clinica')
      .select('rol')
      .eq('user_id', user.id)
      .eq('clinica_id', clinicaId)
      .maybeSingle()
    if (uc?.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden usar el simulador' }, { status: 403 })
    }

    const body = await request.json().catch(() => null) as { mensaje?: string; telefono?: string } | null
    const mensaje = body?.mensaje?.trim()
    if (!mensaje) return NextResponse.json({ error: 'mensaje requerido' }, { status: 400 })
    const telefono = body?.telefono?.trim() || TELEFONO_DEFAULT

    const admin = createAdminClient()

    // Buscar o crear conversación de prueba para este teléfono + clínica
    const { data: existente } = await admin
      .from('conversaciones')
      .select('id')
      .eq('telefono', telefono)
      .eq('clinica_id', clinicaId)
      .maybeSingle()

    let conversacionId = existente?.id as string | undefined
    if (!conversacionId) {
      const { data: nueva, error: convErr } = await admin
        .from('conversaciones')
        .insert({ telefono, clinica_id: clinicaId, estado: 'activa', no_leidos: 0 })
        .select('id')
        .single()
      if (convErr || !nueva) {
        return NextResponse.json({ error: convErr?.message ?? 'No se pudo crear la conversación' }, { status: 500 })
      }
      conversacionId = nueva.id as string
    }

    // Guardar mensaje entrante simulado
    const { error: msgErr } = await admin.from('mensajes_inbox').insert({
      conversacion_id: conversacionId,
      clinica_id: clinicaId,
      direccion: 'entrante',
      contenido: mensaje,
      tipo: 'texto',
      estado_whatsapp: 'entregado',
    })
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    await admin
      .from('conversaciones')
      .update({ ultimo_mensaje_at: new Date().toISOString() })
      .eq('id', conversacionId)

    // Generar respuesta del agente (sin enviar WhatsApp real)
    const { texto, escalado } = await responderConAgente({
      supabase: admin,
      clinicaId,
      conversacionId,
      telefono,
    })

    if (!texto) {
      return NextResponse.json({
        respuesta: null,
        escalado,
        motivo: 'agente inactivo, sin servicios, o conversación escalada',
      })
    }

    // Guardar la respuesta como mensaje saliente
    await admin.from('mensajes_inbox').insert({
      conversacion_id: conversacionId,
      clinica_id: clinicaId,
      direccion: 'saliente',
      contenido: texto,
      tipo: 'texto',
      estado_whatsapp: 'enviado',
    })
    await admin
      .from('conversaciones')
      .update({ ultimo_mensaje_at: new Date().toISOString() })
      .eq('id', conversacionId)

    return NextResponse.json({ respuesta: texto, escalado })
  } catch (err) {
    console.error('[whatsapp/agente-test]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
