"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Scissors,
  MessageCircle,
  MoreHorizontal,
  CalendarDays,
  List,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Data ───────────────────────────────────────────────────────────────────

const MAYO_2026 = {
  nombre: "Mayo 2026",
  primerDia: 4, // viernes = índice 4 (lun=0…dom=6)
  diasEnMes: 31,
}

type Cita = {
  id: string
  diaDelMes: number
  hora: string
  duracion: number // minutos
  paciente: string
  initials: string
  servicio: string
  profesional: string
  estado: "confirmada" | "pendiente" | "cancelada"
  color: "violet" | "emerald" | "sky" | "amber"
}

const citas: Cita[] = [
  // Lunes 5
  { id: "1", diaDelMes: 5, hora: "09:00", duracion: 60, paciente: "Ana García", initials: "AG", servicio: "Botox Premium", profesional: "Dra. López", estado: "confirmada", color: "violet" },
  { id: "2", diaDelMes: 5, hora: "11:00", duracion: 45, paciente: "Sofía Mendoza", initials: "SM", servicio: "Limpieza Facial", profesional: "Est. Torres", estado: "confirmada", color: "emerald" },
  { id: "3", diaDelMes: 5, hora: "14:00", duracion: 90, paciente: "Rosa Vidal", initials: "RV", servicio: "Microdermoabrasión", profesional: "Dra. López", estado: "pendiente", color: "amber" },
  // Martes 6
  { id: "4", diaDelMes: 6, hora: "10:00", duracion: 60, paciente: "Carmen Ruiz", initials: "CR", servicio: "Ácido Hialurónico", profesional: "Dra. López", estado: "confirmada", color: "violet" },
  { id: "5", diaDelMes: 6, hora: "12:00", duracion: 45, paciente: "Patricia Núñez", initials: "PN", servicio: "Peeling Químico", profesional: "Est. Torres", estado: "pendiente", color: "sky" },
  // Miércoles 7
  { id: "6", diaDelMes: 7, hora: "09:00", duracion: 30, paciente: "María Jiménez", initials: "MJ", servicio: "Consulta inicial", profesional: "Dra. López", estado: "confirmada", color: "emerald" },
  { id: "7", diaDelMes: 7, hora: "14:00", duracion: 60, paciente: "Valentina Soto", initials: "VS", servicio: "Peeling Químico", profesional: "Est. Torres", estado: "confirmada", color: "sky" },
  { id: "8", diaDelMes: 7, hora: "16:00", duracion: 90, paciente: "Clara Espinoza", initials: "CE", servicio: "Botox + Relleno", profesional: "Dra. López", estado: "pendiente", color: "violet" },
  // Jueves 8
  { id: "9",  diaDelMes: 8, hora: "09:00", duracion: 60, paciente: "Isabel Morales", initials: "IM", servicio: "Microdermoabrasión", profesional: "Dra. López", estado: "confirmada", color: "amber" },
  { id: "10", diaDelMes: 8, hora: "11:00", duracion: 45, paciente: "Fernanda Ríos", initials: "FR", servicio: "Limpieza Facial", profesional: "Est. Torres", estado: "confirmada", color: "emerald" },
  { id: "11", diaDelMes: 8, hora: "15:00", duracion: 60, paciente: "Natalia Bravo", initials: "NB", servicio: "Relleno Labios", profesional: "Dra. López", estado: "cancelada", color: "violet" },
  // Viernes 9 (hoy)
  { id: "12", diaDelMes: 9, hora: "09:00", duracion: 60, paciente: "Daniela Pérez", initials: "DP", servicio: "Botox Premium", profesional: "Dra. López", estado: "confirmada", color: "violet" },
  { id: "13", diaDelMes: 9, hora: "10:30", duracion: 45, paciente: "Lucía Fernández", initials: "LF", servicio: "Relleno Labios", profesional: "Est. Torres", estado: "confirmada", color: "emerald" },
  { id: "14", diaDelMes: 9, hora: "12:00", duracion: 30, paciente: "Gabriela Mora", initials: "GM", servicio: "Consulta inicial", profesional: "Dra. López", estado: "pendiente", color: "sky" },
  { id: "15", diaDelMes: 9, hora: "15:30", duracion: 60, paciente: "Alejandra Vega", initials: "AV", servicio: "Ácido Hialurónico", profesional: "Dra. López", estado: "confirmada", color: "violet" },
  { id: "16", diaDelMes: 9, hora: "17:00", duracion: 45, paciente: "Constanza Gil", initials: "CG", servicio: "Limpieza Facial", profesional: "Est. Torres", estado: "pendiente", color: "amber" },
  // Sábado 10
  { id: "17", diaDelMes: 10, hora: "10:00", duracion: 90, paciente: "Paola Castro", initials: "PC", servicio: "Tratamiento facial", profesional: "Est. Torres", estado: "confirmada", color: "emerald" },
  { id: "18", diaDelMes: 10, hora: "12:00", duracion: 60, paciente: "Sandra Medina", initials: "SM2", servicio: "Botox Express", profesional: "Dra. López", estado: "confirmada", color: "violet" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colorMap = {
  violet:  { card: "bg-[#7C3AED]/10 border-[#7C3AED]/20 text-[#7C3AED]",  dot: "bg-[#7C3AED]",  badge: "bg-[#7C3AED]/10 text-[#7C3AED]" },
  emerald: { card: "bg-emerald-50 border-emerald-200 text-emerald-700",     dot: "bg-[#10B981]",  badge: "bg-emerald-50 text-[#10B981]" },
  sky:     { card: "bg-sky-50 border-sky-200 text-sky-700",                 dot: "bg-sky-500",    badge: "bg-sky-50 text-sky-600" },
  amber:   { card: "bg-amber-50 border-amber-200 text-amber-700",           dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-600" },
}

const estadoBadge = {
  confirmada: "bg-emerald-50 text-[#10B981]",
  pendiente:  "bg-amber-50 text-amber-600",
  cancelada:  "bg-red-50 text-red-500",
}

const horas = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"]
const semanaLabels = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
const semanaNumeros = [5, 6, 7, 8, 9, 10, 11]
const HOY = 9

function diasConCitas(mes: number[]): Set<number> {
  return new Set(citas.map((c) => c.diaDelMes))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniCalendario({ diaSeleccionado, onSelect }: { diaSeleccionado: number; onSelect: (d: number) => void }) {
  const diasOcupados = diasConCitas([])
  const labelsDias = ["L", "M", "X", "J", "V", "S", "D"]

  const celdas: (number | null)[] = [
    ...Array(MAYO_2026.primerDia).fill(null),
    ...Array.from({ length: MAYO_2026.diasEnMes }, (_, i) => i + 1),
  ]
  // Rellenar hasta múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-gray-900">{MAYO_2026.nombre}</span>
        <div className="flex items-center gap-0.5">
          <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <ChevronLeft className="size-3.5 text-gray-400" />
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
            <ChevronRight className="size-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {labelsDias.map((l) => (
          <div key={l} className="text-center text-[10px] font-semibold text-gray-400 py-1">
            {l}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} />
          const esHoy = dia === HOY
          const esSeleccionado = dia === diaSeleccionado
          const tienesCitas = diasOcupados.has(dia)
          return (
            <div key={dia} className="flex flex-col items-center">
              <button
                onClick={() => onSelect(dia)}
                className={`w-7 h-7 rounded-full text-[12px] font-medium transition-colors flex items-center justify-center ${
                  esSeleccionado
                    ? "bg-[#7C3AED] text-white"
                    : esHoy
                    ? "bg-violet-100 text-[#7C3AED] font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {dia}
              </button>
              {tienesCitas && !esSeleccionado && (
                <div className="w-1 h-1 rounded-full bg-[#7C3AED]/40 mt-0.5" />
              )}
              {tienesCitas && esSeleccionado && (
                <div className="w-1 h-1 rounded-full bg-white/60 mt-0.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListaCitasDia({ dia }: { dia: number }) {
  const citasDia = citas
    .filter((c) => c.diaDelMes === dia)
    .sort((a, b) => a.hora.localeCompare(b.hora))

  const nombresDia: Record<number, string> = {
    5: "Lunes", 6: "Martes", 7: "Miércoles", 8: "Jueves",
    9: "Viernes", 10: "Sábado", 11: "Domingo",
  }
  const nombreDia = nombresDia[dia] ?? `${dia} mayo`

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-900">
          {dia === HOY ? "Hoy" : nombreDia}, {dia} mayo
        </p>
        <span className="text-[11px] text-gray-400">
          {citasDia.length} {citasDia.length === 1 ? "cita" : "citas"}
        </span>
      </div>

      {citasDia.length === 0 ? (
        <div className="text-center py-6">
          <CalendarDays className="size-6 text-gray-200 mx-auto mb-2" />
          <p className="text-[12px] text-gray-400">Sin citas este día</p>
        </div>
      ) : (
        <div className="space-y-2">
          {citasDia.map((cita) => {
            const c = colorMap[cita.color]
            return (
              <div
                key={cita.id}
                className={`rounded-lg border p-2.5 cursor-pointer hover:opacity-80 transition-opacity ${c.card}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold">{cita.hora}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${estadoBadge[cita.estado]}`}>
                    {cita.estado}
                  </span>
                </div>
                <p className="text-[12px] font-semibold truncate leading-tight">{cita.paciente}</p>
                <p className="text-[11px] opacity-70 truncate">{cita.servicio}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{cita.profesional} · {cita.duracion} min</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [diaSeleccionado, setDiaSeleccionado] = useState(HOY)
  const [vista, setVista] = useState<"semana" | "lista">("semana")

  const citasPorDia = (diaIndex: number) =>
    citas.filter((c) => c.diaDelMes === semanaNumeros[diaIndex])

  const citasListaOrdenadas = citas
    .filter((c) => semanaNumeros.includes(c.diaDelMes))
    .sort((a, b) => a.diaDelMes - b.diaDelMes || a.hora.localeCompare(b.hora))

  return (
    <div className="p-6 h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">Agenda</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Semana del 5 al 11 de mayo, 2026</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Vista toggle */}
          <div className="flex items-center bg-white border border-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setVista("semana")}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${
                vista === "semana"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <CalendarDays className="size-3.5" />
              Semana
            </button>
            <button
              onClick={() => setVista("lista")}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${
                vista === "lista"
                  ? "bg-[#7C3AED] text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <List className="size-3.5" />
              Lista
            </button>
          </div>

          {/* Semana nav */}
          <div className="flex items-center bg-white border border-gray-100 rounded-lg overflow-hidden">
            <button className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[13px] font-medium text-gray-700 px-3 border-x border-gray-100">
              Esta semana
            </span>
            <button className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <Button
            className="h-8 text-[13px] font-medium gap-1.5 border-0 text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
          >
            <Plus className="size-3.5" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── Panel lateral ── */}
        <div className="w-[220px] shrink-0 flex flex-col gap-4">
          {/* Mini calendario */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <MiniCalendario diaSeleccionado={diaSeleccionado} onSelect={setDiaSeleccionado} />
            <ListaCitasDia dia={diaSeleccionado} />
          </div>

          {/* Leyenda profesionales */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Profesionales
            </p>
            <div className="space-y-2">
              {[
                { nombre: "Dra. López", color: "bg-[#7C3AED]", citas: citas.filter(c => c.profesional === "Dra. López").length },
                { nombre: "Est. Torres", color: "bg-[#10B981]", citas: citas.filter(c => c.profesional === "Est. Torres").length },
              ].map((prof) => (
                <div key={prof.nombre} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${prof.color}`} />
                  <span className="text-[12px] text-gray-700 flex-1">{prof.nombre}</span>
                  <span className="text-[11px] text-gray-400">{prof.citas} citas</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Vista principal ── */}
        <div className="flex-1 min-w-0">
          {vista === "semana" ? (
            /* ── Grid semanal ── */
            <div className="bg-white rounded-xl border border-gray-100 h-full flex flex-col overflow-hidden">
              {/* Cabecera días */}
              <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-gray-100 shrink-0">
                <div />
                {semanaLabels.map((label, i) => {
                  const num = semanaNumeros[i]
                  const esHoy = num === HOY
                  const esSeleccionado = num === diaSeleccionado
                  const totalCitas = citasPorDia(i).length
                  return (
                    <button
                      key={label}
                      onClick={() => setDiaSeleccionado(num)}
                      className={`p-2.5 text-center border-l border-gray-50 transition-colors ${
                        esHoy ? "bg-violet-50/60" : ""
                      } hover:bg-gray-50/60`}
                    >
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        {label}
                      </p>
                      <div
                        className={`text-[15px] font-bold mt-1 w-7 h-7 mx-auto flex items-center justify-center rounded-full transition-colors ${
                          esSeleccionado
                            ? "bg-[#7C3AED] text-white"
                            : esHoy
                            ? "bg-violet-100 text-[#7C3AED]"
                            : "text-gray-700"
                        }`}
                      >
                        {num}
                      </div>
                      {totalCitas > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{totalCitas}</p>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Slots de hora */}
              <div className="flex-1 overflow-auto">
                {horas.map((hora) => (
                  <div key={hora} className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-gray-50 last:border-0">
                    <div className="px-2 py-2 text-right shrink-0">
                      <span className="text-[10px] font-medium text-gray-400">{hora}</span>
                    </div>
                    {semanaNumeros.map((num, diaIndex) => {
                      const esHoy = num === HOY
                      const esSeleccionado = num === diaSeleccionado
                      const cita = citas.find(
                        (c) => c.diaDelMes === num && c.hora === hora
                      )
                      return (
                        <div
                          key={num}
                          className={`border-l border-gray-50 h-14 p-1 transition-colors ${
                            esSeleccionado
                              ? "bg-violet-50/30"
                              : esHoy
                              ? "bg-violet-50/15"
                              : ""
                          }`}
                        >
                          {cita && (
                            <div
                              className={`h-full rounded-md border px-1.5 py-1 cursor-pointer hover:opacity-75 transition-opacity ${colorMap[cita.color].card}`}
                            >
                              <p className="text-[11px] font-semibold truncate leading-tight">
                                {cita.paciente}
                              </p>
                              <p className="text-[10px] opacity-70 truncate leading-tight">
                                {cita.servicio}
                              </p>
                              {cita.estado === "cancelada" && (
                                <p className="text-[9px] text-red-400 font-medium">cancelada</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Vista lista ── */
            <div className="bg-white rounded-xl border border-gray-100 h-full flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[14px] font-semibold text-gray-900">Citas de la semana</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">{citasListaOrdenadas.length} citas programadas</p>
                </div>
                {/* Filtros rápidos */}
                <div className="flex items-center gap-1.5">
                  {(["Todas", "Confirmadas", "Pendientes"] as const).map((f, i) => (
                    <button
                      key={f}
                      className={`h-7 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                        i === 0
                          ? "bg-[#7C3AED] text-white"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-gray-50">
                {/* Agrupar por día */}
                {semanaNumeros.map((num, diaIndex) => {
                  const citasDia = citasListaOrdenadas.filter((c) => c.diaDelMes === num)
                  if (citasDia.length === 0) return null
                  const nombresDia = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                  return (
                    <div key={num}>
                      {/* Separador de día */}
                      <div className="px-5 py-2 bg-gray-50/70 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          {num === HOY ? "Hoy · " : ""}{nombresDia[diaIndex]}, {num} mayo
                        </span>
                        <span className="text-[11px] text-gray-400">
                          · {citasDia.length} {citasDia.length === 1 ? "cita" : "citas"}
                        </span>
                      </div>

                      {citasDia.map((cita) => {
                        const c = colorMap[cita.color]
                        return (
                          <div
                            key={cita.id}
                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                          >
                            {/* Hora */}
                            <div className="w-14 shrink-0 text-right">
                              <span className="text-[12px] font-semibold text-gray-600">{cita.hora}</span>
                              <p className="text-[10px] text-gray-400">{cita.duracion} min</p>
                            </div>

                            {/* Color bar */}
                            <div className={`w-1 h-10 rounded-full shrink-0 ${c.dot}`} />

                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-gray-500">{cita.initials}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-gray-900 truncate">{cita.paciente}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Scissors className="size-3 text-gray-400 shrink-0" />
                                <span className="text-[12px] text-gray-500 truncate">{cita.servicio}</span>
                                <span className="text-gray-300">·</span>
                                <User className="size-3 text-gray-400 shrink-0" />
                                <span className="text-[12px] text-gray-500 truncate">{cita.profesional}</span>
                              </div>
                            </div>

                            {/* Estado */}
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${estadoBadge[cita.estado]}`}>
                              {cita.estado === "confirmada" ? "Confirmada" : cita.estado === "pendiente" ? "Pendiente" : "Cancelada"}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="WhatsApp">
                                <MessageCircle className="size-3.5 text-gray-400" />
                              </button>
                              <button className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                                <MoreHorizontal className="size-3.5 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
