import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'
import { scheduleWhatsappJobsForCitaId, cancelWhatsappJobsForCita } from '@/lib/whatsapp/jobs'

export async function POST(request: NextRequest) {
  try {
    const { citaId, action } = await request.json() as { citaId: string; action: 'schedule' | 'cancel' | 'reschedule' }

    if (!citaId || !action) {
      return NextResponse.json({ error: 'citaId y action son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const miembro = await getClinicaIdForUser(supabase, user.id)
    if (!miembro) return NextResponse.json({ error: 'No perteneces a ninguna clínica' }, { status: 403 })

    const { data: cita } = await supabase
      .from('citas')
      .select('id, clinica_id')
      .eq('id', citaId)
      .single()

    if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    // Verify the cita belongs to the authenticated user's clinic
    if (cita.clinica_id !== miembro.clinicaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (action === 'cancel' || action === 'reschedule') {
      await cancelWhatsappJobsForCita(citaId)
    }

    if (action === 'schedule' || action === 'reschedule') {
      await scheduleWhatsappJobsForCitaId(citaId)
    }

    return NextResponse.json({ ok: true, action, citaId })
  } catch (e) {
    console.error('[api/citas/jobs] error', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
