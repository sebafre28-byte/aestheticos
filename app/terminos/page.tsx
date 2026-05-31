export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-[#0B132B] mb-2">Términos de servicio</h1>
        <p className="text-sm text-gray-400 mb-8">Última actualización: enero 2025</p>

        <div className="prose prose-sm text-gray-600 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">1. Aceptación de los términos</h2>
            <p>Al crear una cuenta en SimpliClinic y usar nuestros servicios, aceptas estos Términos de Servicio. Si no estás de acuerdo, no uses la plataforma.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">2. Descripción del servicio</h2>
            <p>SimpliClinic es una plataforma de gestión para clínicas estéticas que incluye agenda, gestión de pacientes, recordatorios por WhatsApp y reservas en línea.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">3. Uso permitido</h2>
            <p>La cuenta es personal e intransferible. El usuario se compromete a usar la plataforma de acuerdo con la legislación vigente y sin fines fraudulentos.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">4. Datos y privacidad</h2>
            <p>Los datos de pacientes ingresados en la plataforma son responsabilidad del operador de la clínica. SimpliClinic actúa como encargado de tratamiento de datos conforme a la Ley 19.628 (Chile).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">5. Suscripción y pagos</h2>
            <p>Los planes de pago se cobran mensualmente. Puedes cancelar en cualquier momento desde la sección de Facturación. No se realizan reembolsos por períodos ya cobrados.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">6. Limitación de responsabilidad</h2>
            <p>SimpliClinic no es responsable por pérdida de datos derivada de fuerza mayor, interrupciones del proveedor de infraestructura, o uso indebido de la plataforma por parte del usuario.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">7. Contacto</h2>
            <p>Para consultas sobre estos términos, escribe a <a href="mailto:hola@simpliclinic.com" className="text-[#2563EB] hover:underline">hola@simpliclinic.com</a>.</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/" className="text-sm text-[#2563EB] hover:underline">← Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}
