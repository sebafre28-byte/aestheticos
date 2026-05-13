import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { handleInboundTwilioMessage } from '@/lib/whatsapp/jobs'

export const runtime = 'nodejs'

function canonicalWebhookUrl(request: NextRequest): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  return `${base}/api/whatsapp/webhook`
}

export async function POST(request: NextRequest) {
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

function twilioEmptyOk() {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}
