import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleWhatsappJobsForCitaId, cancelWhatsappJobsForCita } from '@/lib/whatsapp/jobs'

export async function POST(request: NextRequest) {
  try {
    const { citaId, action } = await request.json() as { citaId: string; action: 'schedule' | 'cancel' | 'reschedule' }

    if (!citaId || !action) {
      return NextResponse.json({ error: 'citaId y action son requeridos' }, { status: 400 })
    }

    // Verificar que la cita pertenece a la clínica del usuario autenticado
    const supabase = await import('@/lib/supabase/server').then((m) => m.createClient())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: cita } = await supabase
      .from('citas')
      .select('id, clinica_id')
      .eq('id', citaId)
      .single()

    if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

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
