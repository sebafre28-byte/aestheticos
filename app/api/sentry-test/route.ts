import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  Sentry.captureException(new Error('Test server-side Sentry — SimpliClinic ✓'))
  return NextResponse.json({ ok: true, message: 'Error enviado a Sentry desde servidor' })
}
