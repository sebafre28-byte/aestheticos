export default function LoadingPacientesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
