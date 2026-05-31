'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useRol, puedeAcceder, type RolActual } from '@/lib/auth/useRol'
import type { RolUsuario } from '@/lib/usuarios/queries'

/**
 * Protege una página completa. Redirige a /dashboard si el rol no tiene acceso.
 * Uso: envolver el contenido de la página con <RolGuard modulo="reportes">
 */
export function RolGuard({
  modulo,
  children,
}: {
  modulo: string
  children: React.ReactNode
}) {
  const { rol, cargando } = useRol()
  const router = useRouter()

  useEffect(() => {
    if (!cargando && !puedeAcceder(rol, modulo)) {
      router.replace('/dashboard')
    }
  }, [rol, cargando, modulo, router])

  if (cargando) return null
  if (!puedeAcceder(rol, modulo)) return null

  return <>{children}</>
}

/**
 * Muestra contenido solo si el rol tiene acceso.
 * Uso: <SoloRol roles={['admin']}><button>Eliminar</button></SoloRol>
 */
export function SoloRol({
  roles,
  children,
  fallback = null,
}: {
  roles: RolUsuario[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { rol, cargando } = useRol()

  if (cargando) return null
  if (!rol || !roles.includes(rol)) return <>{fallback}</>

  return <>{children}</>
}

/**
 * Hook para verificar acceso a un módulo o rol específico.
 */
export function useAcceso(modulo: string): { puede: boolean; rol: RolActual; cargando: boolean } {
  const { rol, cargando } = useRol()
  return { puede: puedeAcceder(rol, modulo), rol, cargando }
}
