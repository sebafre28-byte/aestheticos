import 'server-only'

/**
 * Valida variables de entorno críticas al iniciar el servidor.
 * Llamar desde app/layout.tsx (server component) para fallar rápido.
 */

// Variables requeridas solo en build (públicas)
const REQUIRED_BUILD = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const

// Variables requeridas en runtime (secretas, no en build)
const REQUIRED_RUNTIME = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const RECOMMENDED = [
  'CRON_SECRET',
  'INTERNAL_API_SECRET',
  'REDIS_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  // Meta WhatsApp Cloud API (alternativa a Twilio)
  // 'META_ACCESS_TOKEN', 'META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'
  // Stripe (suscripciones)
  // 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'
] as const

let validated = false

export function validateEnv(): void {
  // Durante el build de Next.js, solo validar vars públicas
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

  const required = isBuild ? [...REQUIRED_BUILD] : [...REQUIRED_BUILD, ...REQUIRED_RUNTIME]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const msg = `[SimpliClinic] Variables de entorno requeridas no configuradas: ${missing.join(', ')}`
    if (isBuild) {
      console.warn(msg)
      return
    }
    throw new Error(msg + '\nRevisa .env.local o las variables en Vercel.')
  }

  if (!validated) {
    validated = true
    const missingOpcionales = RECOMMENDED.filter((key) => !process.env[key])
    if (missingOpcionales.length > 0) {
      console.warn(
        `[SimpliClinic] Variables opcionales no configuradas: ${missingOpcionales.join(', ')} — ` +
        'WhatsApp y BullMQ estarán deshabilitados.',
      )
    }
  }
}
