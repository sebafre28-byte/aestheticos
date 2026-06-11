import AgenteTestChat from "@/components/configuracion/AgenteTestChat"

export default function AgenteTestPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-[18px] font-semibold text-gray-900">Probar agente IA</h1>
        <p className="text-[13px] text-gray-500 mt-1 max-w-2xl">
          Este es un simulador del agente de agendamiento por WhatsApp: escribe como si fueras un
          paciente y verás las respuestas reales del agente, sin enviar ningún mensaje de WhatsApp.
          Requiere tener configurada la variable <code className="text-[12px] bg-gray-100 rounded px-1 py-0.5">ANTHROPIC_API_KEY</code> y
          el agente activado en la configuración de la clínica.
        </p>
      </div>
      <AgenteTestChat />
    </div>
  )
}
