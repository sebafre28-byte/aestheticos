'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

let cached: string | null | undefined = undefined

export function useProfesionalId(): string | null {
  const [profesionalId, setProfesionalId] = useState<string | null>(cached ?? null)

  useEffect(() => {
    if (cached !== undefined) {
      setProfesionalId(cached)
      return
    }
    const supabase = createClient()
    supabase.rpc('auth_profesional_id').then(({ data }) => {
      cached = (data as string | null) ?? null
      setProfesionalId(cached)
    })
  }, [])

  return profesionalId
}
