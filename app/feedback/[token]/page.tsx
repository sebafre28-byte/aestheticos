import { createAdminClient } from '@/lib/supabase/admin'
import { FeedbackForm } from './FeedbackForm'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ r?: string }>
}

export default async function FeedbackPage({ params, searchParams }: Props) {
  const { token } = await params
  const { r: rating } = await searchParams

  const supabase = createAdminClient()

  // Look up cita by cancel_token
  const { data: cita } = await supabase
    .from('citas')
    .select(`
      id, inicio,
      pacientes ( nombre ),
      profesionales ( nombre ),
      servicios ( nombre ),
      clinicas ( id, nombre, logo_url, telefono, slug )
    `)
    .eq('cancel_token', token)
    .maybeSingle()

  if (!cita) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="text-[18px] font-bold text-gray-900 mb-2">Enlace no encontrado</h1>
          <p className="text-[14px] text-gray-500">Este enlace de feedback no es válido o ya expiró.</p>
        </div>
      </div>
    )
  }

  // Check if feedback already submitted
  const { data: existing } = await supabase
    .from('feedback_citas')
    .select('id, rating, comentario')
    .eq('cita_id', cita.id)
    .maybeSingle()

  const clinica = cita.clinicas as unknown as { id: string; nombre: string; logo_url: string | null; telefono: string | null; slug: string | null } | null
  const paciente = cita.pacientes as unknown as { nombre: string } | null
  const profesional = cita.profesionales as unknown as { nombre: string } | null
  const servicio = cita.servicios as unknown as { nombre: string } | null

  const fechaStr = new Date(cita.inicio).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago',
  })

  const ratingLabels: Record<string, { emoji: string; label: string; color: string }> = {
    excelente: { emoji: '😊', label: 'Excelente', color: 'text-green-600' },
    regular:   { emoji: '😐', label: 'Regular',   color: 'text-yellow-600' },
    mala:      { emoji: '😞', label: 'Mala',      color: 'text-red-600' },
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-8 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            {clinica?.logo_url ? (
              <Image src={clinica.logo_url} alt={clinica.nombre} width={32} height={32} className="rounded-lg" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
                {clinica?.nombre?.[0] ?? 'C'}
              </div>
            )}
            <span className="text-[13px] font-medium opacity-90">{clinica?.nombre}</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl mx-auto mb-3">⭐</div>
          <h1 className="text-[22px] font-bold leading-tight">¿Cómo fue tu visita?</h1>
          <p className="text-[13px] opacity-80 mt-1">
            Hola, <strong>{paciente?.nombre?.split(' ')[0]}</strong>. Tu opinión nos ayuda a mejorar.
          </p>
        </div>

        {/* Cita info */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="space-y-1.5 text-[13px] text-gray-600">
            {servicio && <div><span className="font-medium text-gray-800">{servicio.nombre}</span></div>}
            {profesional && <div>con <span className="font-medium">{profesional.nombre}</span></div>}
            <div className="text-gray-400">{fechaStr}</div>
          </div>
        </div>

        {/* Form or already submitted */}
        <div className="px-6 py-6">
          {existing ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">{ratingLabels[existing.rating]?.emoji ?? '✅'}</div>
              <p className="text-[16px] font-semibold text-gray-900">¡Gracias por tu feedback!</p>
              <p className="text-[13px] text-gray-500 mt-1">
                Ya registramos tu valoración: <span className={`font-medium ${ratingLabels[existing.rating]?.color}`}>{ratingLabels[existing.rating]?.label}</span>
              </p>
              {existing.comentario && (
                <p className="text-[13px] text-gray-400 mt-2 italic">"{existing.comentario}"</p>
              )}
            </div>
          ) : (
            <FeedbackForm
              citaId={cita.id}
              clinicaId={clinica?.id ?? ''}
              pacienteId={null}
              initialRating={rating && ['excelente', 'regular', 'mala'].includes(rating) ? rating : undefined}
              clinicaTelefono={clinica?.telefono}
              clinicaSlug={clinica?.slug}
            />
          )}
        </div>
      </div>
    </div>
  )
}
