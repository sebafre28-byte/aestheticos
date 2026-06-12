'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  tipo: 'pacientes' | 'conversaciones_ia'
  planActual: string
  usados: number
  limite: number
}

export default function LimiteAlcanzadoBanner({ tipo, planActual, usados, limite }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  const porcentaje = Math.round((usados / limite) * 100)
  const agotado = usados >= limite

  const texto = tipo === 'pacientes'
    ? agotado
      ? `Alcanzaste el límite de ${limite} pacientes del plan ${planActual}. Actualiza para agregar más.`
      : `Tienes ${usados} de ${limite} pacientes (${porcentaje}%). Próximo al límite del plan ${planActual}.`
    : agotado
      ? `Agotaste las ${limite} conversaciones IA de este mes. Actualiza para continuar.`
      : `Usaste ${usados}/${limite} conversaciones IA este mes (${porcentaje}%).`

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
      <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-amber-800">{texto}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push('/configuracion?tab=plan')}
          className="text-[12px] font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
        >
          Ver planes
        </button>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
