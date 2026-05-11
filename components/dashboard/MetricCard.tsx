import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type MetricCardProps = {
  title: string
  value: string
  detail?: string
  subtitle?: string
  icon: LucideIcon
  accent?: 'primary' | 'teal' | 'navy'
}

const accentStyles: Record<NonNullable<MetricCardProps['accent']>, string> = {
  primary: 'text-[#2563EB] bg-[#2563EB]/10',
  teal: 'text-[#14B8A6] bg-[#14B8A6]/10',
  navy: 'text-[#0B132B] bg-[#0B132B]/10',
}

export function MetricCard({
  title,
  value,
  detail,
  subtitle,
  icon: Icon,
  accent = 'primary',
}: MetricCardProps) {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-[#0B132B]">{title}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 px-4 pb-4">
        <p className="text-2xl font-bold tracking-tight text-[#0B132B]">{value}</p>
        {detail ? <p className="text-xs font-medium text-[#14B8A6]">{detail}</p> : null}
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  )
}
