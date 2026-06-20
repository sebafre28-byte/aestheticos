const SC_LOGO = 'https://rkcgnnzimwemrtavtinw.supabase.co/storage/v1/object/public/assets/Logos/Logo%20SimpliClinic.png'

function shell(heroGradient: string, heroIcon: string, body: string, clinicaLogo?: string | null, preheader?: string): string {
  const logo = clinicaLogo ?? SC_LOGO
  const ph = preheader ?? ''
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
${ph ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${ph}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F7;">
  <tr><td align="center" style="padding:24px 12px 40px;">
    <table width="100%" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);" cellpadding="0" cellspacing="0" border="0">
      <!-- Hero -->
      <tr><td style="background:${heroGradient};padding:36px 32px 28px;text-align:center;">
        <img src="${logo}" width="48" height="48" alt="" style="border-radius:12px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;"/>
        <div style="font-size:40px;margin-bottom:8px;">${heroIcon}</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#ffffff;padding:32px 32px 24px;">
        ${body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0;">
        <p style="margin:0;font-size:11px;color:#94A3B8;">Este mensaje fue enviado automáticamente por SimpliClinic.<br/>Si no deseas recibir estos mensajes, comunícate con la clínica.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function buildCumpleanosEmail(d: {
  paciente_nombre: string
  clinica_nombre: string
  clinica_logo_url?: string | null
  mensaje_personalizado?: string | null
}): { subject: string; html: string } {
  const subject = `¡Feliz cumpleaños, ${d.paciente_nombre.split(' ')[0]}! 🎂 — ${d.clinica_nombre}`
  const msg = d.mensaje_personalizado?.trim()
    || `En ${d.clinica_nombre} te deseamos un día lleno de alegría. ¡Gracias por confiar en nosotros!`

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B132B;">¡Feliz cumpleaños, ${d.paciente_nombre.split(' ')[0]}! 🎂</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">${msg}</p>
    <p style="margin:0;font-size:13px;color:#94A3B8;">Con cariño,<br/><strong style="color:#0B132B;">${d.clinica_nombre}</strong></p>
  `
  const preheader = `${d.clinica_nombre} te desea un feliz cumpleaños. ¡Gracias por ser parte de nuestra comunidad!`
  return { subject, html: shell('linear-gradient(135deg,#EC4899 0%,#F97316 100%)', '🎂', body, d.clinica_logo_url, preheader) }
}

export function buildReactivacionEmail(d: {
  paciente_nombre: string
  clinica_nombre: string
  clinica_logo_url?: string | null
  dias_sin_cita: number
  book_url?: string | null
  mensaje_personalizado?: string | null
}): { subject: string; html: string } {
  const subject = `Te echamos de menos, ${d.paciente_nombre.split(' ')[0]} — ${d.clinica_nombre}`
  const msg = d.mensaje_personalizado?.trim()
    || `Han pasado ${d.dias_sin_cita} días desde tu última visita. En ${d.clinica_nombre} nos encantaría verte de nuevo.`

  const bookBtn = d.book_url
    ? `<div style="text-align:center;margin-top:24px;"><a href="${d.book_url}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Reservar cita →</a></div>`
    : ''

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B132B;">¡Te echamos de menos! 💙</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">${msg}</p>
    ${bookBtn}
    <p style="margin:20px 0 0;font-size:13px;color:#94A3B8;">Con cariño,<br/><strong style="color:#0B132B;">${d.clinica_nombre}</strong></p>
  `
  const preheader = `Han pasado ${d.dias_sin_cita} días desde tu última visita. Te esperamos en ${d.clinica_nombre}.`
  return { subject, html: shell('linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)', '💙', body, d.clinica_logo_url, preheader) }
}

export function buildReporteMensualEmail(d: {
  clinica_nombre: string
  clinica_logo_url?: string | null
  mes_nombre: string
  anio: number
  total_citas: number
  citas_completadas: number
  citas_canceladas: number
  ingresos_total: number
  pacientes_nuevos: number
  dashboard_url: string
}): { subject: string; html: string } {
  const subject = `Resumen de ${d.mes_nombre} — ${d.clinica_nombre}`
  const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`
  const tasa = d.total_citas > 0 ? Math.round((d.citas_completadas / d.total_citas) * 100) : 0

  const body = `
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0B132B;">Resumen de ${d.mes_nombre} ${d.anio} 📊</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748B;">Aquí tienes un resumen de la actividad de <strong>${d.clinica_nombre}</strong> el mes pasado.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td width="48%" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#16A34A;text-transform:uppercase;letter-spacing:.5px;">Citas realizadas</p>
          <p style="margin:0;font-size:32px;font-weight:800;color:#0B132B;">${d.citas_completadas}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748B;">${tasa}% de asistencia</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#2563EB;text-transform:uppercase;letter-spacing:.5px;">Ingresos estimados</p>
          <p style="margin:0;font-size:32px;font-weight:800;color:#0B132B;">${fmt(d.ingresos_total)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748B;">según precio de servicios</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td width="48%" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:14px 18px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#EA580C;text-transform:uppercase;letter-spacing:.5px;">Pacientes nuevos</p>
          <p style="margin:0;font-size:26px;font-weight:800;color:#0B132B;">${d.pacientes_nuevos}</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#FAF5FF;border:1px solid #DDD6FE;border-radius:12px;padding:14px 18px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;">Cancelaciones</p>
          <p style="margin:0;font-size:26px;font-weight:800;color:#0B132B;">${d.citas_canceladas}</p>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      <a href="${d.dashboard_url}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Ver agenda completa →</a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;text-align:center;">Gracias por confiar en SimpliClinic 💙</p>
  `

  const preheader = `${d.mes_nombre}: ${d.citas_completadas} citas · ${fmt(d.ingresos_total)} en ingresos · ${d.pacientes_nuevos} pacientes nuevos`
  return { subject, html: shell('linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)', '📊', body, d.clinica_logo_url, preheader) }
}

export async function sendMarketingEmail(opts: {
  tipo: 'email_cumpleanos' | 'email_reactivacion'
  destinatario: string
  reply_to?: string | null
  datos: Parameters<typeof buildCumpleanosEmail>[0] | Parameters<typeof buildReactivacionEmail>[0]
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  let subject: string
  let html: string
  if (opts.tipo === 'email_cumpleanos') {
    const r = buildCumpleanosEmail(opts.datos as Parameters<typeof buildCumpleanosEmail>[0])
    subject = r.subject; html = r.html
  } else {
    const r = buildReactivacionEmail(opts.datos as Parameters<typeof buildReactivacionEmail>[0])
    subject = r.subject; html = r.html
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'SimpliClinic <hola@simpliclinic.cl>',
        to: [opts.destinatario],
        ...(opts.reply_to ? { reply_to: [opts.reply_to] } : {}),
        subject,
        html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
