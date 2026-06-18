'use client'

import { useEffect, useState } from 'react'
import { getRolActual, type RolActual } from '@/lib/usuarios/queries'

export type { RolActual }

let cached: RolActual | undefined = undefined

export function useRol(): { rol: RolActual; cargando: boolean } {
  const [rol, setRol] = useState<RolActual>(cached ?? null)
  const [cargando, setCargando] = useState(cached === undefined)

  useEffect(() => {
    if (cached !== undefined) {
      setRol(cached)
      setCargando(false)
      return
    }
    getRolActual().then((r) => {
      cached = r
      setRol(r)
      setCargando(false)
    })
  }, [])

  return { rol, cargando }
}

export function puedeAcceder(rol: RolActual, modulo: string): boolean {
  if (!rol) return false
  if (rol === 'admin') return true
  return PERMISOS[rol]?.includes(modulo) ?? false
}

const PERMISOS: Record<string, string[]> = {
  recepcionista: ['dashboard', 'agenda', 'pacientes', 'servicios', 'whatsapp', 'inbox', 'caja', 'ayuda'],
  profesional:   ['dashboard', 'agenda', 'pacientes', 'mi-cuenta', 'ayuda'],
  coordinador:   ['dashboard', 'agenda', 'pacientes', 'servicios', 'whatsapp', 'inbox', 'caja', 'configuracion', 'ayuda'],
}
