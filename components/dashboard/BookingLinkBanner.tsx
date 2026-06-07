'use client'

import { useState } from 'react'
import { LinkIcon, Copy, Check, ExternalLink } from 'lucide-react'

export function BookingLinkBanner({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
        <LinkIcon className="h-4 w-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-blue-800">Tu link de reservas online</p>
        <p className="truncate text-[11px] text-blue-600">{url}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 h-7 px-3 rounded-lg bg-white border border-blue-200 text-[12px] text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Ver
        </a>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 h-7 px-3 rounded-lg bg-blue-600 text-[12px] text-white hover:bg-blue-700 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
