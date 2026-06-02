import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoEmail =
  | 'confirmacion_cita'
  | 'nueva_reserva_admin'
  | 'recordatorio_cita'
  | 'cancelacion_cita'
  | 'post_cita'

export interface DatosCita {
  paciente_nombre: string
  paciente_telefono?: string
  paciente_email?: string
  servicio_nombre: string
  profesional_nombre: string
  fecha: string
  hora: string
  hora_fin?: string
  clinica_nombre: string
  clinica_logo_url?: string
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const BRAND = {
  navy:    '#0F172A',
  blue:    '#2563EB',
  blueLight: '#EFF6FF',
  blueMid: '#DBEAFE',
  green:   '#10B981',
  greenLight: '#ECFDF5',
  greenMid:   '#A7F3D0',
  red:     '#EF4444',
  redLight:   '#FEF2F2',
  redMid:     '#FECACA',
  purple:  '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleMid:   '#DDD6FE',
  amber:   '#D97706',
  amberLight: '#FFFBEB',
  amberMid:   '#FDE68A',
  bg:      '#F1F5F9',
  white:   '#FFFFFF',
  gray50:  '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray700: '#334155',
  gray900: '#0F172A',
}

// ─── Shared components ────────────────────────────────────────────────────────

function mapsButtons(direccion: string): string {
  const q = encodeURIComponent(direccion)
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
      <tr>
        <td style="padding-right:8px;">
          <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank"
             style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:#FFFFFF;border:1.5px solid ${BRAND.gray200};border-radius:8px;font-size:12px;font-weight:600;color:${BRAND.gray700};text-decoration:none;">
            <img src="https://www.google.com/favicon.ico" width="14" height="14" alt="" style="vertical-align:middle;" />
            Google Maps
          </a>
        </td>
        <td>
          <a href="https://waze.com/ul?q=${q}" target="_blank"
             style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:#FFFFFF;border:1.5px solid ${BRAND.gray200};border-radius:8px;font-size:12px;font-weight:600;color:${BRAND.gray700};text-decoration:none;">
            <img src="https://www.waze.com/favicon.ico" width="14" height="14" alt="" style="vertical-align:middle;" />
            Waze
          </a>
        </td>
      </tr>
    </table>
  `
}

function detailRow(icon: string, label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.gray100};">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:32px;vertical-align:middle;">
              <div style="width:28px;height:28px;background:${BRAND.blueLight};border-radius:6px;text-align:center;line-height:28px;font-size:14px;">${icon}</div>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <p style="margin:0;font-size:11px;color:${BRAND.gray400};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${label}</p>
              <p style="margin:2px 0 0;font-size:14px;color:${BRAND.gray900};font-weight:600;">${value}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

function buildDetailsCard(datos: DatosCita): string {
  const horaDisplay = datos.hora_fin ? `${datos.hora} – ${datos.hora_fin}` : datos.hora
  const mapsHtml = datos.clinica_direccion ? mapsButtons(datos.clinica_direccion) : ''
  const ubicacionExtra = datos.clinica_direccion ? `
    <tr>
      <td style="padding:10px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:32px;vertical-align:top;padding-top:2px;">
              <div style="width:28px;height:28px;background:${BRAND.blueLight};border-radius:6px;text-align:center;line-height:28px;font-size:14px;">📍</div>
            </td>
            <td style="padding-left:10px;vertical-align:top;">
              <p style="margin:0;font-size:11px;color:${BRAND.gray400};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Dirección</p>
              <p style="margin:2px 0 4px;font-size:14px;color:${BRAND.gray900};font-weight:600;">${datos.clinica_direccion}</p>
              ${mapsHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `
    <div style="background:${BRAND.gray50};border:1.5px solid ${BRAND.gray200};border-radius:12px;padding:4px 20px 4px;margin:24px 0;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        ${detailRow('💆', 'Servicio', datos.servicio_nombre)}
        ${detailRow('👩‍⚕️', 'Te atiende', datos.profesional_nombre)}
        ${detailRow('📅', 'Fecha', datos.fecha)}
        ${detailRow('🕐', 'Hora', horaDisplay)}
        ${ubicacionExtra}
      </table>
    </div>
  `
}

function whatsappButton(telefono: string, mensaje: string): string {
  const num = telefono.replace(/\D/g, '')
  const msg = encodeURIComponent(mensaje)
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
      <tr>
        <td style="background:#25D366;border-radius:10px;">
          <a href="https://wa.me/${num}?text=${msg}" target="_blank"
             style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:-0.1px;">
            💬 Escribir por WhatsApp
          </a>
        </td>
      </tr>
    </table>
  `
}

function primaryButton(text: string, url: string, color = BRAND.blue): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
      <tr>
        <td style="background:${color};border-radius:10px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:-0.1px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

function canalBadge(canal?: string): string {
  if (canal !== 'book') return ''
  return `<span style="display:inline-block;background:${BRAND.blueMid};color:#1D4ED8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;margin-left:8px;vertical-align:middle;letter-spacing:0.2px;">Reserva online</span>`
}

// ─── Master wrapper ────────────────────────────────────────────────────────────

function wrapper(
  title: string,
  accentColor: string,
  heroIcon: string,
  heroTitle: string,
  heroSubtitle: string,
  body: string,
  datos: DatosCita,
): string {
  const { clinica_nombre, clinica_logo_url, clinica_telefono, clinica_email } = datos

  const logoHtml = clinica_logo_url
    ? `<img src="${clinica_logo_url}" width="44" height="44"
         style="border-radius:10px;object-fit:cover;display:block;border:2px solid rgba(255,255,255,0.15);"
         alt="${clinica_nombre}" />`
    : `<div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${BRAND.blue},${BRAND.green});display:inline-block;text-align:center;line-height:44px;font-size:20px;font-weight:800;color:#fff;">
         ${clinica_nombre.charAt(0).toUpperCase()}
       </div>`

  const contactFooter = (clinica_telefono || clinica_email) ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${BRAND.gray50};border-radius:10px;padding:14px 18px;">
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:${BRAND.gray500};font-weight:600;">¿Necesitas ayuda?</p>
              <p style="margin:4px 0 0;font-size:13px;color:${BRAND.gray700};">
                ${clinica_telefono ? `<a href="tel:${clinica_telefono}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">${clinica_telefono}</a>` : ''}
                ${clinica_telefono && clinica_email ? `<span style="color:${BRAND.gray400};padding:0 8px;">·</span>` : ''}
                ${clinica_email ? `<a href="mailto:${clinica_email}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">${clinica_email}</a>` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${BRAND.bg};">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">

      <!-- Top accent stripe -->
      <tr>
        <td style="background:linear-gradient(90deg,${accentColor},${BRAND.blue});height:5px;border-radius:14px 14px 0 0;"></td>
      </tr>

      <!-- Clinic header -->
      <tr>
        <td style="background:${BRAND.navy};padding:20px 28px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
            <tr>
              <td style="vertical-align:middle;width:52px;">${logoHtml}</td>
              <td style="padding-left:14px;vertical-align:middle;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">${clinica_nombre}</p>
                <p style="margin:3px 0 0;font-size:12px;color:${BRAND.gray400};">SimpliClinic · Gestión de citas</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Hero -->
      <tr>
        <td style="background:${accentColor};padding:28px 32px;text-align:center;">
          <div style="font-size:36px;line-height:1;margin-bottom:10px;">${heroIcon}</div>
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">${heroTitle}</h1>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);font-weight:400;">${heroSubtitle}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:${BRAND.white};padding:28px 32px 8px;">
          ${body}
        </td>
      </tr>

      <!-- Contact footer -->
      ${contactFooter}

      <!-- SimpliClinic footer -->
      <tr>
        <td style="background:${BRAND.navy};padding:18px 28px;border-radius:0 0 14px 14px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
            <tr>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:11px;color:${BRAND.gray400};">Correo automático — no responder</p>
              </td>
              <td align="right" style="vertical-align:middle;">
                <p style="margin:0;font-size:13px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">SimpliClinic</p>
                <p style="margin:2px 0 0;font-size:10px;color:${BRAND.gray400};">Tu clínica, más simple.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Email builders ────────────────────────────────────────────────────────────

function buildHtml(tipo: TipoEmail, datos: DatosCita): string {
  const { paciente_nombre, paciente_telefono, paciente_email, clinica_nombre, clinica_telefono, clinica_email, canal } = datos
  const details = buildDetailsCard(datos)

  // ── Confirmación al paciente ──────────────────────────────────────────────
  if (tipo === 'confirmacion_cita') {
    const waBtn = clinica_telefono
      ? whatsappButton(clinica_telefono, `Hola ${clinica_nombre}, soy ${paciente_nombre} y quiero consultar sobre mi cita del ${datos.fecha} a las ${datos.hora}.`)
      : ''
    return wrapper(
      `Tu cita está confirmada — ${clinica_nombre}`,
      BRAND.green,
      '✅',
      '¡Reserva confirmada!',
      `Hola ${paciente_nombre}, todo listo para tu cita.`,
      `
        <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">
          Hemos registrado tu cita exitosamente. Aquí tienes todos los detalles:
        </p>
        ${details}
        <div style="background:${BRAND.greenLight};border-left:4px solid ${BRAND.green};border-radius:0 8px 8px 0;padding:14px 18px;margin:8px 0 20px;">
          <p style="margin:0;font-size:13px;color:#065F46;font-weight:700;">✓ Reserva confirmada</p>
          <p style="margin:5px 0 0;font-size:13px;color:#047857;">
            Te esperamos el <strong>${datos.fecha}</strong> a las <strong>${datos.hora}</strong>.<br/>
            Por favor llega <strong>10 minutos antes</strong> de tu cita.
          </p>
        </div>
        <p style="font-size:13px;color:${BRAND.gray500};margin:0 0 16px;">
          ¿Necesitas cancelar o modificar? Avísanos con anticipación.
        </p>
        ${waBtn}
      `,
      datos,
    )
  }

  // ── Notificación al admin ─────────────────────────────────────────────────
  if (tipo === 'nueva_reserva_admin') {
    const badge = canalBadge(canal)
    const agendaUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpliclinic.vercel.app'
    return wrapper(
      `Nueva reserva — ${clinica_nombre}`,
      BRAND.blue,
      '📋',
      `Nueva reserva recibida ${badge}`,
      `${paciente_nombre} agendó una cita para el ${datos.fecha}.`,
      `
        <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">
          Se ha registrado una nueva cita en tu agenda.
        </p>
        ${details}
        <div style="background:${BRAND.blueLight};border:1.5px solid ${BRAND.blueMid};border-radius:10px;padding:14px 18px;margin:8px 0 20px;">
          <p style="margin:0;font-size:12px;color:#1D4ED8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">👤 Datos del paciente</p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:8px;">
            <tr>
              <td style="font-size:13px;color:#1e3a8a;padding:2px 0;width:90px;font-weight:600;">Nombre</td>
              <td style="font-size:13px;color:#1e3a8a;padding:2px 0;">${paciente_nombre}</td>
            </tr>
            ${paciente_telefono ? `<tr><td style="font-size:13px;color:#1e3a8a;padding:2px 0;font-weight:600;">Teléfono</td><td style="font-size:13px;color:#1e3a8a;padding:2px 0;"><a href="tel:${paciente_telefono}" style="color:${BRAND.blue};text-decoration:none;">${paciente_telefono}</a></td></tr>` : ''}
            ${paciente_email ? `<tr><td style="font-size:13px;color:#1e3a8a;padding:2px 0;font-weight:600;">Email</td><td style="font-size:13px;color:#1e3a8a;padding:2px 0;"><a href="mailto:${paciente_email}" style="color:${BRAND.blue};text-decoration:none;">${paciente_email}</a></td></tr>` : ''}
          </table>
        </div>
        ${primaryButton('Ver en agenda →', `${agendaUrl}/agenda`)}
        <p style="font-size:12px;color:${BRAND.gray400};margin:16px 0 8px;">Aviso automático de SimpliClinic.</p>
      `,
      datos,
    )
  }

  // ── Recordatorio ─────────────────────────────────────────────────────────
  if (tipo === 'recordatorio_cita') {
    const waBtn = clinica_telefono
      ? whatsappButton(clinica_telefono, `Hola ${clinica_nombre}, soy ${paciente_nombre} y quiero consultar sobre mi cita de mañana a las ${datos.hora}.`)
      : ''
    return wrapper(
      `Recordatorio de cita — ${clinica_nombre}`,
      BRAND.blue,
      '⏰',
      'Recuerda: tienes una cita',
      `${datos.fecha} a las ${datos.hora} en ${clinica_nombre}.`,
      `
        <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">
          Hola <strong>${paciente_nombre}</strong>, te recordamos tu cita programada:
        </p>
        ${details}
        <div style="background:${BRAND.blueLight};border-left:4px solid ${BRAND.blue};border-radius:0 8px 8px 0;padding:14px 18px;margin:8px 0 20px;">
          <p style="margin:0;font-size:13px;color:#1D4ED8;font-weight:700;">⏰ Tu cita es el ${datos.fecha} a las ${datos.hora}</p>
          <p style="margin:5px 0 0;font-size:13px;color:#1D4ED8;">
            Te recomendamos llegar <strong>10 minutos antes</strong>.
          </p>
        </div>
        ${waBtn}
      `,
      datos,
    )
  }

  // ── Post-cita ─────────────────────────────────────────────────────────────
  if (tipo === 'post_cita') {
    const waBtn = clinica_telefono
      ? whatsappButton(clinica_telefono, `Hola ${clinica_nombre}, me gustaría agendar una nueva cita.`)
      : ''
    return wrapper(
      `¿Cómo fue tu visita? — ${clinica_nombre}`,
      BRAND.purple,
      '⭐',
      '¿Cómo fue tu experiencia?',
      `Gracias por visitarnos, ${paciente_nombre}.`,
      `
        <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">
          Esperamos que tu visita haya sido excelente. Tu opinión nos ayuda a mejorar.
        </p>
        ${details}
        <div style="background:${BRAND.purpleLight};border-left:4px solid ${BRAND.purple};border-radius:0 8px 8px 0;padding:14px 18px;margin:8px 0 20px;">
          <p style="margin:0;font-size:13px;color:#5B21B6;font-weight:700;">⭐ ¿Te gustó la atención?</p>
          <p style="margin:5px 0 0;font-size:13px;color:#6D28D9;">
            Comparte tu experiencia y ayúdanos a seguir creciendo.
          </p>
        </div>
        <p style="font-size:14px;color:${BRAND.gray700};margin:0 0 12px;">
          ¿Quieres agendar tu próxima cita?
        </p>
        ${waBtn}
      `,
      datos,
    )
  }

  // ── Cancelación ───────────────────────────────────────────────────────────
  const contactLine = clinica_telefono
    ? `<a href="tel:${clinica_telefono}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">${clinica_telefono}</a>`
    : clinica_email
    ? `<a href="mailto:${clinica_email}" style="color:${BRAND.blue};text-decoration:none;font-weight:600;">${clinica_email}</a>`
    : clinica_nombre

  return wrapper(
    `Tu cita fue cancelada — ${clinica_nombre}`,
    BRAND.red,
    '❌',
    'Tu cita fue cancelada',
    `Hola ${paciente_nombre}, te informamos sobre tu cita.`,
    `
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">
        Tu cita ha sido cancelada. Aquí están los detalles:
      </p>
      ${details}
      <div style="background:${BRAND.redLight};border-left:4px solid ${BRAND.red};border-radius:0 8px 8px 0;padding:14px 18px;margin:8px 0 20px;">
        <p style="margin:0;font-size:13px;color:#991B1B;font-weight:700;">✕ Cita cancelada</p>
        <p style="margin:5px 0 0;font-size:13px;color:#DC2626;">
          Si fue un error o deseas reagendar, contáctanos: ${contactLine}
        </p>
      </div>
    `,
    datos,
  )
}

function getSubject(tipo: TipoEmail, datos: DatosCita): string {
  const clinica = datos.clinica_nombre
  if (tipo === 'confirmacion_cita') return `✅ Tu cita está confirmada — ${clinica}`
  if (tipo === 'nueva_reserva_admin') return `📋 Nueva reserva: ${datos.paciente_nombre} · ${datos.fecha} ${datos.hora}`
  if (tipo === 'recordatorio_cita') return `⏰ Recuerda tu cita mañana — ${clinica}`
  if (tipo === 'post_cita') return `⭐ ¿Cómo fue tu visita? — ${clinica}`
  return `❌ Tu cita fue cancelada — ${clinica}`
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
