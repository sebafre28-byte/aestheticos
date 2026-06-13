import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Returns a Ratelimit instance when Upstash is configured, null otherwise.
// Routes fall back to in-memory or skip limiting when null (dev/CI without Redis).
function makeRatelimiter(requests: number, windowSeconds: number, prefix: string): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix,
  })
}

// Helper para extraer IP de la request
export function getIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

// /api/email — 10 req / 60 s por IP
export const emailRatelimit = makeRatelimiter(10, 60, 'simpliclinic:rl:email')

// /book/[slug] (booking público) — 20 req / 60 s por IP
export const bookingRatelimit = makeRatelimiter(20, 60, 'simpliclinic:rl:booking')

// /api/flow/checkout — 5 req / 60 s por IP (evita spam de pagos)
export const checkoutRatelimit = makeRatelimiter(5, 60, 'simpliclinic:rl:checkout')

// /api/whatsapp/webhook — 100 req / 10 s (Meta envía en ráfagas)
export const whatsappRatelimit = makeRatelimiter(100, 10, 'simpliclinic:rl:whatsapp')
