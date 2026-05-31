function ClinicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="white" />
      <rect x="13" y="7" width="6" height="18" rx="3" fill="#2563EB" />
      <rect x="7" y="13" width="18" height="6" rx="3" fill="#2563EB" />
    </svg>
  )
}


export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <header className="flex justify-center pt-8 pb-2">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ backgroundColor: '#0B132B' }}>
          <ClinicIcon />
          <span className="text-[16px] font-bold text-white tracking-tight">SimpliClinic</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
