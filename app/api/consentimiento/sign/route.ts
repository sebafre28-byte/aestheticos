import { NextResponse, type NextRequest } from 'next/server'
import { firmarSolicitud, getSolicitudByTokenAdmin, CONSENTIMIENTO_DEFAULT } from '@/lib/consentimientos/queries'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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
  const firmado_at = new Date().toISOString()
  await firmarSolicitud(token, firma_img, ip)

  // Enviar email de confirmación al paciente
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const clinicaNombre = solicitud.clinica?.nombre ?? 'Tu clínica'
    const pacienteNombre = solicitud.cita?.pacientes?.nombre ?? 'Paciente'
    const servicioNombre = solicitud.cita?.servicios?.nombre ?? 'Procedimiento'
    const fechaCita = solicitud.cita?.inicio
      ? format(new Date(solicitud.cita.inicio), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })
      : ''
    const fechaFirma = format(new Date(firmado_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })

    const subject = `Consentimiento informado firmado — ${clinicaNombre}`
    const html = buildConfirmacionEmail({ clinicaNombre, pacienteNombre, servicioNombre, fechaCita, fechaFirma })

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'SimpliClinic <onboarding@resend.dev>',
          to: [solicitud.email_destino],
          subject,
          html,
        }),
      })
      if (!res.ok) console.error('[sign] Resend error:', res.status, await res.text())
    } catch (err) {
      console.error('[sign] email error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}

function buildConfirmacionEmail(d: {
  clinicaNombre: string
  pacienteNombre: string
  servicioNombre: string
  fechaCita: string
  fechaFirma: string
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F7;">
  <tr>
    <td align="center" style="padding:36px 16px 48px;">
      <table cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#10B981 100%);padding:32px 36px 24px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">&#10003;&nbsp; DOCUMENTO FIRMADO</p>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Consentimiento registrado</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${d.clinicaNombre}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Hola <strong>${d.pacienteNombre}</strong>,<br/>
              Tu consentimiento informado ha sido registrado exitosamente. Guarda este correo como comprobante.
            </p>
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#ECFDF5;border-radius:10px;border:1px solid #A7F3D0;margin:0 0 20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;">Resumen</p>
                <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Paciente:</strong> ${d.pacienteNombre}</p>
                <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Procedimiento:</strong> ${d.servicioNombre}</p>
                ${d.fechaCita ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Fecha cita:</strong> ${d.fechaCita}</p>` : ''}
                <p style="margin:0;font-size:14px;color:#374151;"><strong>Firmado:</strong> ${d.fechaFirma}</p>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
              Este documento quedará guardado en ${d.clinicaNombre}. Si tienes alguna pregunta, contáctalos directamente.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #F1F5F9;background:#FAFAFA;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">Powered by <strong>SimpliClinic</strong> &mdash; Gestión clínica inteligente</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
