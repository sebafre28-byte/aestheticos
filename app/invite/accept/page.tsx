'use client'

import dynamic from 'next/dynamic'

// Loaded client-side only — this page reads window.location.hash and uses
// createBrowserClient, which requires env vars unavailable during SSR prerender.
const InviteAcceptPage = dynamic(() => import('./InviteAcceptClient'), { ssr: false })

export default function Page() {
  return <InviteAcceptPage />
}
