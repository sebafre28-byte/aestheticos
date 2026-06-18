'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

declare global {
  interface Window {
    google: typeof google
    initGooglePlaces?: () => void
  }
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DireccionAutocomplete({ value, onChange, placeholder = 'Av. Ejemplo 1234, Santiago' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey) return

    if (window.google?.maps?.places) {
      setLoaded(true)
      return
    }

    if (document.querySelector('#google-places-script')) {
      window.initGooglePlaces = () => setLoaded(true)
      return
    }

    window.initGooglePlaces = () => setLoaded(true)

    const script = document.createElement('script')
    script.id = 'google-places-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!loaded || !inputRef.current) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['cl', 'ar', 'mx', 'co', 'pe', 'uy', 'ec', 'bo', 'py', 've'] },
      fields: ['formatted_address'],
    })

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace()
      if (place.formatted_address) {
        onChange(place.formatted_address)
      }
    })

    return () => {
      window.google.maps.event.removeListener(listener)
    }
  }, [loaded, onChange])

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        autoComplete="off"
      />
    </div>
  )
}
