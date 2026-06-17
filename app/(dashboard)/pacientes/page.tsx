'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Download, FileSpreadsheet, RotateCcw, Upload, X } from 'lucide-react'
import { format } from 'date-fns'
import { useRol } from '@/lib/auth/useRol'
import { useProfesionalId } from '@/lib/auth/useProfesionalId'
import { FichaPaciente } from '@/components/pacientes/FichaPaciente'
import { FormPaciente } from '@/components/pacientes/FormPaciente'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'
import { ModalImportPacientes } from '@/components/pacientes/ModalImportPacientes'
import {
  actualizarPaciente,
  contarCitasPaciente,
  crearPaciente,
  eliminarPaciente,
  getPacientes,
  toggleActivoPaciente,
  type PacienteListaItem,
  type PacienteRow,
} from '@/lib/pacientes/queries'

type FiltroPacientes = 'todos' | 'activos' | 'nuevos'

type ModalConfirm = {
  tipo: 'eliminar' | 'toggle'
  paciente: PacienteListaItem | PacienteRow
}

export default function PacientesPage() {
  const router = useRouter()
  const { rol } = useRol()
  const profesionalId = useProfesionalId()
  const profesionalFilter = rol === 'profesional' ? (profesionalId ?? undefined) : undefined
  const [pacientes, setPacientes] = useState<PacienteListaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroPacientes>('todos')
  const [loading, setLoading] = useState(true)

  const [openForm, setOpenForm] = useState(false)
  const [pacienteEditando, setPacienteEditando] = useState<PacienteRow | null>(null)
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string | null>(null)
  const [modalConfirm, setModalConfirm] = useState<ModalConfirm | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [citasAEliminar, setCitasAEliminar] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [exportDropdown, setExportDropdown] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [modalImport, setModalImport] = useState(false)
  const [modalReactivacion, setModalReactivacion] = useState(false)
  const [reactivando, setReactivando] = useState(false)
  const [reactivacionResultado, setReactivacionResultado] = useState<{ enviados: number; total_inactivos: number } | null>(null)
  const [diasReactivacion, setDiasReactivacion] = useState(60)

  async function handleReactivacion() {
    setReactivando(true)
    try {
      const res = await fetch('/api/marketing/reactivacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dias: diasReactivacion }),
      })
      const data = await res.json()
      setReactivacionResultado(data)
    } finally {
      setReactivando(false)
    }
  }

  async function handleExportar(tipo: 'csv' | 'xlsx') {
    if (exportando) return
    setExportando(true)
    setExportDropdown(false)
    try {
      const res = await fetch(`/api/export/pacientes?format=${tipo}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pacientes-${format(new Date(), 'yyyy-MM-dd')}.${tipo}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput), 250)
    return () => clearTimeout(timeout)
  }, [busquedaInput])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await getPacientes({ busqueda, filtro, page, pageSize: 20, profesionalId: profesionalFilter })
      if (!active) return
      setPacientes(res.items)
      setTotal(res.total)
      setLoading(false)
    })()
    return () => { active = false }
  }, [page, busqueda, filtro, profesionalFilter])

  async function recargar() {
    setLoading(true)
    const res = await getPacientes({ busqueda, filtro, page, pageSize: 20, profesionalId: profesionalFilter })
    setPacientes(res.items)
    setTotal(res.total)
    setLoading(false)
  }

  async function handleSubmitPaciente(data: {
    nombre: string
    telefono: string
    email: string
    rut: string
    fecha_nacimiento: string
    genero: string
    direccion: string
  }) {
    let ok: boolean
    if (pacienteEditando) {
      const result = await actualizarPaciente(pacienteEditando.id, data)
      ok = !!result
    } else {
      const result = await crearPaciente(data)
      ok = !!result
    }
    if (!ok) return // FormPaciente should surface errors; don't close on failure
    setOpenForm(false)
    setPacienteEditando(null)
    await recargar()
  }

  async function handleConfirmar() {
    if (!modalConfirm || procesando) return
    setProcesando(true)

    if (modalConfirm.tipo === 'eliminar') {
      const ok = await eliminarPaciente(modalConfirm.paciente.id)
      if (ok) setPacienteSeleccionadoId(null)
    } else {
      const activo = modalConfirm.paciente.activo
      await toggleActivoPaciente(modalConfirm.paciente.id, !activo)
    }

    setProcesando(false)
    setModalConfirm(null)
    await recargar()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">Pacientes</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{total} pacientes registrados</p>
        </div>
        {rol === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setModalReactivacion(true); setReactivacionResultado(null) }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="size-4 text-blue-500" />
              <span className="hidden sm:inline">Reactivar</span>
            </button>
            <button
              onClick={() => setModalImport(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="size-4 text-gray-500" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <div ref={exportDropdownRef} className="relative">
              <button
                onClick={() => setExportDropdown(v => !v)}
                disabled={exportando}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <Download className="size-4 text-gray-500" />
                <span className="hidden sm:inline">{exportando ? 'Exportando...' : 'Exportar'}</span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </button>
              {exportDropdown && (
                <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 text-[13px]">
                  <button
                    onClick={() => handleExportar('csv')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="size-3.5 text-gray-400" />
                    Descargar CSV
                  </button>
                  <button
                    onClick={() => handleExportar('xlsx')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="size-3.5 text-green-500" />
                    Descargar Excel (.xlsx)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ListaPacientes
        pacientes={pacientes}
        total={total}
        page={page}
        pageSize={20}
        filtro={filtro}
        busqueda={busquedaInput}
        loading={loading}
        onBusquedaChange={(value) => { setBusquedaInput(value); setPage(1); setLoading(true) }}
        onFiltroChange={(value) => { setFiltro(value); setPage(1); setLoading(true) }}
        onPageChange={(value) => { setPage(value); setLoading(true) }}
        onNuevoPaciente={() => { setPacienteEditando(null); setOpenForm(true) }}
        onSelectPaciente={(p) => setPacienteSeleccionadoId(p.id)}
        onEditar={(p) => { setPacienteSeleccionadoId(null); setPacienteEditando(p as PacienteRow); setOpenForm(true) }}
        onToggleActivo={(p) => setModalConfirm({ tipo: 'toggle', paciente: p })}
        onEliminar={async (p) => {
          const count = await contarCitasPaciente(p.id)
          setCitasAEliminar(count)
          setModalConfirm({ tipo: 'eliminar', paciente: p })
        }}
      />

      {modalImport && (
        <ModalImportPacientes
          onClose={() => setModalImport(false)}
          onImportado={recargar}
        />
      )}

      {openForm && (
        <FormPaciente
          key={pacienteEditando?.id ?? 'nuevo'}
          open={openForm}
          paciente={pacienteEditando}
          onClose={() => { setOpenForm(false); setPacienteEditando(null) }}
          onSubmit={handleSubmitPaciente}
        />
      )}

      {pacienteSeleccionadoId && (
        <FichaPaciente
          key={pacienteSeleccionadoId}
          pacienteId={pacienteSeleccionadoId}
          onClose={() => setPacienteSeleccionadoId(null)}
          onEditar={(p) => { setPacienteSeleccionadoId(null); setPacienteEditando(p); setOpenForm(true) }}
          onToggleActivo={(p) => setModalConfirm({ tipo: 'toggle', paciente: p })}
          onEliminar={(p) => setModalConfirm({ tipo: 'eliminar', paciente: p })}
          onNuevaCita={() => router.push('/agenda')}
        />
      )}

      {/* Modal de confirmación */}
      {modalConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setModalConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                {modalConfirm.tipo === 'eliminar' ? 'Eliminar paciente' : modalConfirm.paciente.activo ? 'Desactivar paciente' : 'Activar paciente'}
              </h3>
              <p className="text-[13px] text-gray-500 mb-5">
                {modalConfirm.tipo === 'eliminar'
                  ? (
                    <>
                      ¿Eliminar a <strong>{modalConfirm.paciente.nombre}</strong>? Esta acción no se puede deshacer.
                      {citasAEliminar > 0 && (
                        <span className="block mt-2 text-red-600 font-medium">
                          ⚠️ Se eliminarán también {citasAEliminar} cita{citasAEliminar !== 1 ? 's' : ''}, pagos y notas clínicas asociadas.
                        </span>
                      )}
                    </>
                  )
                  : modalConfirm.paciente.activo
                  ? <>¿Desactivar a <strong>{modalConfirm.paciente.nombre}</strong>? Seguirá en el sistema pero no aparecerá en filtros activos.</>
                  : <>¿Activar nuevamente a <strong>{modalConfirm.paciente.nombre}</strong>?</>}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalConfirm(null)}
                  className="flex-1 h-9 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={procesando}
                  className={`flex-1 h-9 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-60 ${
                    modalConfirm.tipo === 'eliminar'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#2563EB] hover:bg-blue-700'
                  }`}
                >
                  {procesando ? 'Procesando...' : modalConfirm.tipo === 'eliminar' ? 'Eliminar' : modalConfirm.paciente.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal reactivación */}
      {modalReactivacion && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setModalReactivacion(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] bg-white rounded-2xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-gray-900">Reactivar pacientes inactivos</h3>
              <button onClick={() => setModalReactivacion(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="size-4 text-slate-500" />
              </button>
            </div>

            {reactivacionResultado ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">✅</div>
                <p className="text-[15px] font-semibold text-gray-900">{reactivacionResultado.enviados} emails enviados</p>
                <p className="text-[13px] text-slate-500 mt-1">de {reactivacionResultado.total_inactivos} pacientes inactivos encontrados</p>
                <button onClick={() => setModalReactivacion(false)} className="mt-4 w-full h-9 rounded-lg bg-[#2563EB] text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] text-slate-600">Envía un email a todos los pacientes que no han tenido cita en los últimos:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setDiasReactivacion(d)}
                      className={`h-9 rounded-lg border text-[12px] font-medium transition-colors ${diasReactivacion === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">Se excluyen pacientes contactados en los últimos 30 días.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalReactivacion(false)} className="flex-1 h-9 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button
                    onClick={handleReactivacion}
                    disabled={reactivando}
                    className="flex-1 h-9 rounded-lg bg-[#2563EB] text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {reactivando ? <><RotateCcw className="size-3.5 animate-spin" />Enviando...</> : 'Enviar emails'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
