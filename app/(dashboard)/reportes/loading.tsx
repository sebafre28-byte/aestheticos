export default function LoadingReportesPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full bg-slate-50">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
