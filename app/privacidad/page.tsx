export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-[#0B132B] mb-2">Política de privacidad</h1>
        <p className="text-sm text-gray-400 mb-8">Última actualización: enero 2025</p>

        <div className="prose prose-sm text-gray-600 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">1. Responsable del tratamiento</h2>
            <p>SimpliClinic es responsable del tratamiento de los datos de los usuarios registrados en la plataforma.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">2. Datos que recopilamos</h2>
            <ul className="list-disc pl-4 space-y-1">
              <li>Datos de registro: nombre, email, nombre de la clínica.</li>
              <li>Datos de uso: citas, servicios, pacientes que el operador ingresa a la plataforma.</li>
              <li>Datos técnicos: dirección IP, navegador, cookies de sesión.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">3. Finalidad del tratamiento</h2>
            <p>Los datos se usan exclusivamente para proveer el servicio de SimpliClinic: gestión de agenda, recordatorios, y reportes. No vendemos ni compartimos datos con terceros salvo proveedores de infraestructura (Supabase, Vercel, Twilio).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">4. Datos de pacientes</h2>
            <p>Los datos de pacientes son ingresados por el operador de la clínica, quien actúa como responsable principal. SimpliClinic los almacena de forma segura y no los utiliza para ningún fin distinto al de proveer el servicio.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">5. Seguridad</h2>
            <p>Utilizamos cifrado TLS en tránsito y Row-Level Security en base de datos para aislar los datos de cada clínica. El acceso a los datos está restringido por rol de usuario.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">6. Derechos del usuario</h2>
            <p>Tienes derecho a acceder, rectificar y eliminar tus datos. Para ejercer estos derechos, escribe a <a href="mailto:hola@simpliclinic.com" className="text-[#2563EB] hover:underline">hola@simpliclinic.com</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[#0B132B] mb-2">7. Retención de datos</h2>
            <p>Los datos se conservan mientras la cuenta esté activa. Tras la cancelación, se eliminan en un plazo de 90 días salvo obligación legal de retención.</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/" className="text-sm text-[#2563EB] hover:underline">← Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}
