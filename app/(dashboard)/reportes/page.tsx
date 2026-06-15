import { ReportesGuard } from './ReportesGuard'
import { getReporteData, getMesesDisponibles } from '@/lib/reportes/queries'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportesClient } from '@/components/reportes/ReportesClient'

type SearchParams = Promise<{ year?: string; month?: string }>

export default async function ReportesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: rol } = await supabase.rpc('auth_rol_usuario')
  if (rol !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const [reporte, meses] = await Promise.all([
    getReporteData(year, month),
    getMesesDisponibles(),
  ])

  return (
    <ReportesGuard>
      <ReportesClient reporte={reporte} meses={meses} />
    </ReportesGuard>
  )
}
