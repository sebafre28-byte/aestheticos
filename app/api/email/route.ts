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

// ─── SVG Icons (inline, email-safe) ──────────────────────────────────────────

const ICON = {
  scissors: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  user:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  pin:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  check:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  star:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bell:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  xmark:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  external: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  wsp:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
}

// ─── Master email wrapper ─────────────────────────────────────────────────────

function buildEmail({
  title,
  headerBg,
  heroBg,
  heroIcon,
  heroLabel,
  heroTitle,
  heroSubtitle,
  body,
  datos,
}: {
  title: string
  headerBg: string
  heroBg: string
  heroIcon: string
  heroLabel: string
  heroTitle: string
  heroSubtitle: string
  body: string
  datos: DatosCita
}): string {
  const { clinica_nombre, clinica_logo_url, clinica_telefono, clinica_email } = datos

  const logoHtml = clinica_logo_url
    ? `<img src="${clinica_logo_url}" width="48" height="48" alt="${clinica_nombre}"
         style="border-radius:12px;object-fit:cover;display:block;border:2px solid rgba(255,255,255,0.2);" />`
    : `<table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#2563EB,#14B8A6);text-align:center;vertical-align:middle;">
         <span style="font-size:22px;font-weight:800;color:#ffffff;display:block;line-height:48px;">${clinica_nombre.charAt(0).toUpperCase()}</span>
       </td></tr></table>`

  const contactRow = (clinica_telefono || clinica_email) ? `
    <tr>
      <td style="padding:0 32px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F8FAFF;border:1px solid #E2E8F0;border-radius:12px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;">¿Necesitas ayuda?</p>
              <table cellpadding="0" cellspacing="0" border="0">
                ${clinica_telefono ? `
                <tr>
                  <td style="padding:3px 0;vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="padding-right:8px;vertical-align:middle;">${ICON.phone}</td>
                      <td style="vertical-align:middle;"><a href="tel:${clinica_telefono}" style="font-size:14px;color:#0F172A;text-decoration:none;font-weight:600;">${clinica_telefono}</a></td>
                    </tr></table>
                  </td>
                </tr>` : ''}
                ${clinica_email ? `
                <tr>
                  <td style="padding:3px 0;vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="padding-right:8px;vertical-align:middle;">${ICON.mail}</td>
                      <td style="vertical-align:middle;"><a href="mailto:${clinica_email}" style="font-size:14px;color:#0F172A;text-decoration:none;font-weight:600;">${clinica_email}</a></td>
                    </tr></table>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px 56px;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

      <!-- ══ HEADER ══════════════════════════════════════════════════════ -->
      <tr>
        <td style="background:${headerBg};border-radius:20px 20px 0 0;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;width:56px;">${logoHtml}</td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0;font-size:17px;font-weight:800;color:#FFFFFF;letter-spacing:-0.4px;">${clinica_nombre}</p>
                <p style="margin:3px 0 0;font-size:12px;color:rgba(255,255,255,0.55);font-weight:500;">Confirmación de reserva · SimpliClinic</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ══ HERO ════════════════════════════════════════════════════════ -->
      <tr>
        <td style="background:${heroBg};padding:32px 32px 28px;text-align:center;">
          <!-- Icon circle -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;">
            <tr>
              <td style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;text-align:center;vertical-align:middle;border:2px solid rgba(255,255,255,0.3);">
                ${heroIcon}
              </td>
            </tr>
          </table>
          <!-- Label chip -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px;">
            <tr>
              <td style="background:rgba(255,255,255,0.2);border-radius:999px;padding:5px 14px;">
                <span style="font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1.2px;">${heroLabel}</span>
              </td>
            </tr>
          </table>
          <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.6px;line-height:1.1;">${heroTitle}</h1>
          <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.8);font-weight:400;line-height:1.5;">${heroSubtitle}</p>
        </td>
      </tr>

      <!-- ══ CONTENT ═════════════════════════════════════════════════════ -->
      <tr>
        <td style="background:#ffffff;padding:32px 32px 8px;">
          ${body}
        </td>
      </tr>

      <!-- ══ CONTACT ═════════════════════════════════════════════════════ -->
      ${contactRow}

      <!-- ══ FOOTER ══════════════════════════════════════════════════════ -->
      <tr>
        <td style="background:#0B132B;border-radius:0 0 20px 20px;padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:800;letter-spacing:-0.3px;">
                  <span style="color:#ffffff;">Simpli</span><span style="color:#2563EB;">Clinic</span>
                </p>
                <p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">Tu clínica, más simple.</p>
              </td>
              <td align="right" style="vertical-align:middle;">
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);">Correo automático — no responder</p>
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

// ─── Details card ─────────────────────────────────────────────────────────────

function detailsCard(datos: DatosCita): string {
  const horaDisplay = datos.hora_fin ? `${datos.hora} – ${datos.hora_fin}` : datos.hora

  const rows: Array<{ icon: string; label: string; value: string }> = [
    { icon: ICON.scissors, label: 'Servicio',    value: datos.servicio_nombre },
    { icon: ICON.user,     label: 'Te atiende',  value: datos.profesional_nombre },
    { icon: ICON.calendar, label: 'Fecha',        value: datos.fecha },
    { icon: ICON.clock,    label: 'Hora',         value: horaDisplay },
  ]

  const rowsHtml = rows.map(({ icon, label, value }, i) => `
    <tr>
      <td style="padding:13px 20px;${i > 0 ? 'border-top:1px solid #F1F5F9;' : ''}">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:36px;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:32px;height:32px;background:#EFF6FF;border-radius:8px;text-align:center;vertical-align:middle;">
                  ${icon}
                </td>
              </tr></table>
            </td>
            <td style="padding-left:12px;vertical-align:middle;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:700;color:#0F172A;">${value}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const mapsRow = datos.clinica_direccion ? `
    <tr>
      <td style="padding:13px 20px;border-top:1px solid #F1F5F9;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:36px;vertical-align:top;padding-top:2px;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:32px;height:32px;background:#EFF6FF;border-radius:8px;text-align:center;vertical-align:middle;">
                  ${ICON.pin}
                </td>
              </tr></table>
            </td>
            <td style="padding-left:12px;vertical-align:top;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;">Dirección</p>
              <p style="margin:3px 0 8px;font-size:14px;font-weight:700;color:#0F172A;">${datos.clinica_direccion}</p>
              <!-- Map buttons -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(datos.clinica_direccion)}"
                       target="_blank"
                       style="display:inline-block;padding:7px 14px;background:#ffffff;border:1.5px solid #E2E8F0;border-radius:8px;font-size:12px;font-weight:600;color:#334155;text-decoration:none;">
                      🗺 Google Maps
                    </a>
                  </td>
                  <td>
                    <a href="https://waze.com/ul?q=${encodeURIComponent(datos.clinica_direccion)}"
                       target="_blank"
                       style="display:inline-block;padding:7px 14px;background:#ffffff;border:1.5px solid #E2E8F0;border-radius:8px;font-size:12px;font-weight:600;color:#334155;text-decoration:none;">
                      🔵 Waze
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : ''

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1.5px solid #E2E8F0;border-radius:16px;overflow:hidden;margin:20px 0 24px;">
      ${rowsHtml}
      ${mapsRow}
    </table>
  `
}

// ─── CTA buttons ──────────────────────────────────────────────────────────────

function whatsappBtn(tel: string, msg: string): string {
  const num = tel.replace(/\D/g, '')
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
      <tr>
        <td style="background:#25D366;border-radius:12px;box-shadow:0 4px 12px rgba(37,211,102,0.3);">
          <a href="https://wa.me/${num}?text=${encodeURIComponent(msg)}" target="_blank"
             style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="vertical-align:middle;padding-right:8px;">${ICON.wsp}</td>
              <td style="vertical-align:middle;color:#ffffff;font-size:14px;font-weight:700;">Escribir por WhatsApp</td>
            </tr></table>
          </a>
        </td>
      </tr>
    </table>
  `
}

function primaryBtn(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
      <tr>
        <td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `
}

function canalChip(canal?: string): string {
  if (canal !== 'book') return ''
  return `<span style="display:inline-block;background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;margin-left:10px;vertical-align:middle;letter-spacing:0.3px;">Reserva online</span>`
}

// ─── Build HTML ───────────────────────────────────────────────────────────────

function buildHtml(tipo: TipoEmail, datos: DatosCita): string {
  const { paciente_nombre, paciente_telefono, paciente_email, clinica_nombre, clinica_telefono, clinica_email, canal } = datos
  const card = detailsCard(datos)

  // ── Confirmación ──────────────────────────────────────────────────────────
  if (tipo === 'confirmacion_cita') {
    const waBtn = clinica_telefono
      ? whatsappBtn(clinica_telefono, `Hola ${clinica_nombre}, soy ${paciente_nombre}. Tengo una cita el ${datos.fecha} a las ${datos.hora} y quiero hacer una consulta.`)
      : ''
    return buildEmail({
      title: `Tu cita está confirmada — ${clinica_nombre}`,
      headerBg: '#0B132B',
      heroBg: 'linear-gradient(135deg,#10B981,#059669)',
      heroIcon: ICON.check,
      heroLabel: 'Reserva confirmada',
      heroTitle: '¡Tu cita está confirmada!',
      heroSubtitle: `Hola ${paciente_nombre}, todo está listo para tu visita.`,
      body: `
        <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
          Hemos registrado tu cita exitosamente. Aquí tienes todos los detalles:
        </p>
        ${card}
        <!-- Confirmation alert -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border:1.5px solid #6EE7B7;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#065F46;">✓ Reserva confirmada</p>
              <p style="margin:0;font-size:13px;color:#047857;line-height:1.5;">
                Te esperamos el <strong>${datos.fecha}</strong> a las <strong>${datos.hora}</strong>.<br/>
                Te pedimos llegar <strong>10 minutos antes</strong>.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px;font-size:13px;color:#64748B;">¿Necesitas cancelar o modificar tu cita? Avísanos con anticipación.</p>
        ${waBtn}
      `,
      datos,
    })
  }

  // ── Admin nueva reserva ────────────────────────────────────────────────────
  if (tipo === 'nueva_reserva_admin') {
    const chip = canalChip(canal)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpliclinic.vercel.app'
    return buildEmail({
      title: `Nueva reserva — ${clinica_nombre}`,
      headerBg: '#0B132B',
      heroBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
      heroIcon: ICON.bell,
      heroLabel: 'Nueva reserva',
      heroTitle: `Nueva cita agendada${chip}`,
      heroSubtitle: `${paciente_nombre} reservó para el ${datos.fecha} a las ${datos.hora}.`,
      body: `
        <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
          Se registró una nueva cita en tu agenda.
        </p>
        ${card}
        <!-- Patient info -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F8FAFF;border:1.5px solid #DBEAFE;border-radius:12px;margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#1D4ED8;text-transform:uppercase;letter-spacing:1px;">Datos del paciente</p>
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td style="vertical-align:top;padding-right:16px;width:50%;padding-bottom:8px;">
                    <p style="margin:0;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Nombre</p>
                    <p style="margin:3px 0 0;font-size:14px;color:#0F172A;font-weight:700;">${paciente_nombre}</p>
                  </td>
                  ${paciente_telefono ? `
                  <td style="vertical-align:top;padding-bottom:8px;">
                    <p style="margin:0;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</p>
                    <p style="margin:3px 0 0;font-size:14px;font-weight:700;"><a href="tel:${paciente_telefono}" style="color:#2563EB;text-decoration:none;">${paciente_telefono}</a></p>
                  </td>` : '<td></td>'}
                </tr>
                ${paciente_email ? `
                <tr>
                  <td colspan="2" style="padding-top:4px;border-top:1px solid #E2E8F0;">
                    <p style="margin:8px 0 0;font-size:11px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                    <p style="margin:3px 0 0;font-size:14px;font-weight:700;"><a href="mailto:${paciente_email}" style="color:#2563EB;text-decoration:none;">${paciente_email}</a></p>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
        ${primaryBtn('Ver en agenda →', `${appUrl}/agenda`)}
        <p style="margin:16px 0 8px;font-size:12px;color:#94A3B8;">Aviso automático de SimpliClinic.</p>
      `,
      datos,
    })
  }

  // ── Recordatorio ──────────────────────────────────────────────────────────
  if (tipo === 'recordatorio_cita') {
    const waBtn = clinica_telefono
      ? whatsappBtn(clinica_telefono, `Hola ${clinica_nombre}, soy ${paciente_nombre}. Tengo una cita mañana a las ${datos.hora} y quiero hacer una consulta.`)
      : ''
    return buildEmail({
      title: `Recuerda tu cita — ${clinica_nombre}`,
      headerBg: '#0B132B',
      heroBg: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
      heroIcon: ICON.bell,
      heroLabel: 'Recordatorio de cita',
      heroTitle: 'Tienes una cita mañana',
      heroSubtitle: `Hola ${paciente_nombre}, no olvides tu visita a ${clinica_nombre}.`,
      body: `
        <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
          Te recordamos tu cita programada para mañana:
        </p>
        ${card}
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:1.5px solid #BFDBFE;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1D4ED8;">Tu cita es el ${datos.fecha} a las ${datos.hora}</p>
              <p style="margin:0;font-size:13px;color:#2563EB;line-height:1.5;">
                Te pedimos llegar <strong>10 minutos antes</strong> para una mejor atención.
              </p>
            </td>
          </tr>
        </table>
        ${waBtn}
      `,
      datos,
    })
  }

  // ── Post-cita ─────────────────────────────────────────────────────────────
  if (tipo === 'post_cita') {
    const waBtn = clinica_telefono
      ? whatsappBtn(clinica_telefono, `Hola ${clinica_nombre}, me gustaría agendar una nueva cita.`)
      : ''
    return buildEmail({
      title: `¿Cómo fue tu visita? — ${clinica_nombre}`,
      headerBg: '#0B132B',
      heroBg: 'linear-gradient(135deg,#7C3AED,#6D28D9)',
      heroIcon: ICON.star,
      heroLabel: 'Post visita',
      heroTitle: '¿Cómo fue tu experiencia?',
      heroSubtitle: `Gracias por visitarnos, ${paciente_nombre}. Tu opinión nos importa.`,
      body: `
        <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
          Esperamos que tu visita haya sido excelente. Aquí el resumen de tu cita:
        </p>
        ${card}
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:1.5px solid #C4B5FD;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#5B21B6;">¿Listo para tu próxima visita?</p>
              <p style="margin:0;font-size:13px;color:#6D28D9;line-height:1.5;">
                Escríbenos y con gusto te agendamos cuando lo necesites.
              </p>
            </td>
          </tr>
        </table>
        ${waBtn}
      `,
      datos,
    })
  }

  // ── Cancelación ───────────────────────────────────────────────────────────
  const contactLine = clinica_telefono
    ? `<a href="tel:${clinica_telefono}" style="color:#2563EB;font-weight:700;text-decoration:none;">${clinica_telefono}</a>`
    : clinica_email
    ? `<a href="mailto:${clinica_email}" style="color:#2563EB;font-weight:700;text-decoration:none;">${clinica_email}</a>`
    : clinica_nombre

  return buildEmail({
    title: `Tu cita fue cancelada — ${clinica_nombre}`,
    headerBg: '#0B132B',
    heroBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
    heroIcon: ICON.xmark,
    heroLabel: 'Cita cancelada',
    heroTitle: 'Tu cita fue cancelada',
    heroSubtitle: `Hola ${paciente_nombre}, te informamos sobre el estado de tu reserva.`,
    body: `
      <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
        Tu cita fue cancelada. Aquí están los detalles:
      </p>
      ${card}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:24px;">
        <tr>
          <td style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#991B1B;">Cita cancelada</p>
            <p style="margin:0;font-size:13px;color:#DC2626;line-height:1.5;">
              ¿Fue un error o quieres reagendar? Contáctanos: ${contactLine}
            </p>
          </td>
        </tr>
      </table>
    `,
    datos,
  })
}

function getSubject(tipo: TipoEmail, datos: DatosCita): string {
  const c = datos.clinica_nombre
  if (tipo === 'confirmacion_cita')  return `✅ Cita confirmada — ${datos.fecha} ${datos.hora} · ${c}`
  if (tipo === 'nueva_reserva_admin') return `🔔 Nueva reserva: ${datos.paciente_nombre} · ${datos.fecha} ${datos.hora}`
  if (tipo === 'recordatorio_cita')  return `📅 Recuerda tu cita mañana a las ${datos.hora} · ${c}`
  if (tipo === 'post_cita')          return `⭐ ¿Cómo fue tu visita? · ${c}`
  return `Cita cancelada · ${c}`
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
