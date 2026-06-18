'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CRISP_WEBSITE_ID = '17be070d-9ecd-4220-80fe-ab25b016766a'

export function CrispChat() {
  useEffect(() => {
    // Inject Crisp script
    window.$crisp = []
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID

    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)

    // Identify user once loaded
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user
      if (!user) return
      const nombre = user.user_metadata?.nombre ?? user.email ?? ''
      const email  = user.email ?? ''
      window.$crisp.push(['set', 'user:email', [email]])
      window.$crisp.push(['set', 'user:nickname', [nombre]])
    })

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return null
}
