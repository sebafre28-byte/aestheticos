import { NextResponse, type NextRequest } from 'next/server'
import { createHmac } from 'node:crypto'
import { handleFlowWebhook } from '@/lib/subscriptions/flow'

export const runtime = 'nodejs'

function verifySignature(params: Record<string, string>): boolean {
  const secret = process.env.FLOW_SECRET_KEY
  if (!secret) return false
  const { s, ...rest } = params
  if (!s) return false
  const toSign = Object.keys(rest).sort().map(k => `${k}${rest[k]}`).join('')
  const expected = createHmac('sha256', secret).update(toSign).digest('hex')
  return expected === s
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const body = Object.fromEntries(formData.entries()) as Record<string, string>

  if (!verifySignature(body)) {
    console.warn('[flow/webhook] firma inválida', body)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const result = await handleFlowWebhook(body)
  if (!result.handled) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
