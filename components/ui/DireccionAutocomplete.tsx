'use client'

import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DireccionAutocomplete({ value, onChange, placeholder = 'Av. Ejemplo 1234, Santiago' }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey || initialized.current) return

    async function init() {
      try {
        if (!window.google?.maps) {
          await new Promise<void>((resolve, reject) => {
            if (document.querySelector('#gmap-script')) { resolve(); return }
            const s = document.createElement('script')
            s.id = 'gmap-script'
            s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`
            s.async = true
            s.onload = () => resolve()
            s.onerror = reject
            document.head.appendChild(s)
          })
          await new Promise<void>(resolve => {
            const t = setInterval(() => { if (window.google?.maps) { clearInterval(t); resolve() } }, 100)
          })
        }

        const { PlaceAutocompleteElement } = await (window.google.maps as unknown as {
          importLibrary: (lib: string) => Promise<{ PlaceAutocompleteElement: new (opts: object) => HTMLElement & {
            addEventListener: (event: string, cb: (e: Event) => void) => void
          } }>
        }).importLibrary('places')

        if (!wrapperRef.current || initialized.current) return
        initialized.current = true

        const el = new PlaceAutocompleteElement({
          componentRestrictions: { country: ['cl', 'ar', 'mx', 'co', 'pe', 'uy', 'ec', 'bo', 'py', 've'] },
          types: ['address'],
        })

        el.style.cssText = `
          width: 100%;
          height: 36px;
          border: 1px solid hsl(var(--input));
          border-radius: calc(var(--radius) - 2px);
          background: white;
          font-size: 13px;
          font-family: inherit;
          color: #111827;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          outline: none;
          box-sizing: border-box;
          color-scheme: light;
        `
        el.setAttribute('placeholder', placeholder)

        el.addEventListener('gmp-select', async (e: Event) => {
          const detail = (e as CustomEvent).detail
          if (detail?.place) {
            await detail.place.fetchFields({ fields: ['formattedAddress'] })
            onChange(detail.place.formattedAddress ?? '')
          }
        })

        wrapperRef.current.appendChild(el)

        // Pre-fill with current saved value
        setTimeout(() => {
          const inner = wrapperRef.current?.querySelector('input')
          if (inner && value) inner.value = value
        }, 400)

      } catch {
        // fallback — plain input below handles it
      }
    }

    init()
  }, [onChange, placeholder]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep inner input in sync when value prop changes (e.g. after load)
  useEffect(() => {
    if (!initialized.current || !wrapperRef.current) return
    const inner = wrapperRef.current.querySelector('input')
    if (inner && value && inner.value !== value) inner.value = value
  }, [value])

  return (
    <div className="w-full">
      {hasKey
        ? <div ref={wrapperRef} className="w-full" />
        : (
          <input
            type="text"
            defaultValue={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )
      }
    </div>
  )
}
