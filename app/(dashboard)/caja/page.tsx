import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getResumenCajaHoy, getHistorialCierres, getComisionesPeriodo } from '@/lib/cobros/caja'
import { CajaClient } from '@/components/cobros/CajaClient'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default async function CajaPage() {
  const supabase = await createClient()
  const { data: rol } = await supabase.rpc('auth_rol_usuario')
  if (rol === 'profesional') redirect('/agenda')

  const hoy = new Date()
  const desde = format(startOfMonth(hoy), 'yyyy-MM-dd')
  const hasta = format(endOfMonth(hoy), 'yyyy-MM-dd')

  const [resumenHoy, historial, comisiones] = await Promise.all([
    getResumenCajaHoy(),
    getHistorialCierres(30),
    getComisionesPeriodo(desde, hasta),
  ])

  return <CajaClient resumenHoy={resumenHoy} historial={historial} comisiones={comisiones} mesLabel={format(hoy, 'MMMM yyyy', { locale: (await import('date-fns/locale')).es })} />
}
