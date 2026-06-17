export default function Loading() {
  return (
    <div className="flex h-full flex-col p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="flex-1 rounded-xl border border-slate-200 bg-white animate-pulse" />
    </div>
  )
}
