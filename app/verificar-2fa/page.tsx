'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

function Verificar2FAContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/agenda'

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    sendCode()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendCode() {
    setSending(true)
    setError(null)
    const res = await fetch('/api/auth/mfa/send', { method: 'POST' })
    const json = await res.json()
    setSending(false)
    if (!res.ok) {
      setError(json.error ?? 'Error enviando código')
      return
    }
    setMaskedEmail(json.email)
    setCooldown(60)
    setDigits(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  function handleDigit(idx: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = char
    setDigits(next)
    setError(null)
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
    // Auto-verify when all 6 filled
    if (char && idx === 5) {
      const code = [...next].join('')
      if (code.length === 6) verify(code)
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const code = digits.join('')
      if (code.length === 6) verify(code)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      verify(pasted)
    }
  }

  async function verify(code: string) {
    setVerifying(true)
    setError(null)
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Código incorrecto')
      setVerifying(false)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    router.push(redirectTo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <ShieldCheck className="size-7 text-[#2563EB]" />
          </div>
          <h1 className="text-[18px] font-bold text-gray-900">Verificación en dos pasos</h1>
          {maskedEmail ? (
            <p className="text-[13px] text-gray-500 mt-1 text-center">
              Enviamos un código a <span className="font-medium text-gray-700">{maskedEmail}</span>
            </p>
          ) : (
            <p className="text-[13px] text-gray-500 mt-1">Enviando código...</p>
          )}
        </div>

        {/* 6-digit input */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-14 text-center text-[22px] font-bold rounded-xl border-2 outline-none transition-colors ${
                error
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : d
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-gray-200 bg-white text-gray-900 focus:border-[#2563EB]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-[13px] text-red-600 text-center mb-4">{error}</p>
        )}

        {verifying && (
          <div className="flex items-center justify-center gap-2 mb-4 text-[13px] text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Verificando...
          </div>
        )}

        <Button
          onClick={() => verify(digits.join(''))}
          disabled={digits.join('').length < 6 || verifying}
          className="w-full text-white h-10 text-[14px] font-semibold mb-4"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          {verifying ? <><Loader2 className="size-4 animate-spin mr-2" />Verificando...</> : 'Verificar'}
        </Button>

        <div className="text-center">
          <button
            onClick={sendCode}
            disabled={sending || cooldown > 0}
            className="text-[13px] text-[#2563EB] hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {sending ? 'Enviando...' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Verificar2FAPage() {
  return (
    <Suspense>
      <Verificar2FAContent />
    </Suspense>
  )
}
