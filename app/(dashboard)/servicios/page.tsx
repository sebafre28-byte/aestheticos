'use client'

import { useEffect, useState } from 'react'
import { FichaServicio } from '@/components/servicios/FichaServicio'
import { FormServicio } from '@/components/servicios/FormServicio'
import { ListaServicios } from '@/components/servicios/ListaServicios'
import {
  actualizarServicio,
  crearServicio,
  eliminarServicio,
  getServicios,
  toggleActivoServicio,
  type ServicioListaItem,
  type ServicioRow,
} from '@/lib/servicios/queries'

type FiltroServicios = 'todos' | 'activos' | 'nuevos'

type ModalConfirm = {
  tipo: 'eliminar' | 'toggle'
  servicio: ServicioListaItem | ServicioRow
}

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
  const [modalConfirm, setModalConfirm] = useState<ModalConfirm | null>(null)
  const [procesando, setProcesando] = useState(false)

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
    return () => { active = false }
  }, [page, busqueda, filtro])

  async function recargar() {
    setLoading(true)
    const res = await getServicios({ busqueda, filtro, page, pageSize: 20 })
    setServicios(res.items)
    setTotal(res.total)
    setLoading(false)
  }

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
    await recargar()
  }

  async function handleConfirmar() {
    if (!modalConfirm || procesando) return
    setProcesando(true)

    if (modalConfirm.tipo === 'eliminar') {
      const ok = await eliminarServicio(modalConfirm.servicio.id)
      if (ok) setServicioSeleccionadoId(null)
    } else {
      await toggleActivoServicio(modalConfirm.servicio.id, !modalConfirm.servicio.activo)
    }

    setProcesando(false)
    setModalConfirm(null)
    await recargar()
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
        onBusquedaChange={(value) => { setBusquedaInput(value); setPage(1); setLoading(true) }}
        onFiltroChange={(value) => { setFiltro(value); setPage(1); setLoading(true) }}
        onPageChange={(value) => { setPage(value); setLoading(true) }}
        onNuevoServicio={() => { setServicioEditando(null); setOpenForm(true) }}
        onSelectServicio={(s) => setServicioSeleccionadoId(s.id)}
        onEditar={(s) => { setServicioSeleccionadoId(null); setServicioEditando(s as ServicioRow); setOpenForm(true) }}
        onToggleActivo={(s) => setModalConfirm({ tipo: 'toggle', servicio: s })}
        onEliminar={(s) => setModalConfirm({ tipo: 'eliminar', servicio: s })}
      />

      {openForm && (
        <FormServicio
          key={servicioEditando?.id ?? 'nuevo'}
          open={openForm}
          servicio={servicioEditando}
          onClose={() => { setOpenForm(false); setServicioEditando(null) }}
          onSubmit={handleSubmitServicio}
        />
      )}

      {servicioSeleccionadoId && (
        <FichaServicio
          key={servicioSeleccionadoId}
          servicioId={servicioSeleccionadoId}
          onClose={() => setServicioSeleccionadoId(null)}
          onEditar={(s) => { setServicioSeleccionadoId(null); setServicioEditando(s); setOpenForm(true) }}
          onToggleActivo={(s) => setModalConfirm({ tipo: 'toggle', servicio: s })}
          onEliminar={(s) => setModalConfirm({ tipo: 'eliminar', servicio: s })}
        />
      )}

      {modalConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setModalConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                {modalConfirm.tipo === 'eliminar'
                  ? 'Eliminar servicio'
                  : modalConfirm.servicio.activo ? 'Desactivar servicio' : 'Activar servicio'}
              </h3>
              <p className="text-[13px] text-gray-500 mb-5">
                {modalConfirm.tipo === 'eliminar'
                  ? <>¿Eliminar <strong>{modalConfirm.servicio.nombre}</strong>? Esta acción no se puede deshacer.</>
                  : modalConfirm.servicio.activo
                  ? <>¿Desactivar <strong>{modalConfirm.servicio.nombre}</strong>? No aparecerá disponible para nuevas citas.</>
                  : <>¿Activar nuevamente <strong>{modalConfirm.servicio.nombre}</strong>?</>}
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
                  {procesando
                    ? 'Procesando...'
                    : modalConfirm.tipo === 'eliminar'
                    ? 'Eliminar'
                    : modalConfirm.servicio.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
