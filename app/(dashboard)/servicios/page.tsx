'use client'

import { useEffect, useState } from 'react'
import { FichaServicio } from '@/components/servicios/FichaServicio'
import { FormServicio } from '@/components/servicios/FormServicio'
import { ListaServicios } from '@/components/servicios/ListaServicios'
import {
  actualizarServicio,
  crearServicio,
  getServicios,
  type ServicioListaItem,
  type ServicioRow,
} from '@/lib/servicios/queries'

type FiltroServicios = 'todos' | 'activos' | 'nuevos'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<ServicioListaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroServicios>('todos')
  const [loading, setLoading] = useState(true)

  const [openForm, setOpenForm] = useState(false)
  const [servicioEditando, setServicioEditando] = useState<ServicioRow | null>(null)
  const [servicioSeleccionadoId, setServicioSeleccionadoId] = useState<string | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setBusqueda(busquedaInput), 250)
    return () => clearTimeout(timeout)
  }, [busquedaInput])

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await getServicios({ busqueda, filtro, page, pageSize: 20 })
      if (!active) return
      setServicios(res.items)
      setTotal(res.total)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [page, busqueda, filtro])

  async function handleSubmitServicio(data: {
    nombre: string
    descripcion: string
    duracion_minutos: number
    precio: number
    color: string
    activo: boolean
  }) {
    if (servicioEditando) {
      await actualizarServicio(servicioEditando.id, data)
    } else {
      await crearServicio(data)
    }

    setOpenForm(false)
    setServicioEditando(null)
    setLoading(true)
    const res = await getServicios({ busqueda, filtro, page, pageSize: 20 })
    setServicios(res.items)
    setTotal(res.total)
    setLoading(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-gray-900">Servicios</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{total} servicios registrados</p>
      </div>

      <ListaServicios
        servicios={servicios}
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
        onNuevoServicio={() => {
          setServicioEditando(null)
          setOpenForm(true)
        }}
        onSelectServicio={(servicio) => setServicioSeleccionadoId(servicio.id)}
      />

      {openForm && (
        <FormServicio
          key={servicioEditando?.id ?? 'nuevo'}
          open={openForm}
          servicio={servicioEditando}
          onClose={() => {
            setOpenForm(false)
            setServicioEditando(null)
          }}
          onSubmit={handleSubmitServicio}
        />
      )}

      {servicioSeleccionadoId && (
        <FichaServicio
          key={servicioSeleccionadoId}
          servicioId={servicioSeleccionadoId}
          onClose={() => setServicioSeleccionadoId(null)}
          onEditar={(servicio) => {
            setServicioSeleccionadoId(null)
            setServicioEditando(servicio)
            setOpenForm(true)
          }}
        />
      )}
    </div>
  )
}
