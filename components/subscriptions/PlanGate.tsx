'use client'

import Link from 'next/link'
import { Lock, MessageCircle, Inbox, BarChart3, CalendarDays, Globe, Grid3X3, Bot, Megaphone, Package } from 'lucide-react'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

type FeatureInfo = {
  nombre: string
  descripcion: string
  beneficios: string[]
  icono: React.ReactNode
  planRequerido: 'pro' | 'clinica'
}

const PLAN_NOMBRES: Record<'pro' | 'clinica', string> = {
  pro:     'Simpli+',
  clinica: 'Simpli Pro',
}

const PLAN_PRECIOS: Record<'pro' | 'clinica', string> = {
  pro:     '$59.900/mes',
  clinica: '$99.900/mes',
}

const FEATURE_INFO: Record<string, FeatureInfo> = {
  whatsapp: {
    nombre: 'Recordatorios WhatsApp',
    descripcion: 'Reduce no-shows con recordatorios automáticos por WhatsApp',
    beneficios: [
      'Recordatorios automáticos 24 h antes',
      'Confirmación de citas por mensaje',
      'Seguimiento post-cita con feedback',
    ],
    icono: <MessageCircle className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  inbox: {
    nombre: 'Inbox de mensajes',
    descripcion: 'Gestiona todas las conversaciones de WhatsApp en un solo lugar',
    beneficios: [
      'Bandeja centralizada de conversaciones',
      'Historial completo por paciente',
      'Respuesta rápida desde la clínica',
    ],
    icono: <Inbox className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  agente_wsp: {
    nombre: 'Agente IA de WhatsApp',
    descripcion: 'Un asistente inteligente que agenda citas automáticamente por WhatsApp',
    beneficios: [
      'Responde y agenda 24/7 sin intervención humana',
      'Entiende lenguaje natural en español',
      'Consulta disponibilidad y crea citas en tiempo real',
    ],
    icono: <Bot className="size-8 text-[#2563EB]" />,
    planRequerido: 'clinica',
  },
  reportes: {
    nombre: 'Reportes y Analytics',
    descripcion: 'Análisis completo del rendimiento de tu clínica',
    beneficios: [
      'KPIs de ingresos y ocupación',
      'Top servicios y profesionales',
      'Exportación en PDF y Excel',
    ],
    icono: <BarChart3 className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  booking_publico: {
    nombre: 'Reservas online',
    descripcion: 'Tus pacientes reservan 24/7 sin necesidad de llamar',
    beneficios: [
      'Link público de reservas personalizado',
      'Confirmación automática por WhatsApp',
      'Sincronización en tiempo real con la agenda',
    ],
    icono: <Globe className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  agenda_semana: {
    nombre: 'Vista semanal',
    descripcion: 'Organiza la semana completa de toda tu clínica',
    beneficios: [
      'Vista semanal de todos los profesionales',
      'Arrastrar y soltar para mover citas',
      'Detección de conflictos de horario',
    ],
    icono: <CalendarDays className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  agenda_mes: {
    nombre: 'Vista mensual',
    descripcion: 'Panorama mensual de toda tu agenda',
    beneficios: [
      'Visión completa del mes',
      'Identifica días con alta demanda',
      'Planificación de vacaciones y cierres',
    ],
    icono: <Grid3X3 className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  marketing: {
    nombre: 'Marketing automático',
    descripcion: 'Mensajes automáticos para fidelizar a tus pacientes',
    beneficios: [
      'Felicitación de cumpleaños automática',
      'Mensajes de reactivación para pacientes inactivos',
      'Aumenta la recurrencia sin esfuerzo',
    ],
    icono: <Megaphone className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
  paquetes: {
    nombre: 'Paquetes de sesiones',
    descripcion: 'Vende paquetes de múltiples sesiones a tus pacientes',
    beneficios: [
      'Paquetes con descuento para fidelizar',
      'Control automático de sesiones usadas',
      'Historial de consumo por paciente',
    ],
    icono: <Package className="size-8 text-[#2563EB]" />,
    planRequerido: 'pro',
  },
}

const DEFAULT_INFO: FeatureInfo = {
  nombre: 'Función avanzada',
  descripcion: 'Disponible en planes superiores',
  beneficios: ['Acceso completo a esta función', 'Soporte prioritario', 'Sin límites de uso'],
  icono: <Lock className="size-8 text-[#2563EB]" />,
  planRequerido: 'pro',
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
  const planNombre = PLAN_NOMBRES[info.planRequerido]
  const planPrecio = PLAN_PRECIOS[info.planRequerido]

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

        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-[12px] text-[#2563EB] font-semibold">
            Disponible en {planNombre}
          </p>
          <p className="text-[11px] text-blue-400 mt-0.5">{planPrecio} · cancela cuando quieras</p>
        </div>

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
          Upgrade a {planNombre} — {planPrecio}
        </Link>

        <p className="text-[11px] text-gray-400">
          También puedes comparar todos los planes en la página de precios
        </p>
      </div>
    </div>
  )
}
