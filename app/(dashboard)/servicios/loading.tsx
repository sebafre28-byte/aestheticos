export default function LoadingServiciosPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 w-full animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
