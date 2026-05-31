import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { handleInboundTwilioMessage } from '@/lib/whatsapp/jobs'

export const runtime = 'nodejs'

// ─── Twilio helpers ───────────────────────────────────────────

function canonicalWebhookUrl(request: NextRequest): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  return `${base}/api/whatsapp/webhook`
}

function twilioEmptyOk() {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

// ─── Meta helpers ─────────────────────────────────────────────

function verifyMetaSignature(rawBody: Buffer, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret) {
    console.warn('[whatsapp/webhook] META_APP_SECRET no configurado, saltando verificación de firma')
    return true
  }
  if (!signature?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = signature.slice('sha256='.length)
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}

type MetaMessage = {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
}

type MetaWebhookPayload = {
  object?: string
  entry?: Array<{
    id: string
    changes?: Array<{
      value?: {
        messaging_product?: string
        metadata?: { phone_number_id?: string }
        messages?: MetaMessage[]
        statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>
      }
      field?: string
    }>
  }>
}

async function handleMetaPost(request: NextRequest): Promise<NextResponse> {
  const rawBody = Buffer.from(await request.arrayBuffer())
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[whatsapp/webhook/meta] firma inválida')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: MetaWebhookPayload
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as MetaWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (e) {
    console.error('[whatsapp/webhook/meta] createAdminClient falló:', e)
    return NextResponse.json({ ok: true })
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value || change.field !== 'messages') continue

      // Status updates (delivered, read, failed)
      for (const status of value.statuses ?? []) {
        const estadoMap: Record<string, string> = {
          sent: 'enviado',
          delivered: 'entregado',
          read: 'leido',
          failed: 'fallido',
        }
        const nuevoEstado = estadoMap[status.status]
        if (nuevoEstado) {
          await supabase
            .from('mensajes_inbox')
            .update({ estado_whatsapp: nuevoEstado })
            .eq('wamid', status.id)
        }
      }

      // Inbound messages
      const phoneNumberId = value.metadata?.phone_number_id ?? ''
      for (const msg of value.messages ?? []) {
        if (msg.type !== 'text') continue
        const texto = msg.text?.body ?? ''
        const from = `+${msg.from}`

        // Upsert conversacion
        const { data: conv, error: convErr } = await supabase
          .from('conversaciones')
          .select('id, clinica_id')
          .eq('telefono', from)
          .maybeSingle()

        if (convErr || !conv) {
          console.warn('[whatsapp/webhook/meta] conversacion no encontrada para', from, convErr)
          continue
        }

        await supabase.from('mensajes_inbox').insert({
          conversacion_id: conv.id,
          clinica_id: conv.clinica_id,
          direccion: 'entrante',
          contenido: texto,
          tipo: 'texto',
          estado_whatsapp: 'entregado',
          wamid: msg.id,
        })

        console.log('[whatsapp/webhook/meta] mensaje entrante guardado', { from, wamid: msg.id, phoneNumberId })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// ─── GET — Meta webhook verification ─────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('[whatsapp/webhook/meta] verificación exitosa')
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — route by provider ─────────────────────────────────

export async function POST(request: NextRequest) {
  const provider = (process.env.WHATSAPP_PROVIDER ?? 'twilio').toLowerCase()

  if (provider === 'meta') {
    return handleMetaPost(request)
  }

  // Default: Twilio
  let supabase
  try {
    supabase = createAdminClient()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[whatsapp/webhook]', msg)
    return twilioEmptyOk()
  }

  const form = await request.formData()
  const params: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === 'string') params[key] = value
  })

  const from = params.From ?? ''
  const body = params.Body ?? ''
  const signature = request.headers.get('X-Twilio-Signature')

  const r = await handleInboundTwilioMessage({
    supabase,
    from,
    body,
    signature,
    requestUrl: canonicalWebhookUrl(request),
    formParams: params,
  })

  if (!r.handled && r.detail === 'firma inválida') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return twilioEmptyOk()
}
