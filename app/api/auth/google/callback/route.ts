import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/configuracion?google=error', req.url))

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) return NextResponse.redirect(new URL('/configuracion?google=error', req.url))

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL('/configuracion?google=no_refresh_token', req.url))
  }

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.redirect(new URL('/configuracion?google=error', req.url))

  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('google_calendar_tokens').upsert({
    user_id: user.id,
    clinica_id: miembro.clinicaId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expiry: expiryDate,
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,clinica_id' })

  return NextResponse.redirect(new URL('/configuracion?google=success', req.url))
}
