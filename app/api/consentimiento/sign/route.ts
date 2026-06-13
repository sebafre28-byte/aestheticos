import { NextResponse, type NextRequest } from 'next/server'
import { firmarSolicitud, getSolicitudByTokenAdmin } from '@/lib/consentimientos/queries'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const solicitud = await getSolicitudByTokenAdmin(token)
  if (!solicitud) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ solicitud })
}

export async function POST(request: NextRequest) {
  const { token, firma_img } = await request.json() as { token?: string; firma_img?: string }
  if (!token || !firma_img) return NextResponse.json({ error: 'token y firma_img requeridos' }, { status: 400 })

  const solicitud = await getSolicitudByTokenAdmin(token)
  if (!solicitud) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (solicitud.estado === 'firmado') return NextResponse.json({ error: 'Ya fue firmado' }, { status: 409 })
  if (new Date(solicitud.expires_at) < new Date()) return NextResponse.json({ error: 'El link expiró' }, { status: 410 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  await firmarSolicitud(token, firma_img, ip)

  return NextResponse.json({ ok: true })
}
