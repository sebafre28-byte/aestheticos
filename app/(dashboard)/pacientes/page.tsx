'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRol } from '@/lib/auth/useRol'
import { useProfesionalId } from '@/lib/auth/useProfesionalId'
import { FichaPaciente } from '@/components/pacientes/FichaPaciente'
import { FormPaciente } from '@/components/pacientes/FormPaciente'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'
import {
  actualizarPaciente,
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

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput), 250)
    return () => clearTimeout(timeout)
  }, [busquedaInput])

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
    if (pacienteEditando) {
      await actualizarPaciente(pacienteEditando.id, data)
    } else {
      await crearPaciente(data)
    }
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
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-gray-900">Pacientes</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{total} pacientes registrados</p>
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
        onEliminar={(p) => setModalConfirm({ tipo: 'eliminar', paciente: p })}
      />

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
                  ? <>¿Eliminar a <strong>{modalConfirm.paciente.nombre}</strong>? Esta acción no se puede deshacer.</>
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
    </div>
  )
}
