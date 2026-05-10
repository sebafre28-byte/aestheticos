'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ServicioRow } from '@/lib/servicios/queries'

type FormData = {
  nombre: string
  descripcion: string
  duracion_minutos: number
  precio: number
  color: string
  activo: boolean
}

type Props = {
  open: boolean
  servicio?: ServicioRow | null
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
}

const COLORES_PRESET = ['#2563EB', '#14B8A6', '#0EA5E9', '#8B5CF6', '#EC4899', '#F97316']

export function FormServicio({ open, servicio, onClose, onSubmit }: Props) {
  const [data, setData] = useState<FormData>({
    nombre: servicio?.nombre ?? '',
    descripcion: servicio?.descripcion ?? '',
    duracion_minutos: servicio?.duracion_minutos ?? 60,
    precio: servicio?.precio ?? 0,
    color: servicio?.color ?? '#2563EB',
    activo: servicio?.activo ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const titulo = servicio ? 'Editar servicio' : 'Nuevo servicio'
  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!data.nombre.trim()) return setError('El nombre es obligatorio.')
    if (!Number.isFinite(data.duracion_minutos) || data.duracion_minutos <= 0) return setError('Duración inválida.')
    if (!Number.isFinite(data.precio) || data.precio < 0) return setError('Precio inválido.')

    setGuardando(true)
    await onSubmit(data)
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-gray-900">{titulo}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Nombre *</Label>
            <Input value={data.nombre} onChange={(e) => setData((v) => ({ ...v, nombre: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Descripción</Label>
            <textarea
              value={data.descripcion}
              onChange={(e) => setData((v) => ({ ...v, descripcion: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">Duración (min) *</Label>
            <Input
              type="number"
              min={5}
              step={5}
              value={data.duracion_minutos}
              onChange={(e) => setData((v) => ({ ...v, duracion_minutos: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">Precio (CLP) *</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={data.precio}
              onChange={(e) => setData((v) => ({ ...v, precio: Number(e.target.value) }))}
            />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORES_PRESET.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setData((v) => ({ ...v, color }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-105 ${
                    data.color === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <Input
                value={data.color}
                onChange={(e) => setData((v) => ({ ...v, color: e.target.value }))}
                placeholder="#2563EB"
                className="max-w-[130px]"
              />
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="activo-servicio"
              type="checkbox"
              checked={data.activo}
              onChange={(e) => setData((v) => ({ ...v, activo: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="activo-servicio" className="text-[12px] font-medium text-gray-700">
              Servicio activo
            </Label>
          </div>
          {error && <p className="col-span-2 text-[12px] text-red-500 font-medium">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={guardando}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            {guardando ? 'Guardando...' : servicio ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>
    </div>
  )
}
