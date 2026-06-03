'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePresenceBroadcast() {
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
      if (!clinicaId) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase.channel(`presence:${clinicaId}`, {
        config: { presence: { key: user.id } },
      })
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel!.track({ user_id: user.id })
        }
      })
    }

    init()
    return () => { channel?.unsubscribe() }
  }, [])
}

export function usePresenceOnline(): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: clinicaId } = await supabase.rpc('auth_clinica_id')
      if (!clinicaId) return

      const channel = supabase.channel(`presence:${clinicaId}`)
      channelRef.current = channel

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>()
        const ids = new Set(Object.values(state).flat().map((p) => p.user_id))
        setOnlineIds(ids)
      })

      channel.subscribe()
    }

    init()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  return onlineIds
}
