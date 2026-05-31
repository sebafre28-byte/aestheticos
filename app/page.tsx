"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  CalendarDays, Users, MessageCircle, BarChart2, Clock, CheckCircle,
  ArrowRight, Star, Zap, Shield, ChevronRight, Bot, Menu, X,
  CalendarClock, RefreshCw, Bell, Sparkles,
} from 'lucide-react'

// ─── Brand ───────────────────────────────────────────────────────────────────

function ClinicIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="33" height="33" rx="9" stroke="#2563EB" strokeWidth="2.8"/>
      <path d="M10.5 20.5 Q18 27 25.5 20.5" stroke="#2563EB" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="12" r="2.2" fill="#2563EB"/>
    </svg>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[22px] font-extrabold leading-none tracking-tight">
        <span style={{ color: '#0B132B' }}>Simpli</span>
        <span style={{ color: '#2563EB' }}>Clinic</span>
      </span>
      <ClinicIcon size={34} />
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: CalendarDays, titulo: 'Agenda inteligente', descripcion: 'Vista día, semana y mes. Detecta conflictos y confirma con un clic.', color: '#2563EB' },
  { icon: Users, titulo: 'Fichas de pacientes', descripcion: 'Historial completo, alergias, condiciones médicas y estadísticas por paciente.', color: '#14B8A6' },
  { icon: MessageCircle, titulo: 'Recordatorios WhatsApp', descripcion: 'Envío automático 24h y 2h antes de cada cita. Reduce los no-shows hasta un 40%.', color: '#8B5CF6' },
  { icon: BarChart2, titulo: 'Reportes y métricas', descripcion: 'Ingresos por mes, ticket promedio, servicios top. Exporta a CSV con un clic.', color: '#F59E0B' },
  { icon: Clock, titulo: 'Cobros integrados', descripcion: 'Registra pagos en efectivo, transferencia o tarjeta desde la cita.', color: '#EF4444' },
  { icon: Shield, titulo: 'Multi-usuario con roles', descripcion: 'Administrador, profesional y recepcionista. Cada uno ve solo lo que necesita.', color: '#0B132B' },
]

const PASOS = [
  { numero: '01', titulo: 'Crea tu cuenta', descripcion: 'Registro en 2 minutos. Sin tarjeta de crédito requerida.' },
  { numero: '02', titulo: 'Configura tu clínica', descripcion: 'Agrega tus profesionales, servicios y horarios disponibles.' },
  { numero: '03', titulo: 'Comienza a agendar', descripcion: 'Tus pacientes, citas y cobros en un solo lugar desde el primer día.' },
]

const TESTIMONIOS = [
  { nombre: 'Valentina Rojas', cargo: 'Directora, Clínica Bella Piel', texto: 'Redujimos los no-shows en un 35% desde que activamos los recordatorios. La agenda es clarísima.', estrellas: 5 },
  { nombre: 'Camila Herrera', cargo: 'Dueña, Centro Estético Lumière', texto: 'Antes usaba una agenda de papel. Ahora veo los ingresos del mes en tiempo real. Es otro nivel.', estrellas: 5 },
  { nombre: 'Fernanda López', cargo: 'Fundadora, Spa Renova', texto: 'Setup en menos de una hora. El equipo lo adoptó sin capacitación. Muy intuitivo.', estrellas: 5 },
]

const AGENTE_FEATURES = [
  { icon: CalendarClock, label: 'Agenda citas automáticamente', desc: 'Recibe solicitudes por WhatsApp y las registra sin que muevas un dedo.' },
  { icon: RefreshCw, label: 'Reagenda en segundos', desc: 'El paciente cancela → el agente ofrece horarios disponibles y confirma.' },
  { icon: Bell, label: 'Confirma y recuerda', desc: 'Recordatorios automáticos 24h y 2h antes. Más asistencia, menos caos.' },
  { icon: Sparkles, label: 'Disponible 24/7', desc: 'Atiende consultas fuera de horario, fines de semana y días festivos.' },
]

const CHAT_MESSAGES = [
  { tipo: 'in' as const, msg: 'Hola! Quería reservar una sesión de botox para esta semana 🙏', delay: 800 },
  { tipo: 'out' as const, msg: '¡Hola Camila! 👋 Claro, tenemos disponibilidad el **miércoles 4 a las 15:00** o el **viernes 6 a las 11:00**. ¿Cuál te acomoda mejor?', delay: 2200 },
  { tipo: 'in' as const, msg: 'Mejor el miércoles a las 3!', delay: 3800 },
  { tipo: 'out' as const, msg: '✅ ¡Perfecto! Tu cita está confirmada:\n📅 Miércoles 4 · 15:00 h\n💉 Botox con Dra. Rojas\n\nTe enviaré un recordatorio el día anterior 😊', delay: 5200 },
  { tipo: 'in' as const, msg: 'Gracias! Ah, lo siento debo cancelar 😔', delay: 7000 },
  { tipo: 'out' as const, msg: 'Sin problemas 😊 Tengo el **jueves 5 a las 16:00** o el **viernes 6 a las 11:00**. ¿Te sirve alguno?', delay: 8400 },
]

const BAR_HEIGHTS = [38, 62, 48, 75, 68, 95]

// ─── Animated bar chart ───────────────────────────────────────────────────────

function AnimatedBars() {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex items-end gap-1 h-16">
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all ease-out"
          style={{
            height: animated ? `${h}%` : '4%',
            backgroundColor: i === 5 ? '#2563EB' : '#E2E8F0',
            transitionDuration: `${500 + i * 80}ms`,
            transitionDelay: animated ? `${i * 60}ms` : '0ms',
          }}
        />
      ))}
    </div>
  )
}

// ─── Animated WhatsApp chat ───────────────────────────────────────────────────

function ChatBubbleText({ msg }: { msg: string }) {
  return (
    <>
      {msg.split('**').map((part, j) =>
        j % 2 === 1
          ? <strong key={j}>{part}</strong>
          : part.split('\n').map((line, k) => <span key={k}>{k > 0 && <br />}{line}</span>)
      )}
    </>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 bg-white rounded-2xl rounded-tl-sm shadow-sm w-14">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400"
          style={{
            animation: 'typing-bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

function WhatsAppChat() {
  const LOOP_DURATION = 11000
  const [visible, setVisible] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []

    function runCycle() {
      setVisible(0)
      setTyping(false)

      CHAT_MESSAGES.forEach((m, i) => {
        // show typing indicator 800ms before the bot message appears
        if (m.tipo === 'out') {
          const t1 = setTimeout(() => setTyping(true), m.delay - 800)
          timeouts.push(t1)
        }
        const t2 = setTimeout(() => {
          setTyping(false)
          setVisible(i + 1)
        }, m.delay)
        timeouts.push(t2)
      })

      // restart loop
      const restart = setTimeout(() => {
        timeouts.forEach(clearTimeout)
        timeouts = []
        runCycle()
      }, LOOP_DURATION)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [])

  const shown = CHAT_MESSAGES.slice(0, visible)
  // show typing indicator only if last shown was 'in' or visible===0
  const showTyping = typing && (visible === 0 || CHAT_MESSAGES[visible - 1]?.tipo === 'in')

  return (
    <>
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes bubble-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bubble-anim { animation: bubble-in 0.25s ease-out forwards; }
      `}</style>

      <div className="w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* WA header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#075E54' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}>
            SC
          </div>
          <div>
            <p className="text-white text-[13px] font-semibold">SimpliClinic · Asistente</p>
            <p className="text-green-300 text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              En línea
            </p>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="px-3 py-4 space-y-2 min-h-[360px] overflow-hidden"
          style={{ backgroundColor: '#E5DDD5' }}
        >
          {shown.map((bubble, i) => (
            <div key={i} className={`flex bubble-anim ${bubble.tipo === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${bubble.tipo === 'out' ? 'rounded-tr-sm' : 'rounded-tl-sm bg-white text-gray-800'}`}
                style={bubble.tipo === 'out' ? { backgroundColor: '#DCF8C6', color: '#1a1a1a' } : {}}
              >
                <ChatBubbleText msg={bubble.msg} />
              </div>
            </div>
          ))}
          {showTyping && (
            <div className="flex justify-start bubble-anim">
              <TypingDots />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 border-t border-gray-200">
          <div className="flex-1 bg-white rounded-full px-4 py-2 text-[12px] text-gray-400 border border-gray-200">
            Escribe un mensaje…
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function NavBar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#agente" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Agente IA</a>
          <a href="#features" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Funciones</a>
          <a href="#como-funciona" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Cómo funciona</a>
          <a href="#precios" className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Precios</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="h-9 px-4 rounded-lg text-[14px] font-semibold text-white flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            Prueba gratis <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <button className="md:hidden p-2 rounded-lg text-gray-600" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-4">
          <a href="#agente" className="text-[14px] text-gray-600" onClick={() => setOpen(false)}>Agente IA</a>
          <a href="#features" className="text-[14px] text-gray-600" onClick={() => setOpen(false)}>Funciones</a>
          <a href="#como-funciona" className="text-[14px] text-gray-600" onClick={() => setOpen(false)}>Cómo funciona</a>
          <a href="#precios" className="text-[14px] text-gray-600" onClick={() => setOpen(false)}>Precios</a>
          <div className="pt-2 flex flex-col gap-2 border-t border-gray-100">
            <Link href="/login" className="h-10 rounded-lg border border-gray-200 text-[14px] font-medium text-gray-700 flex items-center justify-center">
              Iniciar sesión
            </Link>
            <Link href="/register" className="h-10 rounded-lg text-[14px] font-bold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
              Prueba gratis <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="pt-28 pb-16 px-5 text-center" style={{ background: 'linear-gradient(180deg, #F8FAFF 0%, #ffffff 100%)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
          <Zap className="size-3.5 text-[#2563EB]" />
          <span className="text-[13px] font-medium text-[#2563EB]">Software para clínicas estéticas en Chile</span>
        </div>
        <h1 className="text-[40px] sm:text-[56px] font-extrabold leading-[1.1] tracking-tight mb-6" style={{ color: '#0B132B' }}>
          La agenda que tu clínica<br />
          <span style={{ color: '#2563EB' }}>merece tener</span>
        </h1>
        <p className="text-[17px] sm:text-[18px] text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          SimpliClinic centraliza tu agenda, pacientes, cobros y recordatorios WhatsApp en un solo lugar.
          Sin Excel, sin papel, sin caos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto h-12 px-7 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-blue-200"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
          >
            Comenzar gratis — 14 días sin costo <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto h-12 px-6 rounded-xl text-[15px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="text-[12px] text-gray-400 mt-4">Sin tarjeta de crédito · Configuración en 5 minutos · Cancela cuando quieras</p>
      </div>

      {/* App preview mockup */}
      <div className="hidden sm:block max-w-5xl mx-auto mt-16 relative">
        <div className="rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/80 overflow-hidden bg-white">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-amber-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 mx-4 bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-400 text-center">
              app.simpliclinic.cl/dashboard
            </div>
          </div>
          <div className="p-6 bg-slate-50 min-h-[300px] flex gap-4">
            {/* Sidebar mini */}
            <div className="w-[150px] shrink-0 rounded-xl p-3 space-y-1" style={{ backgroundColor: '#0B132B' }}>
              <div className="flex items-center gap-2 px-2 py-2 mb-3">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                  <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                    <rect x="13" y="7" width="6" height="18" rx="3" fill="white"/>
                    <rect x="7" y="13" width="18" height="6" rx="3" fill="white"/>
                  </svg>
                </div>
                <div className="text-white text-[11px] font-bold">SimpliClinic</div>
              </div>
              {['Dashboard', 'Agenda', 'Pacientes', 'Servicios', 'Reportes'].map((item, i) => (
                <div key={item}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium ${i === 1 ? 'text-white' : 'text-white/50'}`}
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
                  <AnimatedBars />
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
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-lg rounded-full px-5 py-2 flex items-center gap-2 text-[13px] font-medium text-gray-700 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Datos en tiempo real · Actualización automática
        </div>
      </div>
    </section>
  )
}

function AgenteIA() {
  return (
    <section id="agente" className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #0B132B 0%, #0f2040 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-5">
              <Bot className="size-3.5 text-[#60A5FA]" />
              <span className="text-[13px] font-medium text-[#60A5FA]">Asistente con IA integrada</span>
            </div>
            <h2 className="text-[32px] sm:text-[40px] font-extrabold text-white leading-[1.15] tracking-tight mb-5">
              Tu asistente que{' '}
              <span style={{ color: '#14B8A6' }}>nunca duerme</span>{' '}
              y nunca pierde una cita
            </h2>
            <p className="text-[16px] text-blue-200 leading-relaxed mb-8">
              Olvídate de responder mensajes manualmente. El agente de SimpliClinic gestiona tu agenda por WhatsApp en tiempo real: agenda, reagenda, confirma y recuerda, 24/7.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {AGENTE_FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.label} className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.15)' }}>
                      <Icon className="size-4 text-[#14B8A6]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">{f.label}</p>
                      <p className="text-[12px] text-blue-300 mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4">
              <Link href="/register"
                className="h-11 px-6 rounded-xl text-[14px] font-bold text-white flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
                Activar el agente <ArrowRight className="size-4" />
              </Link>
              <p className="text-[12px] text-blue-400">Incluido en el plan Pro</p>
            </div>
          </div>

          {/* Right: animated WhatsApp */}
          <div className="flex justify-center lg:justify-end">
            <WhatsAppChat />
          </div>
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
          <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight" style={{ color: '#0B132B' }}>
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
              <div key={f.titulo} className="rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
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
        <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight mb-16" style={{ color: '#0B132B' }}>
          Listo en menos de una hora
        </h2>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          {/* Connecting line — only desktop */}
          <div className="hidden md:block absolute top-8 left-0 right-0 px-[calc(16.66%+2rem)]">
            <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #BFDBFE, #2563EB, #BFDBFE)' }} />
          </div>

          {PASOS.map((paso, i) => (
            <div key={paso.numero} className="relative flex flex-col items-center">
              {/* Mobile connector */}
              {i < PASOS.length - 1 && (
                <div className="md:hidden w-px h-8 mt-2 mb-0" style={{ background: 'linear-gradient(180deg, #BFDBFE, #2563EB)' }} />
              )}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-extrabold text-white shadow-lg shadow-blue-200 relative z-10"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {paso.numero}
              </div>
              <h3 className="text-[16px] font-bold text-gray-900 mt-4 mb-2">{paso.titulo}</h3>
              <p className="text-[13px] text-gray-500 max-w-[220px]">{paso.descripcion}</p>
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
          <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight" style={{ color: '#0B132B' }}>
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
  const [anual, setAnual] = useState(false)

  const planes = [
    {
      id: 'starter',
      nombre: 'Starter',
      descripcion: 'Para clínicas que están comenzando',
      precio: 0,
      precioAnual: 0,
      destacado: false,
      features: ['1 profesional', 'Agenda completa', 'Fichas de pacientes', 'Booking público', 'Soporte por email'],
      cta: 'Comenzar gratis',
      ctaHref: '/register',
    },
    {
      id: 'pro',
      nombre: 'Pro',
      descripcion: 'Para clínicas en crecimiento',
      precio: 79900,
      precioAnual: 767000,
      destacado: true,
      features: ['Hasta 5 profesionales', 'Todo lo de Starter', 'Agente IA por WhatsApp', 'Recordatorios automáticos', 'Reportes avanzados', 'Roles de usuario', 'Soporte prioritario'],
      cta: 'Comenzar 14 días gratis',
      ctaHref: '/register',
    },
    {
      id: 'clinica',
      nombre: 'Clínica',
      descripcion: 'Para clínicas con múltiples sedes o grandes equipos',
      precio: 129900,
      precioAnual: 1247000,
      destacado: false,
      features: ['Profesionales ilimitados', 'Todo lo de Pro', 'Citas ilimitadas', 'API avanzada', 'Onboarding dedicado', 'SLA prioritario'],
      cta: 'Comenzar 14 días gratis',
      ctaHref: '/register',
    },
  ]

  return (
    <section id="precios" className="py-24 px-5" style={{ backgroundColor: '#F8FAFF' }}>
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-[13px] font-semibold text-[#2563EB] uppercase tracking-widest mb-3">Precios</p>
        <h2 className="text-[32px] sm:text-[36px] font-extrabold tracking-tight mb-3" style={{ color: '#0B132B' }}>
          Simple y transparente
        </h2>
        <p className="text-[16px] text-gray-500 mb-8">Sin costos ocultos. Cancela cuando quieras.</p>

        {/* Annual toggle */}
        <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 mb-10">
          <span className={`text-[13px] font-medium ${!anual ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
          <button
            onClick={() => setAnual(!anual)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${anual ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${anual ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
          <span className={`text-[13px] font-medium ${anual ? 'text-gray-900' : 'text-gray-400'}`}>
            Anual
          </span>
          {anual && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">2 meses gratis</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planes.map((plan) => {
            const precioMes = anual && plan.precio > 0 ? Math.round(plan.precioAnual / 12) : plan.precio
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-7 text-left relative overflow-hidden flex flex-col ${
                  plan.destacado
                    ? 'text-white shadow-xl'
                    : 'bg-white border border-gray-200'
                }`}
                style={plan.destacado ? { background: 'linear-gradient(135deg, #0B132B 0%, #1e3a5f 100%)' } : {}}
              >
                {plan.destacado && (
                  <div className="absolute top-4 right-4 bg-[#2563EB] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    MÁS POPULAR
                  </div>
                )}
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${plan.destacado ? 'text-blue-300' : 'text-gray-400'}`}>
                  {plan.nombre}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  {plan.precio === 0 ? (
                    <span className={`text-[38px] font-extrabold ${plan.destacado ? 'text-white' : 'text-gray-900'}`}>Gratis</span>
                  ) : (
                    <>
                      <span className={`text-[36px] font-extrabold ${plan.destacado ? 'text-white' : 'text-gray-900'}`}>
                        ${precioMes.toLocaleString('es-CL')}
                      </span>
                      <span className={`mb-2 ${plan.destacado ? 'text-blue-300' : 'text-gray-400'}`}>/mes</span>
                    </>
                  )}
                </div>
                {anual && plan.precio > 0 && (
                  <p className={`text-[12px] mb-1 ${plan.destacado ? 'text-blue-200' : 'text-gray-400'}`}>
                    ${plan.precioAnual.toLocaleString('es-CL')} al año
                  </p>
                )}
                <p className={`text-[13px] mb-5 ${plan.destacado ? 'text-blue-200' : 'text-gray-500'}`}>{plan.descripcion}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((item) => (
                    <li key={item} className={`flex items-center gap-2.5 text-[13px] ${plan.destacado ? 'text-blue-100' : 'text-gray-700'}`}>
                      <CheckCircle className={`size-4 shrink-0 ${plan.destacado ? 'text-[#14B8A6]' : 'text-emerald-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`w-full h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 ${
                    plan.destacado
                      ? 'text-white'
                      : plan.precio === 0
                        ? 'border border-[#2563EB] text-[#2563EB] hover:bg-blue-50'
                        : 'text-white'
                  }`}
                  style={plan.precio > 0 ? { background: plan.destacado ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'linear-gradient(135deg, #0B132B 0%, #1e3a5f 100%)' } : {}}
                >
                  {plan.cta} {plan.precio > 0 && <ChevronRight className="size-4" />}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-[13px] text-gray-400 mt-8">
          💡 Una sola hora recuperada por recordatorios automáticos ya paga el plan mensual completo.
        </p>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 px-5 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <div className="rounded-3xl p-10 sm:p-12" style={{ background: 'linear-gradient(135deg, #0B132B 0%, #1e3a5f 100%)' }}>
          <h2 className="text-[28px] sm:text-[34px] font-extrabold text-white mb-4 leading-tight">
            Tu clínica merece una herramienta<br className="hidden sm:block" />
            que esté a su altura
          </h2>
          <p className="text-[15px] sm:text-[16px] text-blue-200 mb-8">
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
          <Logo />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[13px] text-gray-400">
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
        <AgenteIA />
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
