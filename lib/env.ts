/**
 * Valida variables de entorno críticas al iniciar el servidor.
 * Llamar desde app/layout.tsx (server component) para fallar rápido.
 */

const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const RECOMMENDED_SERVER = [
  'REDIS_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'CRON_SECRET',
] as const

export function validateEnv(): void {
  const missing = REQUIRED_SERVER.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `[SimpliClinic] Variables de entorno requeridas no configuradas: ${missing.join(', ')}\n` +
      'Revisa tu archivo .env.local o las variables de entorno en Vercel.',
    )
  }

  const missingRecommended = RECOMMENDED_SERVER.filter((key) => !process.env[key])
  if (missingRecommended.length > 0) {
    console.warn(
      `[SimpliClinic] Variables opcionales no configuradas: ${missingRecommended.join(', ')}\n` +
      'Algunas funcionalidades (WhatsApp, recordatorios BullMQ) estarán deshabilitadas.',
    )
  }
}
