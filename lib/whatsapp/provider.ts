// Proveedores de WhatsApp: abstracción sobre Twilio y Meta Cloud API para envío de mensajes.
import 'server-only'

export type WhatsappSendPayload = {
  /** E.164 con prefijo whatsapp:, e.g. whatsapp:+56912345678 */
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

// ─── Helpers ─────────────────────────────────────────────────

/** Normaliza a `whatsapp:+<digits>` (Twilio) o `+<digits>` (Meta). */
export function toWhatsAppE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return null
  return `whatsapp:+${digits}`
}

/** Extrae solo `+<digits>` sin prefijo whatsapp: (para Meta Cloud API). */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return null
  return `+${digits}`
}

export function clinicPhoneToWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  return toWhatsAppE164(raw)
}

// ─── Twilio Provider ─────────────────────────────────────────

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

// ─── Meta WhatsApp Cloud API Provider ────────────────────────

/** Códigos de error de Meta WhatsApp Cloud API con mensajes legibles. */
const META_ERROR_CODES: Record<number, string> = {
  0:     'Error general de autenticación',
  4:     'Límite de tasa de llamadas a la API superado',
  10:    'Permiso denegado — verifica los permisos del token',
  100:   'Parámetro inválido',
  131000: 'Error general de envío',
  131005: 'Permiso para enviar mensajes denegado',
  131008: 'Parámetro requerido faltante',
  131009: 'Valor de parámetro inválido',
  131016: 'Servicio de envío no disponible temporalmente',
  131021: 'El destinatario no tiene WhatsApp',
  131026: 'Mensaje no entregado — usuario fuera de ventana de 24h',
  131047: 'Re-engagement message requiere plantilla aprobada',
  131051: 'Tipo de mensaje no soportado',
  131052: 'Error al descargar el media',
  131053: 'Error al cargar el media',
  133004: 'El servidor está temporalmente fuera de servicio',
  133006: 'El número de teléfono requiere registro',
  133008: 'Demasiadas solicitudes de OTP para este número',
  133009: 'El número de teléfono no está registrado con este WABA',
  133010: 'El número de teléfono está cancelado del registro',
}

type MetaErrorResponse = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_data?: {
      messaging_product?: string
      details?: string
    }
    error_subcode?: number
    fbtrace_id?: string
  }
}

type MetaSuccessResponse = {
  messaging_product: string
  contacts: { input: string; wa_id: string }[]
  messages: { id: string; message_status?: string }[]
}

class MetaWhatsappProvider implements WhatsappProvider {
  readonly name = 'meta'

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async sendWhatsApp(payload: WhatsappSendPayload): Promise<WhatsappSendResult> {
    // Meta no usa prefijo whatsapp: — solo E.164 puro
    const toRaw = payload.to.replace(/^whatsapp:/, '')
    if (!toRaw.startsWith('+')) {
      return { ok: false, error: 'Número de destino inválido para Meta API' }
    }

    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toRaw,
          type: 'text',
          text: {
            preview_url: false,
            body: payload.body,
          },
        }),
      })

      const json = await res.json() as MetaErrorResponse & Partial<MetaSuccessResponse>

      if (!res.ok || json.error) {
        const code = json.error?.code
        const knownMsg = code ? META_ERROR_CODES[code] : undefined
        const apiMsg = json.error?.message ?? `Meta API HTTP ${res.status}`
        const details = json.error?.error_data?.details
        const error = [knownMsg, apiMsg, details].filter(Boolean).join(' — ')
        console.error('[meta-whatsapp] envío fallido', { code, error, to: toRaw })
        return { ok: false, error }
      }

      const wamid = json.messages?.[0]?.id
      return { ok: true, providerMessageId: wamid }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[meta-whatsapp] error de red', msg)
      return { ok: false, error: msg }
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────

export type WhatsappProviderKind = 'twilio' | 'meta'

export type WhatsappClinicaConfig = {
  provider?: 'meta' | 'twilio'
  phone_number_id?: string
  access_token?: string
  verify_token?: string
  account_sid?: string
  auth_token?: string
  from_number?: string
  numero_display?: string
  activo?: boolean
}

/**
 * Creates a WhatsApp provider from per-clinic config.
 * Falls back to global env vars if config is empty/missing (backwards compatible).
 */
export function getWhatsappProviderForClinica(config: WhatsappClinicaConfig | null | undefined): WhatsappProvider {
  if (!config || Object.keys(config).length === 0) {
    return getWhatsappProvider()
  }

  const kind = config.provider ?? 'twilio'

  if (kind === 'meta') {
    const phoneNumberId = config.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    const accessToken   = config.access_token    || process.env.META_ACCESS_TOKEN          || ''

    if (!phoneNumberId || !accessToken) {
      console.error('[whatsapp] provider=meta pero faltan phone_number_id o access_token para la clínica')
      return {
        name: 'meta-misconfigured',
        async sendWhatsApp() {
          return { ok: false, error: 'Faltan phone_number_id o access_token en la configuración de la clínica' }
        },
      }
    }

    return new MetaWhatsappProvider(phoneNumberId, accessToken)
  }

  // Twilio
  const accountSid = config.account_sid  || process.env.TWILIO_ACCOUNT_SID      || ''
  const authToken  = config.auth_token   || process.env.TWILIO_AUTH_TOKEN        || ''
  const from       = config.from_number  || process.env.TWILIO_WHATSAPP_FROM     || ''

  if (!accountSid || !authToken || !from) {
    return {
      name: 'twilio-misconfigured',
      async sendWhatsApp() {
        return { ok: false, error: 'Faltan account_sid, auth_token o from_number en la configuración de la clínica' }
      },
    }
  }

  return new TwilioWhatsappProvider(accountSid, authToken, from)
}

export function getWhatsappProvider(): WhatsappProvider {
  const kind = (process.env.WHATSAPP_PROVIDER ?? 'twilio').toLowerCase() as WhatsappProviderKind

  if (kind === 'meta') {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
    const accessToken  = process.env.META_ACCESS_TOKEN ?? ''

    if (!phoneNumberId || !accessToken) {
      console.error('[whatsapp] WHATSAPP_PROVIDER=meta pero faltan WHATSAPP_PHONE_NUMBER_ID o META_ACCESS_TOKEN')
      return {
        name: 'meta-misconfigured',
        async sendWhatsApp() {
          return { ok: false, error: 'Faltan WHATSAPP_PHONE_NUMBER_ID o META_ACCESS_TOKEN' }
        },
      }
    }

    return new MetaWhatsappProvider(phoneNumberId, accessToken)
  }

  // Default: Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const authToken  = process.env.TWILIO_AUTH_TOKEN ?? ''
  const from       = process.env.TWILIO_WHATSAPP_FROM ?? ''

  if (!accountSid || !authToken || !from) {
    return {
      name: 'twilio-misconfigured',
      async sendWhatsApp() {
        return { ok: false, error: 'Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM' }
      },
    }
  }

  return new TwilioWhatsappProvider(accountSid, authToken, from)
}
