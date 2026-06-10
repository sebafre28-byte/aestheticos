import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'

  if (error || !code || !userId) {
    return NextResponse.redirect(`${origin}/mi-cuenta?google=error`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${origin}/api/auth/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${origin}/mi-cuenta?google=error`)
  }

  if (!tokenData.refresh_token) {
    return NextResponse.redirect(`${origin}/mi-cuenta?google=error`)
  }

  const supabase = await createClient()
  const miembro = await getClinicaIdForUser(supabase, userId)
  if (!miembro) return NextResponse.redirect(`${origin}/mi-cuenta?google=error`)

  const tokenExpiry = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()

  const { error: upsertError } = await supabase.from('google_calendar_tokens').upsert({
    user_id: userId,
    clinica_id: miembro.clinicaId,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_expiry: tokenExpiry,
    calendar_id: 'primary',
    scope: tokenData.scope ?? null,
    sync_mode: 'push_only',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id', ignoreDuplicates: false })

  if (upsertError) {
    console.error('Error saving google token:', upsertError)
    return NextResponse.redirect(`${origin}/mi-cuenta?google=error`)
  }

  const isAdmin = miembro.rol === 'admin'
  if (isAdmin) {
    return NextResponse.redirect(`${origin}/configuracion?tab=google_calendar&google=success`)
  }
  return NextResponse.redirect(`${origin}/mi-cuenta?google=success`)
}
