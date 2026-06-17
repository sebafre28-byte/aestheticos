'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Download, Loader2, Upload, X } from 'lucide-react'

type Resultado = {
  importados: number
  omitidos: number
  errores: string[]
}

type Props = {
  onClose: () => void
  onImportado: () => void
}

const TEMPLATE_HEADERS = ['Nombre', 'RUT', 'Email', 'Teléfono', 'Fecha de nacimiento', 'Género', 'Dirección', 'Alergias', 'Condiciones', 'Notas']
const TEMPLATE_ROW = ['María García López', '12.345.678-9', 'maria@email.com', '+56912345678', '15/03/1985', 'femenino', 'Av. Providencia 123', 'Penicilina', 'Hipertensión', 'Prefiere citas en la tarde']

function descargarPlantilla() {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const BOM = '﻿'
  const csv = BOM + [
    TEMPLATE_HEADERS.join(','),
    TEMPLATE_ROW.map(esc).join(','),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-pacientes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ModalImportPacientes({ onClose, onImportado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setArchivo(f); setResultado(null); setError(null) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      setArchivo(f); setResultado(null); setError(null)
    }
  }

  async function handleImportar() {
    if (!archivo) return
    setImportando(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', archivo)
      const res = await fetch('/api/import/pacientes', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al importar'); return }
      setResultado(data)
      if (data.importados > 0) onImportado()
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setImportando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Importar pacientes</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Sube un archivo CSV o Excel con los datos de tus pacientes</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="size-4 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Plantilla */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-[13px] font-semibold text-blue-900 mb-1">Paso 1 — Descarga la plantilla</p>
              <p className="text-[12px] text-blue-700 mb-3">
                Usa esta plantilla para asegurarte de que los campos se importen correctamente.
                Columnas aceptadas: <span className="font-medium">Nombre</span> (requerido), RUT, Email, Teléfono, Fecha de nacimiento (dd/mm/aaaa), Género, Dirección, Alergias, Condiciones, Notas.
              </p>
              <button
                onClick={descargarPlantilla}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-[12px] font-medium text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Download className="size-3.5" />
                Descargar plantilla CSV
              </button>
            </div>

            {/* Upload */}
            <div>
              <p className="text-[13px] font-semibold text-gray-900 mb-2">Paso 2 — Sube tu archivo</p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors p-6 flex flex-col items-center gap-2 text-center"
              >
                <Upload className="size-6 text-gray-400" />
                {archivo ? (
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{archivo.name}</p>
                    <p className="text-[11px] text-gray-400">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-gray-600">Arrastra tu archivo aquí o haz click para seleccionar</p>
                    <p className="text-[11px] text-gray-400">Formatos aceptados: .csv, .xlsx</p>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
                {error}
              </div>
            )}

            {/* Resultado */}
            {resultado && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                  <p className="text-[13px] font-semibold text-green-900">
                    {resultado.importados} paciente{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''} correctamente
                  </p>
                </div>
                {resultado.omitidos > 0 && (
                  <p className="text-[12px] text-green-700 ml-6">
                    {resultado.omitidos} fila{resultado.omitidos !== 1 ? 's' : ''} omitida{resultado.omitidos !== 1 ? 's' : ''} (sin nombre o RUT duplicado)
                  </p>
                )}
                {resultado.errores.length > 0 && (
                  <div className="ml-6">
                    <p className="text-[12px] font-medium text-red-700 mb-1">{resultado.errores.length} error{resultado.errores.length !== 1 ? 'es' : ''}:</p>
                    <ul className="space-y-0.5">
                      {resultado.errores.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-[11px] text-red-600">{e}</li>
                      ))}
                      {resultado.errores.length > 5 && (
                        <li className="text-[11px] text-red-500">... y {resultado.errores.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 h-9 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {resultado ? 'Cerrar' : 'Cancelar'}
            </button>
            {!resultado && (
              <button
                onClick={handleImportar}
                disabled={!archivo || importando}
                className="flex items-center gap-2 px-4 h-9 rounded-lg bg-[#2563EB] text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {importando && <Loader2 className="size-3.5 animate-spin" />}
                {importando ? 'Importando...' : 'Importar pacientes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
