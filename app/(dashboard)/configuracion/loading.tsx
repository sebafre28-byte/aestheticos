export default function LoadingConfiguracionPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
