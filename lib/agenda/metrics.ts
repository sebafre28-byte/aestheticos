'use client'

type AgendaMetricPayload = Record<string, string | number | boolean | null>

export function trackAgendaMetric(event: string, payload: AgendaMetricPayload = {}) {
  const metric = {
    event,
    payload,
    ts: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agenda:metric', { detail: metric }))
  }
  console.info('[agenda-metric]', metric)
}
