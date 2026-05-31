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
  'REDIS_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'CRON_SECRET',
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
