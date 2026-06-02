export default function LoadingInboxPage() {
  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-slate-100 bg-white p-4 space-y-3">
        <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200 mx-auto" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
