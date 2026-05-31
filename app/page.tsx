import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarDays, Users, MessageCircle, BarChart2, Clock, CheckCircle,
  ArrowRight, Star, Zap, Shield, ChevronRight,
} from 'lucide-react'

// ─── Datos de la landing ──────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: CalendarDays,
    titulo: 'Agenda inteligente',
    descripcion: 'Vista día, semana y mes. Arrastra citas, detecta conflictos y confirma con un clic.',
    color: '#2563EB',
  },
  {
    icon: Users,
    titulo: 'Fichas de pacientes',
    descripcion: 'Historial completo, alergias, condiciones médicas y estadísticas de cada paciente.',
    color: '#14B8A6',
  },
  {
    icon: MessageCircle,
    titulo: 'Recordatorios WhatsApp',
    descripcion: 'Envío automático 24h y 2h antes de cada cita. Reduce los no-shows hasta un 40%.',
    color: '#8B5CF6',
  },
  {
    icon: BarChart2,
    titulo: 'Reportes y métricas',
    descripcion: 'Ingresos por mes, ticket promedio, servicios top y exporta a CSV con un clic.',
    color: '#F59E0B',
  },
  {
    icon: Clock,
    titulo: 'Cobros integrados',
    descripcion: 'Registra pagos en efectivo, transferencia o tarjeta directamente desde la cita.',
    color: '#EF4444',
  },
  {
    icon: Shield,
    titulo: 'Multi-usuario con roles',
    descripcion: 'Administrador, profesional y recepcionista. Cada uno ve solo lo que necesita.',
    color: '#0B132B',
  },
]

const PASOS = [
  { numero: '01', titulo: 'Crea tu cuenta', descripcion: 'Registro en 2 minutos. Sin tarjeta de crédito requerida.' },
  { numero: '02', titulo: 'Configura tu clínica', descripcion: 'Agrega tus profesionales, servicios y horarios disponibles.' },
  { numero: '03', titulo: 'Comienza a agendar', descripcion: 'Tus pacientes, citas y cobros en un solo lugar desde el primer día.' },
]

const TESTIMONIOS = [
  {
    nombre: 'Valentina Rojas',
    cargo: 'Directora, Clínica Bella Piel',
    texto: 'Redujimos los no-shows en un 35% desde que activamos los recordatorios de WhatsApp. La agenda es clarísima.',
    estrellas: 5,
  },
  {
    nombre: 'Camila Herrera',
    cargo: 'Dueña, Centro Estético Lumière',
    texto: 'Antes usaba una agenda de papel. Ahora veo los ingresos del mes en tiempo real. Es otro nivel.',
    estrellas: 5,
  },
  {
    nombre: 'Fernanda López',
    cargo: 'Fundadora, Spa Renova',
    texto: 'Setup en menos de una hora. El equipo lo adoptó sin capacitación. Muy intuitivo.',
    estrellas: 5,
  },
]

// ─── Componentes ─────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-simpliclinic.jpg" alt="SimpliClinic" width={160} height={40} className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Funciones</a>
          <a href="#como-funciona" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Cómo funciona</a>
          <a href="#precios" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Precios</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="h-9 px-4 rounded-lg text-[14px] font-semibold text-white flex items-center gap-1.5 transition-colors hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            Prueba gratis <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-5 text-center" style={{ background: 'linear-gradient(180deg, #F8FAFF 0%, #ffffff 100%)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
          <Zap className="size-3.5 text-[#2563EB]" />
          <span className="text-[13px] font-medium text-[#2563EB]">Software para clínicas estéticas en Chile</span>
        </div>
        <h1 className="text-[48px] sm:text-[60px] font-extrabold leading-[1.1] tracking-tight mb-6" style={{ color: '#0B132B' }}>
          La agenda que tu clínica<br />
          <span style={{ color: '#2563EB' }}>merece tener</span>
        </h1>
        <p className="text-[18px] text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          SimpliClinic centraliza tu agenda, pacientes, cobros y recordatorios WhatsApp en un solo lugar.
          Sin Excel, sin papel, sin caos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="h-12 px-7 rounded-xl text-[15px] font-bold text-white flex items-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-blue-200"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            Comenzar gratis — 14 días sin costo <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="h-12 px-6 rounded-xl text-[15px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="text-[12px] text-gray-400 mt-4">Sin tarjeta de crédito · Configuración en 5 minutos · Cancela cuando quieras</p>
      </div>

      {/* App preview mockup */}
      <div className="max-w-5xl mx-auto mt-16 relative">
        <div className="rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/80 overflow-hidden bg-white">
          {/* Browser chrome */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-amber-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 mx-4 bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-400 text-center">
              simpliclinic.cl/dashboard
            </div>
          </div>
          {/* App content preview */}
          <div className="p-6 bg-slate-50 min-h-[340px] flex gap-4">
            {/* Sidebar mini */}
            <div className="w-[160px] shrink-0 rounded-xl p-3 space-y-1" style={{ backgroundColor: '#0B132B' }}>
              <div className="flex items-center gap-2 px-2 py-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-white/20" />
                <div className="text-white text-[11px] font-bold">SimpliClinic</div>
              </div>
              {['Dashboard', 'Agenda', 'Pacientes', 'Servicios', 'Reportes'].map((item, i) => (
                <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium ${i === 1 ? 'text-white' : 'text-white/50'}`}
                  style={i === 1 ? { backgroundColor: '#2563EB' } : {}}>
                  <div className="w-3 h-3 rounded-sm bg-current opacity-60" />
                  {item}
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Citas hoy', value: '12', color: '#2563EB' },
                  { label: 'Ingresos hoy', value: '$124.000', color: '#14B8A6' },
                  { label: 'Ocupación', value: '87%', color: '#0B132B' },
                  { label: 'Pac. nuevos', value: '3', color: '#2563EB' },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-3">
                    <p className="text-[10px] text-gray-400">{card.label}</p>
                    <p className="text-[18px] font-bold mt-0.5" style={{ color: card.color }}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-3">
                  <p className="text-[11px] font-semibold text-gray-700 mb-2">Ingresos por mes</p>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 50, 80, 70, 95].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: i === 5 ? '#2563EB' : '#E2E8F0' }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 w-[140px]">
                  <p className="text-[11px] font-semibold text-gray-700 mb-2">Top servicios</p>
                  <div className="space-y-2">
                    {['Botox', 'Láser', 'Facial'].map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ['#2563EB','#14B8A6','#8B5CF6'][i] }} />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${[90,65,45][i]}%`, backgroundColor: ['#2563EB','#14B8A6','#8B5CF6'][i] }} />
                        </div>
                        <p className="text-[9px] text-gray-400 w-6 text-right">{[90,65,45][i]}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Floating badge */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-lg rounded-full px-5 py-2 flex items-center gap-2 text-[13px] font-medium text-gray-700">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Datos en tiempo real · Actualización automática
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-24 px-5 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-[36px] font-extrabold tracking-tight" style={{ color: '#0B132B' }}>
            Todo lo que necesita tu clínica
          </h2>
          <p className="text-[16px] text-gray-500 mt-3 max-w-xl mx-auto">
            Diseñado específicamente para clínicas estéticas en Chile y LATAM.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.titulo} className="rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}15` }}>
                  <Icon className="size-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2">{f.titulo}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{f.descripcion}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-24 px-5" style={{ backgroundColor: '#F8FAFF' }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-widest mb-3">Proceso</p>
        <h2 className="text-[36px] font-extrabold tracking-tight mb-14" style={{ color: '#0B132B' }}>
          Listo en menos de una hora
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-[25%] right-[25%] h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200" />
          {PASOS.map((paso) => (
            <div key={paso.numero} className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[22px] font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
                {paso.numero}
              </div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">{paso.titulo}</h3>
              <p className="text-[13px] text-gray-500">{paso.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonios() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-widest mb-3">Testimonios</p>
          <h2 className="text-[36px] font-extrabold tracking-tight" style={{ color: '#0B132B' }}>
            Lo que dicen nuestras clínicas
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIOS.map((t) => (
            <div key={t.nombre} className="rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.estrellas }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[14px] text-gray-700 leading-relaxed flex-1">"{t.texto}"</p>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">{t.nombre}</p>
                <p className="text-[12px] text-gray-400">{t.cargo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Precios() {
  return (
    <section id="precios" className="py-24 px-5" style={{ backgroundColor: '#F8FAFF' }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-widest mb-3">Precios</p>
        <h2 className="text-[36px] font-extrabold tracking-tight mb-3" style={{ color: '#0B132B' }}>
          Simple y transparente
        </h2>
        <p className="text-[16px] text-gray-500 mb-12">Sin costos ocultos. Cancela cuando quieras.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-left">
            <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Starter</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-[42px] font-extrabold text-gray-900">$19.990</span>
              <span className="text-gray-400 mb-2">/mes</span>
            </div>
            <p className="text-[13px] text-gray-500 mb-6">Para clínicas que están comenzando</p>
            <ul className="space-y-3 mb-8">
              {['1 profesional', 'Agenda completa', 'Fichas de pacientes', 'Reportes básicos', 'Soporte por email'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-gray-700">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="w-full h-11 rounded-xl border border-[#2563EB] text-[#2563EB] text-[14px] font-semibold flex items-center justify-center hover:bg-blue-50 transition-colors">
              Comenzar gratis
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl p-8 text-left relative overflow-hidden text-white"
            style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1e3a5f 100%)' }}>
            <div className="absolute top-4 right-4 bg-[#2563EB] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              MÁS POPULAR
            </div>
            <p className="text-[13px] font-semibold text-blue-300 uppercase tracking-wide mb-1">Pro</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-[42px] font-extrabold">$39.990</span>
              <span className="text-blue-300 mb-2">/mes</span>
            </div>
            <p className="text-[13px] text-blue-200 mb-6">Para clínicas en crecimiento</p>
            <ul className="space-y-3 mb-8">
              {['Hasta 5 profesionales', 'Todo lo de Starter', 'Recordatorios WhatsApp', 'Reportes avanzados', 'Roles de usuario', 'Soporte prioritario'].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-blue-100">
                  <CheckCircle className="size-4 text-[#14B8A6] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="w-full h-11 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
              Comenzar 14 días gratis <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <p className="text-[13px] text-gray-400 mt-6">¿Más de 5 profesionales? <a href="mailto:hola@simpliclinic.cl" className="text-[#2563EB] font-medium hover:underline">Escríbenos</a> para un plan Enterprise.</p>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <div className="rounded-3xl p-12" style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1e3a5f 100%)' }}>
          <h2 className="text-[34px] font-extrabold text-white mb-4 leading-tight">
            Tu clínica merece una herramienta<br />que esté a su altura
          </h2>
          <p className="text-[16px] text-blue-200 mb-8">
            Únete a las clínicas estéticas que ya digitalizaron su operación con SimpliClinic.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-[15px] font-bold text-white transition-all hover:scale-[1.02] shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            Comenzar gratis — 14 días <ArrowRight className="size-4" />
          </Link>
          <p className="text-[12px] text-blue-300 mt-4">Sin tarjeta · Sin compromisos · Setup en minutos</p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-5 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Image src="/logo-simpliclinic.jpg" alt="SimpliClinic" width={130} height={32} className="h-7 w-auto" />
          <span className="text-[12px] text-gray-400">Software inteligente y simple para clínicas que quieren crecer.</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-gray-400">
          <a href="mailto:hola@simpliclinic.cl" className="hover:text-gray-700 transition-colors">hola@simpliclinic.cl</a>
          <Link href="/login" className="hover:text-gray-700 transition-colors">Iniciar sesión</Link>
          <Link href="/register" className="hover:text-gray-700 transition-colors">Registrarse</Link>
        </div>
        <p className="text-[12px] text-gray-300">© {new Date().getFullYear()} SimpliClinic · Hecho en Chile 🇨🇱</p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main>
        <Hero />
        <Features />
        <ComoFunciona />
        <Testimonios />
        <Precios />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
