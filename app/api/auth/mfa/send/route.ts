import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash, randomInt } from 'crypto'

export const runtime = 'nodejs'

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const code = String(randomInt(100000, 999999))
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

  const db = createAdminClient()

  // Invalidate previous codes for this user
  await db.from('mfa_codes').update({ used: true }).eq('user_id', user.id).eq('used', false)

  const { error } = await db.from('mfa_codes').insert({
    user_id: user.id,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
  })
  if (error) return NextResponse.json({ error: 'Error generando código' }, { status: 500 })

  const email = user.email!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);padding:28px 32px;">
            <img src="https://rkcgnnzimwemrtavtinw.supabase.co/storage/v1/object/public/assets/Logos/Logo%20SimpliClinic.png" alt="SimpliClinic" height="36" style="display:block;height:36px;width:auto;" />
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Verificación de seguridad</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;">Tu código de verificación</p>
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
              Usa este código para iniciar sesión. Expira en <strong>5 minutos</strong>.
            </p>
            <div style="background:#f0f4ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:12px;color:#2563EB;font-family:monospace;">${code}</p>
            </div>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Si no fuiste tú, ignora este mensaje. Nadie de SimpliClinic te pedirá este código por teléfono o chat.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">
              © 2026 SimpliClinic · <a href="${appUrl}" style="color:#9ca3af;text-decoration:none;">app.simpliclinic.cl</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SimpliClinic <noreply@simpliclinic.cl>',
      to: email,
      subject: `${code} — Tu código de verificación`,
      html,
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })

  return NextResponse.json({ ok: true, email: email.replace(/(.{2}).+(@.+)/, '$1***$2') })
}
