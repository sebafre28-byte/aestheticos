'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Broadcastea la presencia del usuario actual en el canal de su clínica.
// Llamar desde DashboardShell para que esté activo en todas las páginas.
export function usePresenceBroadcast() {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let clinicaId: string | null = null

    supabase.rpc('auth_clinica_id').then(({ data }) => {
      if (!data) return
      clinicaId = data as string

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return

        const channel = supabase.channel(`presence:${clinicaId}`, {
          config: { presence: { key: user.id } },
        })

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() })
          }
        })

        channelRef.current = channel
      })
    })

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])
}

// Suscribirse a la presencia de todos los usuarios de la clínica.
// Retorna un Set de user_ids actualmente online.
import { useState } from 'react'

export function usePresenceOnline(): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    supabase.rpc('auth_clinica_id').then(({ data }) => {
      if (!data) return
      const clinicaId = data as string

      const channel = supabase.channel(`presence:${clinicaId}`)

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<{ user_id: string }>()
          const ids = new Set(Object.values(state).flat().map((p) => p.user_id))
          setOnlineIds(ids)
        })
        .subscribe()

      return () => { channel.unsubscribe() }
    })
  }, [])

  return onlineIds
}
