import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhatsappProvider, toWhatsAppE164 } from '@/lib/whatsapp/provider'

export async function POST(req: NextRequest) {
  const { conversacion_id, contenido } = await req.json() as {
    conversacion_id: string
    contenido: string
  }

  if (!conversacion_id || !contenido?.trim()) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch conversation to get phone number and clinic_id
  const { data: conv, error: convErr } = await supabase
    .from('conversaciones')
    .select('id, telefono, clinica_id')
    .eq('id', conversacion_id)
    .single()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }

  // Send via WhatsApp provider
  const provider = getWhatsappProvider()
  const to = toWhatsAppE164(conv.telefono)
  if (!to) {
    return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 422 })
  }

  const result = await provider.sendWhatsApp({ to, body: contenido.trim() })

  // Persist message regardless of delivery status
  const { data: msg, error: insertErr } = await supabase
    .from('mensajes_inbox')
    .insert({
      conversacion_id: conv.id,
      clinica_id: conv.clinica_id,
      direccion: 'saliente',
      contenido: contenido.trim(),
      tipo: 'texto',
      estado_whatsapp: result.ok ? 'enviado' : 'fallido',
      wamid: result.providerMessageId ?? null,
    })
    .select('id, direccion, contenido, tipo, estado_whatsapp, enviado_por, created_at')
    .single()

  if (insertErr) {
    console.error('[inbox/send] insert error:', insertErr)
    return NextResponse.json({ error: 'Error al guardar mensaje' }, { status: 500 })
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, mensaje: msg }, { status: 207 })
  }

  return NextResponse.json({ ok: true, mensaje: msg })
}
