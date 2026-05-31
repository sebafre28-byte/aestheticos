'use client'

import { useEffect, useState } from 'react'
import { Scissors, DollarSign, Star, TrendingUp } from 'lucide-react'
import { useRol } from '@/lib/auth/useRol'
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
  const { rol } = useRol()
  const esAdmin = rol === 'admin'
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

  const activosList = servicios.filter((s) => s.activo)
  const serviciosActivos = activosList.length
  const precioPromedio =
    serviciosActivos > 0
      ? Math.round(activosList.reduce((sum, s) => sum + s.precio, 0) / serviciosActivos)
      : 0
  const masSolicitado =
    servicios.length > 0
      ? servicios.reduce((prev, cur) => (cur.totalCitas > prev.totalCitas ? cur : prev))
      : null
  const ingresoPotencial = precioPromedio * serviciosActivos

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-gray-900">Servicios</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">{total} servicios registrados</p>
      </div>

      {!loading && servicios.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Servicios activos</p>
              <p className="text-[22px] font-extrabold text-gray-900">{serviciosActivos}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Scissors className="size-4 text-[#2563EB]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Precio promedio</p>
              <p className="text-[22px] font-extrabold text-gray-900">
                ${precioPromedio.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
              <DollarSign className="size-4 text-[#14B8A6]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Más solicitado</p>
              <p className="text-[22px] font-extrabold text-gray-900 leading-tight">
                {masSolicitado ? masSolicitado.nombre : '—'}
              </p>
              {masSolicitado && (
                <p className="text-[11px] text-gray-400 mt-0.5">{masSolicitado.totalCitas} citas</p>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Star className="size-4 text-[#F59E0B]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Ingreso potencial</p>
              <p className="text-[22px] font-extrabold text-gray-900">
                ${ingresoPotencial.toLocaleString('es-CL')}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">estimado/mes</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <TrendingUp className="size-4 text-[#0B132B]" />
            </div>
          </div>
        </div>
      )}

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
        onNuevoServicio={esAdmin ? () => { setServicioEditando(null); setOpenForm(true) } : () => {}}
        onSelectServicio={(s) => setServicioSeleccionadoId(s.id)}
        onEditar={esAdmin ? (s) => { setServicioSeleccionadoId(null); setServicioEditando(s as ServicioRow); setOpenForm(true) } : () => {}}
        onToggleActivo={esAdmin ? (s) => setModalConfirm({ tipo: 'toggle', servicio: s }) : () => {}}
        onEliminar={esAdmin ? (s) => setModalConfirm({ tipo: 'eliminar', servicio: s }) : () => {}}
        soloLectura={!esAdmin}
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
