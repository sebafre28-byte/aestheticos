import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoEmail =
  | 'confirmacion_cita'
  | 'nueva_reserva_admin'
  | 'recordatorio_cita'
  | 'cancelacion_cita'

export interface DatosCita {
  paciente_nombre: string
  paciente_telefono?: string
  paciente_email?: string
  servicio_nombre: string
  profesional_nombre: string
  fecha: string          // "martes 18 de junio"
  hora: string           // "15:00"
  hora_fin?: string      // "16:00"
  clinica_nombre: string
  clinica_telefono?: string
  clinica_email?: string
  clinica_direccion?: string
  canal?: 'book' | 'agenda' | 'whatsapp'
}

interface EmailPayload {
  tipo: TipoEmail
  destinatario: string
  datos: DatosCita
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function wrapper(title: string, headerColor: string, headerIcon: string, body: string, clinicaNombre: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F4F6;">
    <tr><td align="center" style="padding:40px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
        <!-- Header -->
        <tr><td style="background:#0B132B;padding:28px 32px;border-radius:16px 16px 0 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
            <tr>
              <td>
                <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">SimpliClinic</p>
                <p style="margin:4px 0 0;font-size:13px;color:#94A3B8;">${clinicaNombre}</p>
              </td>
              <td align="right">
                <div style="background:${headerColor};border-radius:50%;width:42px;height:42px;display:inline-block;text-align:center;line-height:42px;font-size:20px;">${headerIcon}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#FFFFFF;padding:32px 32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F9FAFB;padding:18px 32px;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;line-height:1.5;">
            Este es un correo automático generado por <strong>SimpliClinic</strong>. Por favor no respondas a este mensaje.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function detailsTable(datos: DatosCita): string {
  const horaDisplay = datos.hora_fin ? `${datos.hora} – ${datos.hora_fin}` : datos.hora
  const rows = [
    ['Servicio', datos.servicio_nombre],
    ['Profesional', datos.profesional_nombre],
    ['Fecha', datos.fecha],
    ['Hora', horaDisplay],
    ...(datos.clinica_direccion ? [['Dirección', datos.clinica_direccion] as [string, string]] : []),
  ]

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F8FAFF;border:1px solid #E0E8FF;border-radius:10px;margin:20px 0;">
      <tr><td style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6B7280;width:38%;vertical-align:top;">${label}</td>
            <td style="padding:6px 0;font-size:13px;color:#0B132B;font-weight:600;">${value}</td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>
  `
}

function canalBadge(canal?: string): string {
  if (canal !== 'book') return ''
  return `<span style="display:inline-block;background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;margin-left:8px;vertical-align:middle;">Reserva online</span>`
}

function whatsappCTA(telefono: string, mensaje: string): string {
  const waNumber = telefono.replace(/\D/g, '')
  const waMsg = encodeURIComponent(mensaje)
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
      <tr>
        <td style="border-radius:8px;background:#25D366;">
          <a href="https://wa.me/${waNumber}?text=${waMsg}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">💬 Contáctanos por WhatsApp</a>
        </td>
      </tr>
    </table>
  `
}

function primaryCTA(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
      <tr>
        <td style="border-radius:8px;background:#2563EB;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;">${text}</a>
        </td>
      </tr>
    </table>
  `
}

function buildHtml(tipo: TipoEmail, datos: DatosCita): string {
  const {
    paciente_nombre,
    paciente_telefono,
    paciente_email,
    clinica_nombre,
    clinica_telefono,
    clinica_email,
    canal,
  } = datos

  const details = detailsTable(datos)

  if (tipo === 'confirmacion_cita') {
    const ctaHtml = clinica_telefono
      ? whatsappCTA(clinica_telefono, `Hola, soy ${paciente_nombre} y tengo una cita el ${datos.fecha} a las ${datos.hora}.`)
      : ''

    return wrapper(
      'Tu cita está confirmada ✓',
      '#10B981',
      '✓',
      `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0B132B;letter-spacing:-0.3px;">¡Tu cita está confirmada!</h1>
        <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
        <p style="font-size:14px;color:#6B7280;margin:0;">Hemos registrado tu cita con todos los detalles a continuación:</p>
        ${details}
        <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
          <p style="margin:0;font-size:13px;color:#065F46;font-weight:600;">✓ Reserva confirmada</p>
          <p style="margin:6px 0 0;font-size:13px;color:#047857;">Te esperamos el <strong>${datos.fecha}</strong> a las <strong>${datos.hora}</strong>. Por favor llega 10 minutos antes.</p>
        </div>
        <p style="font-size:13px;color:#6B7280;margin:16px 0 0;">Si necesitas cancelar o modificar tu cita, avísanos con anticipación.</p>
        ${ctaHtml}
      `,
      clinica_nombre,
    )
  }

  if (tipo === 'nueva_reserva_admin') {
    const badge = canalBadge(canal)
    const agendaUrl = 'https://simpliclinic.vercel.app/agenda'
    const contactInfo = `
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 18px;margin-top:16px;">
        <p style="margin:0;font-size:12px;color:#1D4ED8;font-weight:600;">📋 Información del paciente</p>
        <p style="margin:6px 0 0;font-size:13px;color:#1e3a8a;">
          ${paciente_nombre} · ${paciente_telefono ?? '—'} · ${paciente_email ?? 'sin email'}
        </p>
      </div>
    `

    return wrapper(
      'Nueva reserva recibida 📅',
      '#2563EB',
      '📅',
      `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0B132B;letter-spacing:-0.3px;">Nueva reserva recibida ${badge}</h1>
        <p style="font-size:14px;color:#6B7280;margin:0;">Se ha registrado una nueva cita en tu agenda.</p>
        ${details}
        ${contactInfo}
        ${primaryCTA('Ver en agenda →', agendaUrl)}
        <p style="font-size:12px;color:#9CA3AF;margin:16px 0 0;">Este es un aviso automático de SimpliClinic.</p>
      `,
      clinica_nombre,
    )
  }

  if (tipo === 'recordatorio_cita') {
    const ctaHtml = clinica_telefono
      ? whatsappCTA(clinica_telefono, `Hola, soy ${paciente_nombre} y tengo una cita mañana a las ${datos.hora}.`)
      : ''

    return wrapper(
      'Recuerda: tienes una cita mañana ⏰',
      '#2563EB',
      '⏰',
      `
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0B132B;letter-spacing:-0.3px;">Recuerda: tienes una cita mañana</h1>
        <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
        <p style="font-size:14px;color:#6B7280;margin:0;">Te recordamos que tienes una cita programada para mañana:</p>
        ${details}
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
          <p style="margin:0;font-size:13px;color:#1D4ED8;font-weight:600;">⏰ Mañana a las ${datos.hora}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#3B82F6;">Por favor llega 10 minutos antes de tu cita.</p>
        </div>
        ${ctaHtml}
      `,
      clinica_nombre,
    )
  }

  // cancelacion_cita
  const contactLine = clinica_telefono
    ? `<a href="tel:${clinica_telefono}" style="color:#2563EB;text-decoration:none;">${clinica_telefono}</a>`
    : clinica_email
    ? `<a href="mailto:${clinica_email}" style="color:#2563EB;text-decoration:none;">${clinica_email}</a>`
    : clinica_nombre

  return wrapper(
    'Tu cita ha sido cancelada',
    '#EF4444',
    '✕',
    `
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0B132B;letter-spacing:-0.3px;">Tu cita ha sido cancelada</h1>
      <p style="font-size:15px;color:#4B5563;margin:0 0 4px;">Hola, <strong>${paciente_nombre}</strong>.</p>
      <p style="font-size:14px;color:#6B7280;margin:0;">Tu cita ha sido cancelada. Aquí están los detalles:</p>
      ${details}
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#991B1B;font-weight:600;">✕ Cita cancelada</p>
        <p style="margin:6px 0 0;font-size:13px;color:#DC2626;">Si fue un error o deseas reagendar, contáctanos: ${contactLine}</p>
      </div>
    `,
    clinica_nombre,
  )
}

function getSubject(tipo: TipoEmail, datos: DatosCita): string {
  const clinica = datos.clinica_nombre
  if (tipo === 'confirmacion_cita') return `✓ Tu cita está confirmada — ${clinica}`
  if (tipo === 'nueva_reserva_admin') return `📅 Nueva reserva: ${datos.paciente_nombre} · ${datos.fecha}`
  if (tipo === 'recordatorio_cita') return `⏰ Recordatorio: tu cita es mañana — ${clinica}`
  return `Tu cita ha sido cancelada — ${clinica}`
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
  const subject = getSubject(tipo, datos)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'SimpliClinic <onboarding@resend.dev>',
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
