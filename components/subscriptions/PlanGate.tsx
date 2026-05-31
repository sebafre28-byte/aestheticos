'use client'

import Link from 'next/link'
import { Lock, MessageCircle, Inbox, BarChart3, CalendarDays, Globe, Grid3X3 } from 'lucide-react'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

type FeatureInfo = {
  nombre: string
  descripcion: string
  beneficios: string[]
  icono: React.ReactNode
}

const FEATURE_INFO: Record<string, FeatureInfo> = {
  whatsapp: {
    nombre: 'WhatsApp Reminders',
    descripcion: 'Reduce no-shows con recordatorios automáticos',
    beneficios: [
      'Recordatorios automáticos 24 h antes',
      'Confirmación de citas por mensaje',
      'Seguimiento post-cita con feedback',
    ],
    icono: <MessageCircle className="size-8 text-[#2563EB]" />,
  },
  inbox: {
    nombre: 'Inbox de mensajes',
    descripcion: 'Gestiona todas las conversaciones de WhatsApp',
    beneficios: [
      'Bandeja centralizada de conversaciones',
      'Historial completo por paciente',
      'Respuesta rápida desde la clínica',
    ],
    icono: <Inbox className="size-8 text-[#2563EB]" />,
  },
  reportes: {
    nombre: 'Reportes y Analytics',
    descripcion: 'Análisis completo de tu clínica',
    beneficios: [
      'KPIs de ingresos y ocupación',
      'Top servicios y profesionales',
      'Exportación en PDF y Excel',
    ],
    icono: <BarChart3 className="size-8 text-[#2563EB]" />,
  },
  booking_publico: {
    nombre: 'Reservas online',
    descripcion: 'Tus pacientes reservan 24/7 sin llamar',
    beneficios: [
      'Link público de reservas',
      'Confirmación automática por WhatsApp',
      'Sincronización en tiempo real con la agenda',
    ],
    icono: <Globe className="size-8 text-[#2563EB]" />,
  },
  agenda_semana: {
    nombre: 'Vista semana',
    descripcion: 'Organiza la semana de toda tu clínica',
    beneficios: [
      'Vista semanal de todos los profesionales',
      'Arrastrar y soltar para mover citas',
      'Detección de conflictos de horario',
    ],
    icono: <CalendarDays className="size-8 text-[#2563EB]" />,
  },
  agenda_mes: {
    nombre: 'Vista mes',
    descripcion: 'Panorama mensual de tu agenda',
    beneficios: [
      'Visión completa del mes',
      'Identificar días con alta demanda',
      'Planificación de vacaciones y cierres',
    ],
    icono: <Grid3X3 className="size-8 text-[#2563EB]" />,
  },
}

const DEFAULT_INFO: FeatureInfo = {
  nombre: 'Función Pro',
  descripcion: 'Disponible en planes superiores',
  beneficios: ['Acceso completo a esta función', 'Soporte prioritario', 'Sin límites de uso'],
  icono: <Lock className="size-8 text-[#2563EB]" />,
}

export function PlanGate({
  feature,
  children,
}: {
  feature: string
  children: React.ReactNode
}) {
  const { puedeUsar, cargando } = useSubscripcion()

  if (cargando) return (
    <div className="p-6">
      <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse mb-4" />
      <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
      <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
    </div>
  )

  if (puedeUsar(feature)) return <>{children}</>

  const info = FEATURE_INFO[feature] ?? DEFAULT_INFO

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
            {info.icono}
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-[17px] font-bold text-[#0B132B]">{info.nombre}</h2>
          <p className="text-[13px] text-gray-500">{info.descripcion}</p>
        </div>

        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
          Esta función requiere el plan Pro
        </p>

        <ul className="text-left space-y-2">
          {info.beneficios.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[13px] text-gray-700">
              <span className="text-[#14B8A6] font-bold mt-0.5">✓</span>
              {b}
            </li>
          ))}
        </ul>

        <Link
          href="/configuracion?tab=plan"
          className="block w-full bg-[#2563EB] hover:bg-blue-700 transition-colors text-white text-[13px] font-semibold py-2.5 rounded-xl"
        >
          Ver planes
        </Link>
      </div>
    </div>
  )
}
