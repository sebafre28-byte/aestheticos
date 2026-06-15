'use client'

import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns'
import { getClinicaConfig } from '@/lib/onboarding/queries'

async function triggerCitaJobs(citaId: string, action: 'schedule' | 'cancel' | 'reschedule'): Promise<void> {
  try {
    await fetch('/api/citas/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citaId, action }),
    })
  } catch (e) {
    console.warn('[agenda] triggerCitaJobs falló (no crítico):', e)
  }
}

function triggerGoogleSync(citaId: string, action: 'create' | 'update' | 'delete' = 'update'): void {
  fetch('/api/citas/sync-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cita_id: citaId, action }),
  }).catch(() => {})
}
