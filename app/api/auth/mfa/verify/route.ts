import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'
import { SignJWT } from 'jose'

export const runtime = 'nodejs'

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

function getMfaSecret() {
  const secret = process.env.MFA_JWT_SECRET
  if (!secret) throw new Error('MFA_JWT_SECRET no configurado')
  return new TextEncoder().encode(secret)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { code } = await request.json() as { code: string }
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: mfaCode } = await db
    .from('mfa_codes')
    .select('id, code_hash, expires_at, used')
    .eq('user_id', user.id)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!mfaCode) return NextResponse.json({ error: 'No hay código activo. Solicita uno nuevo.' }, { status: 400 })
  if (new Date(mfaCode.expires_at) < new Date()) return NextResponse.json({ error: 'El código expiró. Solicita uno nuevo.' }, { status: 400 })
  if (mfaCode.code_hash !== hashCode(code)) return NextResponse.json({ error: 'Código incorrecto.' }, { status: 400 })

  // Mark as used
  await db.from('mfa_codes').update({ used: true }).eq('id', mfaCode.id)

  // Sign a JWT cookie valid for 24h
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getMfaSecret())

  const response = NextResponse.json({ ok: true })
  response.cookies.set('mfa_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  })
  return response
}
