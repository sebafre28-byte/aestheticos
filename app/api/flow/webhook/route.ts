import { NextResponse, type NextRequest } from 'next/server'
import { handleFlowWebhook } from '@/lib/subscriptions/flow'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const body = Object.fromEntries(formData.entries()) as Record<string, string>
  const result = await handleFlowWebhook(body)
  if (!result.handled) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
