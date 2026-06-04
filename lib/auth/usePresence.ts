'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Actualiza last_seen_at una vez al cargar el dashboard.
export function usePresenceBroadcast() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('usuarios_clinica')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {})
    })
  }, [])
}

export function formatLastSeen(lastSeen: string | null | undefined): { label: string; color: string } {
  if (!lastSeen) return { label: 'Nunca', color: 'bg-gray-300' }
  const diff = Date.now() - new Date(lastSeen).getTime()
  const min = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (min < 5)  return { label: 'Ahora',        color: 'bg-emerald-400' }
  if (min < 60) return { label: `hace ${min}m`,  color: 'bg-emerald-300' }
  if (hrs < 24) return { label: `hace ${hrs}h`,  color: 'bg-amber-400'  }
  if (days < 7) return { label: `hace ${days}d`, color: 'bg-gray-400'   }
  return              { label: 'Inactivo',        color: 'bg-gray-300'   }
}
