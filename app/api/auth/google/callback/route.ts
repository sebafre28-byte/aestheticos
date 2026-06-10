import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&error=cancelled`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&error=config`)
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[gcal-callback] Token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&error=token`)
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  // Get clinica_id
  const { data: ucData } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let clinicaId = ucData?.clinica_id as string | null
  if (!clinicaId) {
    const { data: clinicaOwn } = await supabase
      .from('clinicas')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    clinicaId = clinicaOwn?.id ?? null
  }

  if (!clinicaId) {
    return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&error=clinica`)
  }

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    clinica_id: clinicaId,
    access_token: tokens.access_token,
    token_expiry: expiry,
  }
  if (tokens.refresh_token) upsertData.refresh_token = tokens.refresh_token

  const { error: upsertError } = await sb
    .from('google_calendar_tokens')
    .upsert(upsertData, { onConflict: 'user_id,clinica_id' })

  if (upsertError) {
    console.error('[gcal-callback] upsert error', upsertError)
    return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&error=save`)
  }

  return NextResponse.redirect(`${appUrl}/mi-cuenta?tab=google&success=connected`)
}
