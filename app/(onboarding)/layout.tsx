import Image from 'next/image'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      <header className="flex justify-center pt-8 pb-2">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ backgroundColor: '#0B132B' }}>
          <Image src="/logo-icon.jpg" width={28} height={28} alt="SimpliClinic" className="rounded-lg" />
          <span className="text-[16px] font-bold text-white tracking-tight">SimpliClinic</span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
