'use client'
import { Lock } from 'lucide-react'

type Props = {
  titulo: string
  topPx: number
  heightPx: number
  onEliminar?: () => void
}

export function BloqueHorario({ titulo, topPx, heightPx, onEliminar }: Props) {
  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center justify-between px-2 group"
      style={{
        top: topPx,
        height: Math.max(heightPx, 20),
        background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)',
        borderLeft: '3px solid #9ca3af',
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Lock className="size-3 text-gray-400 shrink-0" />
        <span className="text-[11px] font-medium text-gray-500 truncate">{titulo}</span>
      </div>
      {onEliminar && (
        <button
          onClick={onEliminar}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-[10px] shrink-0 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  )
}
