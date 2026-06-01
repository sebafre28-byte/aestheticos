import Image from 'next/image'

interface Props {
  size?: number
  light?: boolean
  showText?: boolean
  className?: string
}

export function SimpliClinicLogo({ size = 28, light = false, showText = true, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <Image
        src="/logo-icon.jpg"
        width={size}
        height={size}
        alt="SimpliClinic"
        className="rounded-lg flex-shrink-0"
      />
      {showText && (
        <span className="text-[18px] font-extrabold leading-none tracking-tight">
          <span style={{ color: light ? 'white' : '#0B132B' }}>Simpli</span>
          <span style={{ color: light ? '#60A5FA' : '#2563EB' }}>Clinic</span>
        </span>
      )}
    </div>
  )
}
