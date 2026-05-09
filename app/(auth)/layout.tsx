export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/50 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
