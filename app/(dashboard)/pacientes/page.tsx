'use client'

import { useEffect, useState } from 'react'
import { FichaPaciente } from '@/components/pacientes/FichaPaciente'
import { FormPaciente } from '@/components/pacientes/FormPaciente'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'
import {
  actualizarPaciente,
  crearPaciente,
  getPacientes,
  type PacienteListaItem,
  type PacienteRow,
} from '@/lib/pacientes/queries'

type FiltroPacientes = 'todos' | 'activos' | 'nuevos'

export default function PacientesPage() {
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

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput), 250)
    return () => clearTimeout(timeout)
  }, [busquedaInput])

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await getPacientes({ busqueda, filtro, page, pageSize: 20 })
      if (!active) return
      setPacientes(res.items)
      setTotal(res.total)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [page, busqueda, filtro])

  async function handleSubmitPaciente(data: {
    nombre: string
    telefono: string
    email: string
    rut: string
    fecha_nacimiento: string
  }) {
    if (pacienteEditando) {
      await actualizarPaciente(pacienteEditando.id, data)
    } else {
      await crearPaciente(data)
    }

    setOpenForm(false)
    setPacienteEditando(null)
    setLoading(true)
    const res = await getPacientes({ busqueda, filtro, page, pageSize: 20 })
    setPacientes(res.items)
    setTotal(res.total)
    setLoading(false)
  }

  return (
    <div className="p-6">
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
        onBusquedaChange={(value) => {
          setBusquedaInput(value)
          setPage(1)
          setLoading(true)
        }}
        onFiltroChange={(value) => {
          setFiltro(value)
          setPage(1)
          setLoading(true)
        }}
        onPageChange={(value) => {
          setPage(value)
          setLoading(true)
        }}
        onNuevoPaciente={() => {
          setPacienteEditando(null)
          setOpenForm(true)
        }}
        onSelectPaciente={(paciente) => setPacienteSeleccionadoId(paciente.id)}
      />

      {openForm && (
        <FormPaciente
          key={pacienteEditando?.id ?? 'nuevo'}
          open={openForm}
          paciente={pacienteEditando}
          onClose={() => {
            setOpenForm(false)
            setPacienteEditando(null)
          }}
          onSubmit={handleSubmitPaciente}
        />
      )}

      {pacienteSeleccionadoId && (
        <FichaPaciente
          key={pacienteSeleccionadoId}
          pacienteId={pacienteSeleccionadoId}
          onClose={() => setPacienteSeleccionadoId(null)}
          onEditar={(paciente) => {
            setPacienteSeleccionadoId(null)
            setPacienteEditando(paciente)
            setOpenForm(true)
          }}
        />
      )}
    </div>
  )
}
