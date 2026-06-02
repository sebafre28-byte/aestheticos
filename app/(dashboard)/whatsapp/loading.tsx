export default function LoadingWhatsappPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
