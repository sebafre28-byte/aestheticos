'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Paso = {
  id: string
  titulo: string
  descripcion: string
  href: string
  hrefLabel: string
  completado: boolean
}

type Props = {
  bookingSlug: string | null
  appUrl: string
}

export function OnboardingChecklist({ bookingSlug, appUrl }: Props) {
  const [pasos, setPasos] = useState<Paso[]>([])
  const [cargando, setCargando] = useState(true)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    // Persistir si el usuario cerró el checklist
    const closed = localStorage.getItem('onboarding_checklist_cerrado')
    if (closed === '1') { setCerrado(true); setCargando(false); return }

    const supabase = createClient()
    Promise.all([
      supabase.from('profesionales').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('citas').select('id', { count: 'exact', head: true }).limit(1),
    ]).then(([prof, serv, citas]) => {
      const tieneProfesional = (prof.count ?? 0) > 0
      const tieneServicio = (serv.count ?? 0) > 0
      const tieneSlug = !!bookingSlug
      const tieneCita = (citas.count ?? 0) > 0

      const lista: Paso[] = [
        {
          id: 'cuenta',
          titulo: 'Creaste tu cuenta',
          descripcion: 'Ya estás dentro. Bienvenido a SimpliClinic.',
          href: '#',
          hrefLabel: '',
          completado: true,
        },
        {
          id: 'servicio',
          titulo: 'Agrega tu primer servicio',
          descripcion: 'Crea los servicios que ofrece tu clínica con duración y precio.',
          href: '/servicios',
          hrefLabel: 'Ir a Servicios →',
          completado: tieneServicio,
        },
        {
          id: 'profesional',
          titulo: 'Agrega un profesional',
          descripcion: 'Agrega al equipo que atiende en tu clínica.',
          href: '/configuracion?tab=equipo',
          hrefLabel: 'Ir a Configuración →',
          completado: tieneProfesional,
        },
        {
          id: 'link',
          titulo: 'Comparte tu link de reservas',
          descripcion: bookingSlug
            ? `Tu link: ${appUrl}/book/${bookingSlug}`
            : 'Configura el nombre de tu clínica para obtener tu link.',
          href: tieneSlug ? `/book/${bookingSlug}` : '/configuracion?tab=general',
          hrefLabel: tieneSlug ? 'Ver página →' : 'Configurar nombre →',
          completado: tieneSlug,
        },
        {
          id: 'cita',
          titulo: 'Agenda tu primera cita',
          descripcion: 'Crea la primera cita en tu agenda.',
          href: '/agenda',
          hrefLabel: 'Ir a Agenda →',
          completado: tieneCita,
        },
      ]

      setPasos(lista)
      setCargando(false)
    })
  }, [bookingSlug, appUrl])

  if (cargando || cerrado) return null

  const completados = pasos.filter((p) => p.completado).length
  const total = pasos.length
  const todoCompleto = completados === total

  // Ocultar automáticamente cuando todo esté completo
  if (todoCompleto) return null

  const pct = Math.round((completados / total) * 100)

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 relative">
      <button
        onClick={() => { localStorage.setItem('onboarding_checklist_cerrado', '1'); setCerrado(true) }}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-blue-100 transition-colors text-blue-300 hover:text-blue-500"
        aria-label="Cerrar"
      >
        <X className="size-4" />
      </button>

      <div className="mb-4 pr-6">
        <h3 className="text-[14px] font-semibold text-[#0B132B]">Completa la configuración de tu clínica</h3>
        <p className="text-[12px] text-slate-500 mt-0.5">{completados} de {total} pasos completados</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {pasos.map((paso) => (
          <div
            key={paso.id}
            className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
              paso.completado ? 'opacity-60' : 'bg-white/70 border border-blue-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {paso.completado
                ? <CheckCircle2 className="size-4.5 text-emerald-500" />
                : <Circle className="size-4.5 text-blue-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium leading-tight ${paso.completado ? 'line-through text-slate-400' : 'text-[#0B132B]'}`}>
                {paso.titulo}
              </p>
              {!paso.completado && (
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{paso.descripcion}</p>
              )}
            </div>
            {!paso.completado && paso.hrefLabel && (
              <Link
                href={paso.href}
                target={paso.id === 'link' ? '_blank' : undefined}
                className="shrink-0 flex items-center gap-0.5 text-[11px] font-semibold text-[#2563EB] hover:text-blue-700 whitespace-nowrap mt-0.5"
              >
                {paso.hrefLabel.replace(' →', '')}
                <ChevronRight className="size-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
