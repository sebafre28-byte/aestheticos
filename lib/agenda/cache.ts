'use client'

export const agendaCache = new Map<string, { expiresAt: number; value: unknown }>()
export const inflight = new Map<string, Promise<unknown>>()

export function withCache<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = agendaCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as T)
  }

  const current = inflight.get(key)
  if (current) return current as Promise<T>

  const promise = load()
    .then((value) => {
      agendaCache.set(key, { expiresAt: Date.now() + ttlMs, value })
      inflight.delete(key)
      return value
    })
    .catch((error) => {
      inflight.delete(key)
      throw error
    })

  inflight.set(key, promise)
  return promise
}

export function invalidateAgendaCache() {
  for (const key of agendaCache.keys()) {
    if (key.startsWith('citas-')) agendaCache.delete(key)
  }
}

export async function withRetry<T>(fn: () => PromiseLike<T> | T, attempts = 2): Promise<T> {
  let lastError: unknown
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await Promise.resolve(fn())
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)))
    }
  }
  throw lastError
}
