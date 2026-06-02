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

// ─── Config by email type ─────────────────────────────────────────────────────

const VARIANT: Record<TipoEmail, {
  heroGradient: string
  heroIcon: string
  heroChipBg: string
  heroChipBorder: string
  heroChipColor: string
  heroChipText: string
  alertBg: string
  alertBorder: string
  alertTitleColor: string
  alertBodyColor: string
}> = {
  confirmacion_cita: {
    heroGradient: 'linear-gradient(135deg,#059669 0%,#10B981 100%)',
    heroIcon: '&#10003;',
    heroChipBg: '#ffffff',
    heroChipBorder: '#ffffff',
    heroChipColor: '#065F46',
    heroChipText: '&#10003;&nbsp; RESERVA CONFIRMADA',
    alertBg: '#ECFDF5',
    alertBorder: '#6EE7B7',
    alertTitleColor: '#065F46',
    alertBodyColor: '#047857',
  },
  nueva_reserva_admin: {
    heroGradient: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
    heroIcon: '&#128276;',
    heroChipBg: '#ffffff',
    heroChipBorder: '#ffffff',
    heroChipColor: '#1D4ED8',
    heroChipText: 'NUEVA RESERVA',
    alertBg: '#EFF6FF',
    alertBorder: '#BFDBFE',
    alertTitleColor: '#1D4ED8',
    alertBodyColor: '#2563EB',
  },
  recordatorio_cita: {
    heroGradient: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
    heroIcon: '&#128197;',
    heroChipBg: '#ffffff',
    heroChipBorder: '#ffffff',
    heroChipColor: '#1D4ED8',
    heroChipText: 'RECORDATORIO',
    alertBg: '#EFF6FF',
    alertBorder: '#BFDBFE',
    alertTitleColor: '#1D4ED8',
    alertBodyColor: '#2563EB',
  },
  cancelacion_cita: {
    heroGradient: 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)',
    heroIcon: '&#10007;',
    heroChipBg: '#ffffff',
    heroChipBorder: '#ffffff',
    heroChipColor: '#991B1B',
    heroChipText: 'CITA CANCELADA',
    alertBg: '#FEF2F2',
    alertBorder: '#FECACA',
    alertTitleColor: '#991B1B',
    alertBodyColor: '#DC2626',
  },
  post_cita: {
    heroGradient: 'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)',
    heroIcon: '&#11088;',
    heroChipBg: '#ffffff',
    heroChipBorder: '#ffffff',
    heroChipColor: '#5B21B6',
    heroChipText: 'POST VISITA',
    alertBg: '#F5F3FF',
    alertBorder: '#C4B5FD',
    alertTitleColor: '#5B21B6',
    alertBodyColor: '#6D28D9',
  },
}

// ─── Details card (Unicode icons only — Gmail-safe) ──────────────────────────

function detailsCard(datos: DatosCita): string {
  const horaDisplay = datos.hora_fin ? `${datos.hora} &ndash; ${datos.hora_fin}` : datos.hora

  const rows = [
    { icon: '&#128142;', iconBg: '#FDF4FF', iconBorder: '#E9D5FF', label: 'SERVICIO', value: datos.servicio_nombre },
    { icon: '&#128100;', iconBg: '#F0FDFA', iconBorder: '#CCFBF1', label: 'TE ATIENDE', value: datos.profesional_nombre },
    { icon: '&#128197;', iconBg: '#EFF6FF', iconBorder: '#DBEAFE', label: 'FECHA', value: datos.fecha },
    { icon: '&#9200;',   iconBg: '#EFF6FF', iconBorder: '#DBEAFE', label: 'HORA', value: horaDisplay },
  ]

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td style="padding:14px 18px;${i < rows.length - 1 || datos.clinica_direccion ? 'border-bottom:1px solid #F1F5F9;' : ''}">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td width="36" style="width:36px;vertical-align:middle;padding-right:13px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" width="36" height="36"
                      style="width:36px;height:36px;background:${r.iconBg};border-radius:8px;border:1px solid ${r.iconBorder};">
                    <span style="font-size:16px;line-height:36px;display:block;">${r.icon}</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">${r.label}</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:700;color:#0F172A;">${r.value}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const addressRow = datos.clinica_direccion ? (() => {
    const enc = encodeURIComponent(datos.clinica_direccion)
    return `
    <tr>
      <td style="padding:14px 18px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td width="36" style="width:36px;vertical-align:top;padding-right:13px;padding-top:2px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" width="36" height="36"
                      style="width:36px;height:36px;background:#EFF6FF;border-radius:8px;border:1px solid #DBEAFE;">
                    <span style="font-size:16px;line-height:36px;display:block;">&#128205;</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:top;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">C&Oacute;MO LLEGAR</p>
              <p style="margin:3px 0 11px;font-size:14px;font-weight:700;color:#0F172A;">${datos.clinica_direccion}</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${enc}"
                       target="_blank"
                       style="display:inline-block;padding:7px 13px;background:#FFFFFF;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:700;color:#334155;text-decoration:none;">
                      &#128506; Google Maps
                    </a>
                  </td>
                  <td>
                    <a href="https://waze.com/ul?q=${enc}"
                       target="_blank"
                       style="display:inline-block;padding:7px 13px;background:#FFFFFF;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:700;color:#334155;text-decoration:none;">
                      &#128664; Waze
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `
  })() : ''

  return `
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;margin:0 0 24px 0;">
      ${rowsHtml}
      ${addressRow}
    </table>
  `
}

// ─── WhatsApp button ───────────────────────────────────────────────────────────

function whatsappBtn(tel: string, msg: string): string {
  const num = tel.replace(/\D/g, '')
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:8px;">
      <tr>
        <td align="center" style="background:#25D366;border-radius:10px;">
          <a href="https://wa.me/${num}?text=${encodeURIComponent(msg)}" target="_blank"
             style="display:block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">
            &#128172;&nbsp; Contactar por WhatsApp
          </a>
        </td>
      </tr>
    </table>
  `
}

// ─── Full email wrapper ────────────────────────────────────────────────────────

function buildEmail(tipo: TipoEmail, datos: DatosCita, body: string): string {
  const v = VARIANT[tipo]
  const { clinica_nombre, clinica_logo_url, clinica_telefono, clinica_email } = datos

  // Clinic logo in header: use image if available, else initial avatar
  const clinicLogoHtml = clinica_logo_url
    ? `<img src="${clinica_logo_url}" width="40" height="40" alt="${clinica_nombre}"
           style="display:block;width:40px;height:40px;border-radius:10px;object-fit:cover;" />`
    : `<table cellpadding="0" cellspacing="0" border="0"><tr>
         <td align="center" valign="middle" width="40" height="40"
             style="width:40px;height:40px;background:linear-gradient(135deg,#2563EB,#14B8A6);border-radius:10px;">
           <span style="font-size:18px;font-weight:800;color:#ffffff;display:block;line-height:40px;">
             ${clinica_nombre.charAt(0).toUpperCase()}
           </span>
         </td>
       </tr></table>`

  const contactSection = (clinica_telefono || clinica_email) ? `
    <tr>
      <td style="padding:0 36px 28px;">
        <table cellpadding="0" cellspacing="0" border="0"
               style="width:100%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;">&#191;Necesitas ayuda?</p>
              ${clinica_telefono ? `<p style="margin:0 0 4px;font-size:13px;color:#0F172A;font-weight:600;">&#128222;&nbsp; <a href="tel:${clinica_telefono}" style="color:#2563EB;text-decoration:none;font-weight:700;">${clinica_telefono}</a></p>` : ''}
              ${clinica_email    ? `<p style="margin:0;font-size:13px;color:#0F172A;font-weight:600;">&#9993;&nbsp; <a href="mailto:${clinica_email}" style="color:#2563EB;text-decoration:none;font-weight:700;">${clinica_email}</a></p>` : ''}
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
</head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F7;">
  <tr>
    <td align="center" style="padding:36px 16px 48px;">

      <table cellpadding="0" cellspacing="0" border="0"
             style="width:100%;max-width:580px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;">

        <!-- TOP ACCENT BAR -->
        <tr>
          <td height="5" style="height:5px;background:linear-gradient(90deg,#2563EB 0%,#14B8A6 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- HEADER -->
        <tr>
          <td style="padding:20px 36px 18px;border-bottom:1px solid #F1F5F9;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- SimpliClinic logo -->
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:8px;">
                        <table cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" valign="middle" width="30" height="30"
                              style="width:30px;height:30px;border-radius:7px;background:#2563EB;">
                            <span style="font-size:13px;font-weight:900;line-height:30px;display:block;color:#ffffff;font-family:Arial,sans-serif;">SC</span>
                          </td>
                        </tr></table>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:19px;font-weight:900;color:#0B132B;letter-spacing:-0.6px;font-family:Arial,sans-serif;">Simpli</span><span style="font-size:19px;font-weight:900;color:#2563EB;letter-spacing:-0.6px;font-family:Arial,sans-serif;">Clinic</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- Clinic name + logo -->
                <td align="right" style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:8px;">
                        <span style="font-size:13px;color:#64748B;font-weight:600;">${clinica_nombre}</span>
                      </td>
                      <td style="vertical-align:middle;">${clinicLogoHtml}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td align="center" style="padding:48px 36px 40px;background:#FFFFFF;text-align:center;">

            <!-- Circle icon -->
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px auto;">
              <tr>
                <td align="center" valign="middle" width="76" height="76"
                    style="width:76px;height:76px;background:${v.heroGradient};border-radius:50%;">
                  <span style="font-size:34px;color:#ffffff;display:block;line-height:76px;font-weight:700;text-align:center;">${v.heroIcon}</span>
                </td>
              </tr>
            </table>

            <!-- Status chip -->
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;">
              <tr>
                <td align="center" style="background:${v.heroChipBg};border:1px solid ${v.heroChipBorder};border-radius:100px;padding:5px 16px;">
                  <span style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${v.heroChipColor};">${v.heroChipText}</span>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:0 36px 8px;">
            ${body}
          </td>
        </tr>

        ${contactSection}

        <!-- FOOTER -->
        <tr>
          <td align="center" style="background:#F8FAFC;padding:24px 36px;border-top:1px solid #E2E8F0;text-align:center;">

            <!-- SimpliClinic logo footer -->
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 10px auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:8px;">
                  <table cellpadding="0" cellspacing="0" border="0"><tr>
                    <td align="center" valign="middle" width="24" height="24"
                        style="width:24px;height:24px;border-radius:6px;background:#2563EB;">
                      <span style="font-size:10px;font-weight:900;line-height:24px;display:block;color:#ffffff;font-family:Arial,sans-serif;">SC</span>
                    </td>
                  </tr></table>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:17px;font-weight:900;color:#0B132B;letter-spacing:-0.5px;font-family:Arial,sans-serif;">Simpli</span><span style="font-size:17px;font-weight:900;color:#2563EB;letter-spacing:-0.5px;font-family:Arial,sans-serif;">Clinic</span>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 14px;font-size:11px;color:#94A3B8;letter-spacing:1.4px;text-transform:uppercase;">Tu cl&iacute;nica, m&aacute;s simple.</p>
            <p style="margin:0 0 8px;font-size:12px;color:#CBD5E1;">&#9993;&nbsp; hola@simpliclinic.cl &nbsp;&middot;&nbsp; &#128222;&nbsp; +56 9 0000 0000</p>
            <p style="margin:0;font-size:11px;color:#CBD5E1;line-height:1.7;">SimpliClinic SpA &mdash; Santiago, Chile.<br/>Este es un correo autom&aacute;tico, por favor no respondas este mensaje.</p>
          </td>
        </tr>

        <!-- BOTTOM ACCENT BAR -->
        <tr>
          <td height="5" style="height:5px;background:linear-gradient(90deg,#2563EB 0%,#14B8A6 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

// ─── Email body per type ──────────────────────────────────────────────────────

function buildBody(tipo: TipoEmail, datos: DatosCita): string {
  const v = VARIANT[tipo]
  const card = detailsCard(datos)
  const { paciente_nombre, clinica_nombre, clinica_telefono, clinica_email } = datos

  if (tipo === 'confirmacion_cita') {
    const waMsg = `Hola ${clinica_nombre}, soy ${paciente_nombre}. Tengo una cita el ${datos.fecha} a las ${datos.hora} y quiero hacer una consulta.`
    return `
      <h1 style="margin:0 0 8px;font-size:27px;font-weight:800;color:#0B132B;letter-spacing:-0.8px;line-height:1.15;text-align:center;">
        &#161;Tu cita est&aacute; confirmada!
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;text-align:center;">
        &#161;Hola, <strong style="color:#0B132B;">${paciente_nombre}!</strong> Aqu&iacute; tienes el resumen de tu reserva en <strong style="color:#0B132B;">${clinica_nombre}</strong>.
      </p>
      ${card}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="background:${v.alertBg};border:1.5px solid ${v.alertBorder};border-radius:12px;padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${v.alertTitleColor};">&#10003; Reserva confirmada</p>
            <p style="margin:0;font-size:13px;color:${v.alertBodyColor};line-height:1.6;">
              Te pedimos llegar <strong>10 minutos antes</strong> para una mejor atenci&oacute;n.<br/>
              &#191;Necesitas modificar o cancelar? <strong>Cont&aacute;ctanos con anticipaci&oacute;n</strong> y con gusto te ayudamos.
            </p>
          </td>
        </tr>
      </table>
      ${clinica_telefono ? whatsappBtn(clinica_telefono, waMsg) : ''}
      <p style="margin:12px 0 24px;font-size:0;">&nbsp;</p>
    `
  }

  if (tipo === 'nueva_reserva_admin') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
    return `
      <h1 style="margin:0 0 8px;font-size:27px;font-weight:800;color:#0B132B;letter-spacing:-0.8px;line-height:1.15;text-align:center;">
        Nueva cita agendada
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;text-align:center;">
        <strong style="color:#0B132B;">${paciente_nombre}</strong> reserv&oacute; para el <strong style="color:#0B132B;">${datos.fecha}</strong> a las <strong style="color:#0B132B;">${datos.hora}</strong>.
      </p>
      ${card}
      ${datos.paciente_telefono || datos.paciente_email ? `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="background:${v.alertBg};border:1.5px solid ${v.alertBorder};border-radius:12px;padding:14px 18px;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:${v.alertTitleColor};text-transform:uppercase;letter-spacing:1px;">Datos de contacto</p>
            ${datos.paciente_telefono ? `<p style="margin:0 0 3px;font-size:13px;color:${v.alertBodyColor};">&#128222;&nbsp; <a href="tel:${datos.paciente_telefono}" style="color:${v.alertBodyColor};font-weight:700;text-decoration:none;">${datos.paciente_telefono}</a></p>` : ''}
            ${datos.paciente_email    ? `<p style="margin:0;font-size:13px;color:${v.alertBodyColor};">&#9993;&nbsp; <a href="mailto:${datos.paciente_email}" style="color:${v.alertBodyColor};font-weight:700;text-decoration:none;">${datos.paciente_email}</a></p>` : ''}
          </td>
        </tr>
      </table>` : ''}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:8px;">
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:10px;">
            <a href="${appUrl}/agenda" target="_blank"
               style="display:block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">
              Ver en agenda &#8594;
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 24px;font-size:0;">&nbsp;</p>
    `
  }

  if (tipo === 'recordatorio_cita') {
    const waMsg = `Hola ${clinica_nombre}, soy ${paciente_nombre}. Tengo una cita el ${datos.fecha} a las ${datos.hora} y quiero hacer una consulta.`
    return `
      <h1 style="margin:0 0 8px;font-size:27px;font-weight:800;color:#0B132B;letter-spacing:-0.8px;line-height:1.15;text-align:center;">
        Recuerda tu cita
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;text-align:center;">
        &#161;Hola, <strong style="color:#0B132B;">${paciente_nombre}!</strong> Te recordamos tu pr&oacute;xima visita a <strong style="color:#0B132B;">${clinica_nombre}</strong>.
      </p>
      ${card}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="background:${v.alertBg};border:1.5px solid ${v.alertBorder};border-radius:12px;padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${v.alertTitleColor};">&#9200; Tu cita es el ${datos.fecha} a las ${datos.hora}</p>
            <p style="margin:0;font-size:13px;color:${v.alertBodyColor};line-height:1.6;">
              Te pedimos llegar <strong>10 minutos antes</strong>.<br/>
              &#191;Necesitas cancelar o reagendar? Cont&aacute;ctanos con anticipaci&oacute;n.
            </p>
          </td>
        </tr>
      </table>
      ${clinica_telefono ? whatsappBtn(clinica_telefono, waMsg) : ''}
      <p style="margin:12px 0 24px;font-size:0;">&nbsp;</p>
    `
  }

  if (tipo === 'post_cita') {
    const waMsg = `Hola ${clinica_nombre}, me gustar&iacute;a agendar una nueva cita.`
    return `
      <h1 style="margin:0 0 8px;font-size:27px;font-weight:800;color:#0B132B;letter-spacing:-0.8px;line-height:1.15;text-align:center;">
        &#191;C&oacute;mo fue tu visita?
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;text-align:center;">
        Gracias por visitarnos, <strong style="color:#0B132B;">${paciente_nombre}</strong>. Esperamos que tu experiencia haya sido excelente.
      </p>
      ${card}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr>
          <td style="background:${v.alertBg};border:1.5px solid ${v.alertBorder};border-radius:12px;padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${v.alertTitleColor};">&#11088; &#191;Listo para tu pr&oacute;xima visita?</p>
            <p style="margin:0;font-size:13px;color:${v.alertBodyColor};line-height:1.6;">
              Esc&iacute;benos y con gusto te agendamos cuando lo necesites.
            </p>
          </td>
        </tr>
      </table>
      ${clinica_telefono ? whatsappBtn(clinica_telefono, waMsg) : ''}
      <p style="margin:12px 0 24px;font-size:0;">&nbsp;</p>
    `
  }

  // cancelacion_cita
  const contactLine = clinica_telefono
    ? `<a href="tel:${clinica_telefono}" style="color:${v.alertBodyColor};font-weight:700;text-decoration:none;">${clinica_telefono}</a>`
    : clinica_email
    ? `<a href="mailto:${clinica_email}" style="color:${v.alertBodyColor};font-weight:700;text-decoration:none;">${clinica_email}</a>`
    : clinica_nombre

  return `
    <h1 style="margin:0 0 8px;font-size:27px;font-weight:800;color:#0B132B;letter-spacing:-0.8px;line-height:1.15;text-align:center;">
      Tu cita fue cancelada
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;text-align:center;">
      &#161;Hola, <strong style="color:#0B132B;">${paciente_nombre}!</strong> Te informamos sobre el estado de tu reserva.
    </p>
    ${card}
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
      <tr>
        <td style="background:${v.alertBg};border:1.5px solid ${v.alertBorder};border-radius:12px;padding:14px 18px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${v.alertTitleColor};">Cita cancelada</p>
          <p style="margin:0;font-size:13px;color:${v.alertBodyColor};line-height:1.6;">
            &#191;Fue un error o quieres reagendar? Cont&aacute;ctanos: ${contactLine}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 24px;font-size:0;">&nbsp;</p>
  `
}

// ─── Subject lines ────────────────────────────────────────────────────────────

function getSubject(tipo: TipoEmail, datos: DatosCita): string {
  const c = datos.clinica_nombre
  if (tipo === 'confirmacion_cita')   return `Tu cita está confirmada — ${datos.fecha} ${datos.hora} · ${c}`
  if (tipo === 'nueva_reserva_admin') return `Nueva reserva: ${datos.paciente_nombre} · ${datos.fecha} ${datos.hora}`
  if (tipo === 'recordatorio_cita')   return `Recuerda tu cita el ${datos.fecha} a las ${datos.hora} · ${c}`
  if (tipo === 'post_cita')           return `¿Cómo fue tu visita? · ${c}`
  return `Tu cita fue cancelada · ${c}`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: 'RESEND_API_KEY not configured' }, { status: 200 })
  }

  let payload: EmailPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body' }, { status: 400 })
  }

  const { tipo, destinatario, datos } = payload
  if (!tipo || !destinatario || !datos) {
    return NextResponse.json({ ok: false, reason: 'Missing required fields' }, { status: 400 })
  }

  const html = buildEmail(tipo, datos, buildBody(tipo, datos))
  const subject = getSubject(tipo, datos)

  try {
    const res = await fetch('https://api.resend.com/emails', {
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

    if (!res.ok) {
      const errText = await res.text()
      console.error('[email] Resend error:', res.status, errText)
      return NextResponse.json({ ok: false, reason: `Resend error: ${res.status}` }, { status: 200 })
    }

    const result = await res.json()
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[email] Fetch error:', err)
    return NextResponse.json({ ok: false, reason: 'Network error' }, { status: 200 })
  }
}
