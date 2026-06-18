'use client'

import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

declare global {
  interface Window {
    google: typeof google
    _googlePlacesReady?: boolean
    _googlePlacesCallbacks?: Array<() => void>
  }
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DireccionAutocomplete({ value, onChange, placeholder = 'Av. Ejemplo 1234, Santiago' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey || !inputRef.current) return

    function initAutocomplete() {
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

    if (window.google?.maps?.places) {
      initAutocomplete()
      return
    }

    if (!document.querySelector('#google-maps-script')) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
      script.async = true
      document.head.appendChild(script)
    }

    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(interval)
        initAutocomplete()
      }
    }, 200)

    return () => clearInterval(interval)
  }, [onChange])

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  )
}
