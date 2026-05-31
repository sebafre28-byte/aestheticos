import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoEmail = 'confirmacion_cita' | 'recordatorio_cita' | 'cancelacion_cita'

interface DatosCita {
  paciente_nombre: string
  servicio_nombre: string
  profesional_nombre: string
  fecha: string
  hora: string
  clinica_nombre: string
  clinica_telefono?: string
}

interface EmailPayload {
  tipo: TipoEmail
  destinatario: string
  datos: DatosCita
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildHtml(tipo: TipoEmail, datos: DatosCita): string {
  const { paciente_nombre, servicio_nombre, profesional_nombre, fecha, hora, clinica_nombre, clinica_telefono } = datos

  const detailsHtml = `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F8FAFF;border:1px solid #E0E8FF;border-radius:10px;margin:20px 0;">
      <tr><td style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;width:40%;">Servicio</td>
            <td style="padding:6px 0;font-size:13px;color:#0B132B;font-weight:600;">${servicio_nombre}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;">Profesional</td>
            <td style="padding:6px 0;font-size:13px;color:#0B132B;">${profesional_nombre}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;">Fecha</td>
            <td style="padding:6px 0;font-size:13px;color:#0B132B;">${fecha}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;">Hora</td>
            <td style="padding:6px 0;font-size:13px;color:#0B132B;font-weight:600;">${hora}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  `

  const contactHtml = clinica_telefono
    ? `<p style="font-size:13px;color:#6B7280;margin:16px 0 0;">¿Necesitas modificar o cancelar? Contáctanos: <a href="tel:${clinica_telefono}" style="color:#2563EB;text-decoration:none;">${clinica_telefono}</a></p>`
    : `<p style="font-size:13px;color:#6B7280;margin:16px 0 0;">Si necesitas modificar o cancelar tu cita, comunícate directamente con ${clinica_nombre}.</p>`

  const wrapper = (title: string, body: string) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F4F6;">
    <tr><td align="center" style="padding:40px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0B132B;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">SimpliClinic</p>
          <p style="margin:4px 0 0;font-size:13px;color:#94A3B8;">${clinica_nombre}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;text-align:center;">Este es un correo automático de SimpliClinic. Por favor no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  if (tipo === 'confirmacion_cita') {
    return wrapper('Tu cita está confirmada ✓', `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B132B;">¡Tu cita está confirmada!</h1>
      <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
      <p style="font-size:14px;color:#6B7280;margin:0;">Hemos registrado tu cita con todos los detalles a continuación:</p>
      ${detailsHtml}
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">✓ Reserva confirmada</p>
        <p style="margin:4px 0 0;font-size:13px;color:#047857;">Te esperamos el <strong>${fecha}</strong> a las <strong>${hora}</strong>.</p>
      </div>
      ${contactHtml}
    `)
  }

  if (tipo === 'recordatorio_cita') {
    return wrapper('Recordatorio: tu cita es mañana', `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B132B;">Recordatorio de cita</h1>
      <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
      <p style="font-size:14px;color:#6B7280;margin:0;">Te recordamos que tienes una cita mañana:</p>
      ${detailsHtml}
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#1D4ED8;font-weight:600;">📅 Mañana a las ${hora}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#3B82F6;">No olvides llegar unos minutos antes.</p>
      </div>
      ${contactHtml}
    `)
  }

  // cancelacion_cita
  return wrapper('Tu cita ha sido cancelada', `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B132B;">Cita cancelada</h1>
    <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
    <p style="font-size:14px;color:#6B7280;margin:0;">Tu cita ha sido cancelada. Aquí están los detalles de la cita cancelada:</p>
    ${detailsHtml}
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
      <p style="margin:0;font-size:13px;color:#991B1B;font-weight:600;">✕ Cita cancelada</p>
      <p style="margin:4px 0 0;font-size:13px;color:#DC2626;">Si fue un error o deseas reagendar, contáctanos.</p>
    </div>
    ${contactHtml}
  `)
}

function getSubject(tipo: TipoEmail): string {
  if (tipo === 'confirmacion_cita') return 'Tu cita está confirmada ✓'
  if (tipo === 'recordatorio_cita') return 'Recordatorio: tu cita es mañana'
  return 'Tu cita ha sido cancelada'
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: 'RESEND_API_KEY not configured' }, { status: 200 })
  }

  let body: EmailPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body' }, { status: 400 })
  }

  const { tipo, destinatario, datos } = body
  if (!tipo || !destinatario || !datos) {
    return NextResponse.json({ ok: false, reason: 'Missing required fields' }, { status: 400 })
  }

  const html = buildHtml(tipo, datos)
  const subject = getSubject(tipo)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SimpliClinic <noreply@simpliclinic.cl>',
        to: [destinatario],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[email] Resend error:', response.status, errText)
      return NextResponse.json({ ok: false, reason: `Resend error: ${response.status}` }, { status: 200 })
    }

    const result = await response.json()
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[email] Fetch error:', err)
    return NextResponse.json({ ok: false, reason: 'Network error sending email' }, { status: 200 })
  }
}
