import { Search, Plus, Mail, Phone, Ellipsis } from "lucide-react"
import { Button } from "@/components/ui/button"

const pacientes = [
  {
    id: "1",
    nombre: "Ana García",
    email: "ana.garcia@email.com",
    telefono: "+56 9 8765 4321",
    ultimaCita: "9 mayo, 2026",
    totalCitas: 8,
    estado: "activo",
    initials: "AG",
  },
  {
    id: "2",
    nombre: "Sofía Mendoza",
    email: "sofia.m@email.com",
    telefono: "+56 9 7654 3210",
    ultimaCita: "9 mayo, 2026",
    totalCitas: 3,
    estado: "activo",
    initials: "SM",
  },
  {
    id: "3",
    nombre: "Carmen Ruiz",
    email: "carmen.ruiz@email.com",
    telefono: "+56 9 6543 2109",
    ultimaCita: "28 abril, 2026",
    totalCitas: 12,
    estado: "activo",
    initials: "CR",
  },
  {
    id: "4",
    nombre: "Valentina Soto",
    email: "vale.soto@email.com",
    telefono: "+56 9 5432 1098",
    ultimaCita: "25 abril, 2026",
    totalCitas: 5,
    estado: "activo",
    initials: "VS",
  },
  {
    id: "5",
    nombre: "Isabel Morales",
    email: "isabel.m@email.com",
    telefono: "+56 9 4321 0987",
    ultimaCita: "20 abril, 2026",
    totalCitas: 7,
    estado: "inactivo",
    initials: "IM",
  },
  {
    id: "6",
    nombre: "Daniela Pérez",
    email: "daniela.perez@email.com",
    telefono: "+56 9 3210 9876",
    ultimaCita: "15 abril, 2026",
    totalCitas: 2,
    estado: "activo",
    initials: "DP",
  },
  {
    id: "7",
    nombre: "Lucía Fernández",
    email: "lucia.f@email.com",
    telefono: "+56 9 2109 8765",
    ultimaCita: "10 abril, 2026",
    totalCitas: 15,
    estado: "activo",
    initials: "LF",
  },
]

export default function PacientesPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">Pacientes</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {pacientes.length} pacientes registrados
          </p>
        </div>
        <Button
          className="h-8 text-[13px] font-medium gap-1.5 border-0 text-white"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
        >
          <Plus className="size-3.5" />
          Nuevo paciente
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Search bar */}
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors bg-gray-50/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["Todos", "Activos", "Inactivos"].map((f) => (
              <button
                key={f}
                className={`h-7 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                  f === "Todos"
                    ? "bg-[#2563EB] text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Paciente
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Contacto
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Última cita
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Total citas
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pacientes.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#2563EB]/10">
                      <span className="text-[11px] font-semibold text-[#2563EB]">{p.initials}</span>
                    </div>
                    <span className="text-[13px] font-medium text-gray-900">{p.nombre}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-gray-400 shrink-0" />
                      <span className="text-[12px] text-gray-500 truncate max-w-[160px]">{p.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-gray-400 shrink-0" />
                      <span className="text-[12px] text-gray-500">{p.telefono}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[13px] text-gray-600">{p.ultimaCita}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[13px] font-semibold text-gray-900">{p.totalCitas}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      p.estado === "activo"
                        ? "bg-emerald-50 text-[#10B981]"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center ml-auto transition-colors">
                    <Ellipsis className="size-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[12px] text-gray-400">Mostrando {pacientes.length} de {pacientes.length} pacientes</span>
          <div className="flex items-center gap-1">
            <button className="h-7 px-2.5 rounded-lg text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors border border-gray-100">
              Anterior
            </button>
            <button className="h-7 px-2.5 rounded-lg text-[12px] bg-[#2563EB] text-white font-medium">
              1
            </button>
            <button className="h-7 px-2.5 rounded-lg text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors border border-gray-100">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
