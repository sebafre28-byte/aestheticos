export type WhatsappSendPayload = {
  /** E.164, e.g. whatsapp:+56912345678 */
  to: string
  body: string
}

export type WhatsappSendResult = {
  ok: boolean
  providerMessageId?: string
  error?: string
}

export interface WhatsappProvider {
  readonly name: string
  sendWhatsApp(payload: WhatsappSendPayload): Promise<WhatsappSendResult>
}

/** Normaliza a `whatsapp:+<digits>` para Twilio / Meta. */
export function toWhatsAppE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return null
  const withPlus = trimmed.startsWith('+') ? `+${digits}` : `+${digits}`
  return `whatsapp:${withPlus}`
}

class TwilioWhatsappProvider implements WhatsappProvider {
  readonly name = 'twilio'

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  async sendWhatsApp(payload: WhatsappSendPayload): Promise<WhatsappSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`
    const body = new URLSearchParams({
      To: payload.to,
      From: this.from,
      Body: payload.body,
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      const json = (await res.json()) as {
        sid?: string
        message?: string
        code?: number
        more_info?: string
        error_message?: string
      }

      if (!res.ok) {
        return {
          ok: false,
          error: json.message ?? json.error_message ?? `Twilio HTTP ${res.status}`,
        }
      }

      return { ok: true, providerMessageId: json.sid }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: msg }
    }
  }
}

class MetaWhatsappProvider implements WhatsappProvider {
  readonly name = 'meta'

  async sendWhatsApp(payload: WhatsappSendPayload): Promise<WhatsappSendResult> {
    void payload
    return {
      ok: false,
      error:
        'Meta WhatsApp Cloud API no está configurada. Establece WHATSAPP_PROVIDER=twilio o implementa credenciales Meta.',
    }
  }
}

export type WhatsappProviderKind = 'twilio' | 'meta'

export function getWhatsappProvider(): WhatsappProvider {
  const kind = (process.env.WHATSAPP_PROVIDER ?? 'twilio').toLowerCase() as WhatsappProviderKind

  if (kind === 'meta') {
    return new MetaWhatsappProvider()
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? ''
  const from = process.env.TWILIO_WHATSAPP_FROM ?? ''

  if (!accountSid || !authToken || !from) {
    return {
      name: 'twilio-misconfigured',
      async sendWhatsApp() {
        return {
          ok: false,
          error: 'Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM',
        }
      },
    }
  }

  return new TwilioWhatsappProvider(accountSid, authToken, from)
}

export function clinicPhoneToWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  return toWhatsAppE164(raw)
}
