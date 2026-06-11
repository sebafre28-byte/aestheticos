import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Returns a Ratelimit instance when Upstash is configured, null otherwise.
// Routes should fall back to in-memory or skip limiting when null (dev/CI).
function makeRatelimiter(requests: number, windowSeconds: number, prefix: string): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix,
  })
}

// 10 requests / 60 s per IP — used by /api/email
export const emailRatelimit = makeRatelimiter(10, 60, 'simpliclinic:rl:email')
