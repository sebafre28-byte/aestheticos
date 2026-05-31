'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PacienteRow } from '@/lib/pacientes/queries'

type FormData = {
  nombre: string
  telefono: string
  email: string
  rut: string
  fecha_nacimiento: string
  genero: string
  direccion: string
}

type Props = {
  open: boolean
  paciente?: PacienteRow | null
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
}

function limpiarRut(rut: string) {
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase()
}

function formatearRut(rut: string): string {
  const clean = limpiarRut(rut)
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const bodyFormat = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${bodyFormat}-${dv}`
}

function validarRutChileno(rut: string): boolean {
  const clean = limpiarRut(rut)
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false

  const cuerpo = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let suma = 0
  let multiplo = 2

  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dvEsperado === dv
}

export function FormPaciente({ open, paciente, onClose, onSubmit }: Props) {
  const [data, setData] = useState<FormData>({
    nombre: paciente?.nombre ?? '',
    telefono: paciente?.telefono ?? '',
    email: paciente?.email ?? '',
    rut: paciente?.rut ?? '',
    fecha_nacimiento: paciente?.fecha_nacimiento ?? '',
    genero: paciente?.genero ?? '',
    direccion: paciente?.direccion ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const titulo = paciente ? 'Editar paciente' : 'Nuevo paciente'

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!data.nombre.trim()) return setError('El nombre es obligatorio.')
    if (!data.telefono.trim()) return setError('El teléfono es obligatorio.')
    if (data.rut.trim() && !validarRutChileno(data.rut.trim())) return setError('RUT inválido.')

    setGuardando(true)
    await onSubmit({
      ...data,
      rut: data.rut ? formatearRut(data.rut) : '',
    })
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-gray-900">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-2 gap-4 overflow-y-auto max-h-[70vh]">
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Nombre *</Label>
            <Input value={data.nombre} onChange={(e) => setData((v) => ({ ...v, nombre: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">Teléfono *</Label>
            <Input value={data.telefono} onChange={(e) => setData((v) => ({ ...v, telefono: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">RUT</Label>
            <Input
              value={data.rut}
              onChange={(e) => setData((v) => ({ ...v, rut: e.target.value }))}
              placeholder="12.345.678-5"
            />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Email</Label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => setData((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">Fecha de nacimiento</Label>
            <Input
              type="date"
              value={data.fecha_nacimiento}
              onChange={(e) => setData((v) => ({ ...v, fecha_nacimiento: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-[12px] font-semibold">Género</Label>
            <select
              value={data.genero}
              onChange={(e) => setData((v) => ({ ...v, genero: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            >
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-[12px] font-semibold">Dirección</Label>
            <Input
              value={data.direccion}
              onChange={(e) => setData((v) => ({ ...v, direccion: e.target.value }))}
              placeholder="Calle, número, ciudad..."
            />
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
            {guardando ? 'Guardando...' : paciente ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
