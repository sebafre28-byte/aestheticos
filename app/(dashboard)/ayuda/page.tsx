'use client'

import { BookOpen, MessageCircle, Mail, Video, FileText, ChevronRight } from 'lucide-react'

const FAQS = [
  {
    pregunta: '¿Cómo agendo una cita recurrente?',
    respuesta: 'Al crear una nueva cita, activa la sección "Recurrencia" y elige la frecuencia (diaria, semanal o mensual) y la cantidad de sesiones.',
  },
  {
    pregunta: '¿Cómo invito a un profesional o recepcionista?',
    respuesta: 'Ve a Configuración → Usuarios y roles → Invitar usuario. Recibirán un email con un link para crear su cuenta.',
  },
  {
    pregunta: '¿Los pacientes reciben recordatorios automáticos?',
    respuesta: 'Sí. Se envían recordatorios por email 24h antes de cada cita. Si tienes WhatsApp configurado, también se envían por ese canal.',
  },
  {
    pregunta: '¿Cómo conecto Google Calendar?',
    respuesta: 'Ve a Configuración → Google Calendar y haz clic en "Conectar". Las citas se sincronizarán automáticamente en ambas direcciones.',
  },
  {
    pregunta: '¿Puedo exportar mis pacientes?',
    respuesta: 'Sí. En la sección Pacientes encontrarás un botón "Exportar CSV" que descarga todos tus pacientes en formato Excel-compatible.',
  },
  {
    pregunta: '¿Cómo cancelo mi suscripción?',
    respuesta: 'Ve a Configuración → Plan y facturación → Cancelar suscripción. Mantendrás acceso hasta el fin del período pagado.',
  },
]

export default function AyudaPage() {
  function abrirChat() {
    if (typeof window !== 'undefined' && window.$crisp) {
      window.$crisp.push(['do', 'chat:open'])
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Centro de ayuda</h1>
        <p className="text-[14px] text-gray-500 mt-1">Encuentra respuestas o contáctanos directamente.</p>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={abrirChat}
          className="flex flex-col items-start gap-3 p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <MessageCircle className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">Chat de soporte</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Escríbenos y te respondemos a la brevedad</p>
          </div>
          <span className="text-[12px] font-medium text-blue-600 flex items-center gap-1">
            Abrir chat <ChevronRight className="size-3.5" />
          </span>
        </button>

        <a
          href="mailto:hola@simpliclinic.cl"
          className="flex flex-col items-start gap-3 p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Mail className="size-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">Email</p>
            <p className="text-[12px] text-gray-500 mt-0.5">hola@simpliclinic.cl</p>
          </div>
          <span className="text-[12px] font-medium text-purple-600 flex items-center gap-1">
            Enviar email <ChevronRight className="size-3.5" />
          </span>
        </a>

        <div className="flex flex-col items-start gap-3 p-5 bg-white border border-gray-100 rounded-2xl opacity-60">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Video className="size-5 text-teal-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">Video tutoriales</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Próximamente</p>
          </div>
          <span className="text-[12px] text-gray-400">En preparación</span>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-gray-400" />
          <h2 className="text-[15px] font-semibold text-gray-800">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.pregunta} className="group bg-white border border-gray-100 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none text-[13px] font-semibold text-gray-800 hover:bg-gray-50/50">
                {faq.pregunta}
                <ChevronRight className="size-4 text-gray-400 shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-4 text-[13px] text-gray-600 leading-relaxed border-t border-gray-50">
                <p className="pt-3">{faq.respuesta}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-blue-900">¿No encontraste lo que buscabas?</p>
            <p className="text-[12px] text-blue-700 mt-0.5">Nuestro equipo responde en menos de 24 horas hábiles.</p>
          </div>
        </div>
        <button
          onClick={abrirChat}
          className="h-9 px-4 rounded-xl text-[12px] font-semibold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          Contactar soporte
        </button>
      </div>
    </div>
  )
}
