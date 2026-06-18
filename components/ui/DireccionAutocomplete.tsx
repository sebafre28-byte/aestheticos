'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window { google: typeof google }
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DireccionAutocomplete({ value, onChange, placeholder = 'Av. Ejemplo 1234, Santiago' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const seeded = useRef(false)

  // Seed the input once when the saved value arrives from DB (empty → value)
  useEffect(() => {
    if (value && !seeded.current && inputRef.current) {
      inputRef.current.value = value
      seeded.current = true
    }
  }, [value])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey || !inputRef.current) return

    function attach() {
      if (!inputRef.current || !window.google?.maps?.places) return
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['cl', 'ar', 'mx', 'co', 'pe', 'uy', 'ec', 'bo', 'py', 've'] },
        fields: ['formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place.formatted_address) onChange(place.formatted_address)
      })
    }

    if (window.google?.maps?.places) { attach(); return }

    if (!document.querySelector('#gmap-script')) {
      const s = document.createElement('script')
      s.id = 'gmap-script'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
      s.async = true
      document.head.appendChild(s)
    }

    const t = setInterval(() => {
      if (window.google?.maps?.places) { clearInterval(t); attach() }
    }, 200)

    return () => clearInterval(t)
  }, [onChange])

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  )
}
