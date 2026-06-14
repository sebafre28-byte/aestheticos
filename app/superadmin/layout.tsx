import type { ReactNode } from 'react'

export const metadata = { title: 'Super Admin — SimpliClinic', robots: 'noindex,nofollow' }

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
