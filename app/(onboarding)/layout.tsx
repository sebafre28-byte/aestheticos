function ClinicIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect x="1.5" y="1.5" width="33" height="33" rx="9" stroke="#2563EB" strokeWidth="2.8" />
      <path d="M10.5 20.5 Q18 27 25.5 20.5" stroke="#2563EB" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="12" r="2.2" fill="#2563EB" />
    </svg>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[20px] font-extrabold leading-none tracking-tight">
        <span style={{ color: '#0B132B' }}>Simpli</span>
        <span style={{ color: '#2563EB' }}>Clinic</span>
      </span>
      <ClinicIcon size={28} />
    </div>
  )
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <header className="flex justify-center pt-8 pb-2">
        <Logo />
      </header>
      <main>{children}</main>
    </div>
  )
}
