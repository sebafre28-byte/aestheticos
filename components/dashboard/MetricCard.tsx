import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type MetricCardProps = {
  title: string
  value: string
  detail?: string
  subtitle?: string
  icon: LucideIcon
  accent?: 'primary' | 'teal' | 'navy'
  trend?: { valor: number; subio: boolean; label?: string }
  progress?: number
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
  trend,
  progress,
}: MetricCardProps) {
  return (
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 pb-2 pt-4 sm:pt-5">
        <CardTitle className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wide font-medium">{title}</CardTitle>
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 space-y-2">
        <div className="flex items-end justify-between gap-1">
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B132B] truncate">{value}</p>
          {trend != null && (
            <span className={`shrink-0 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${trend.subio ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
              {trend.subio ? '+' : '-'}{trend.valor}%{trend.label ? ` ${trend.label}` : ''}
            </span>
          )}
        </div>
        {progress != null && (
          <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: accent === 'teal' ? '#14B8A6' : accent === 'navy' ? '#0B132B' : '#2563EB',
              }}
            />
          </div>
        )}
        {detail ? <p className="text-xs font-medium text-[#14B8A6]">{detail}</p> : null}
        {subtitle ? <p className="text-[11px] text-slate-400">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between px-6 pb-2 pt-5">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
      </CardHeader>
      <CardContent className="space-y-2 px-6 pb-5">
        <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  )
}
