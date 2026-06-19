import { NextResponse } from 'next/server'

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'NO CONFIGURADO'
  const clientId = process.env.GOOGLE_CLIENT_ID ?? 'NO CONFIGURADO'
  const redirectUri = `${appUrl}/api/auth/google/callback`

  return NextResponse.json({
    redirect_uri_generada: redirectUri,
    NEXT_PUBLIC_APP_URL: appUrl,
    GOOGLE_CLIENT_ID_inicio: clientId.substring(0, 30),
  })
}
