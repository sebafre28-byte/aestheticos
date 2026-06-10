// Agente IA de agendamiento por WhatsApp.
// Recibe mensajes entrantes, conversa con el paciente y puede consultar
// disponibilidad, crear, listar y cancelar citas usando herramientas
// con acceso scoped a la clínica. WhatsApp-first: el paciente agenda
// todo por chat sin tocar la web.
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const MODEL = 'claude-opus-4-8'
const MAX_TOOL_ITERATIONS = 8
const HISTORY_LIMIT = 30
const CLINIC_TZ = 'America/Santiago'

// ─── Tipos ────────────────────────────────────────────────────

type HorarioDia = { activo: boolean; desde: string; hasta: string }

type AgenteWspConfig = {
  activo?: boolean
}

type ClinicaAgente = {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
  configuracion: {
    horarios?: Record<string, HorarioDia>
    agente_wsp?: AgenteWspConfig
  } | null
}

export type RespuestaAgente = {
  texto: string | null
  escalado: boolean
}

// ─── Helpers de fecha (wall-clock Santiago) ───────────────────

const DIAS_ES: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles',
  4: 'jueves', 5: 'viernes', 6: 'sábado',
}

function nowSantiago(): { fecha: string; hora: string; diaSemana: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '00'
  const fecha = `${get('year')}-${get('month')}-${get('day')}`
  const [y, m, d] = fecha.split('-').map(Number)
  const diaSemana = DIAS_ES[new Date(y, m - 1, d).getDay()]
  return { fecha, hora: `${get('hour')}:${get('minute')}`, diaSemana }
}

function diaSemanaDe(fechaIso: string): string {
  const [y, m, d] = fechaIso.split('-').map(Number)
  return DIAS_ES[new Date(y, m - 1, d).getDay()]
}

/** Wall-clock stored as timestamptz: toISOString() recovers the original wall-clock. */
function wallClockOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19)
}

// ─── Disponibilidad ───────────────────────────────────────────

async function calcularSlots(
  supabase: SupabaseClient,
  clinica: ClinicaAgente,
  fecha: string,
  servicioId: string,
  profesionalId?: string,
): Promise<{ profesional_id: string; profesional: string; horas: string[] }[] | { error: string }> {
  const horarios = clinica.configuracion?.horarios
  const dia = diaSemanaDe(fecha)
  const horarioDia = horarios?.[dia]
  if (!horarioDia?.activo) return { error: `La clínica no atiende los ${dia}.` }

  const { data: servicio } = await supabase
    .from('servicios')
    .select('id, nombre, duracion_minutos, buffer_minutos')
    .eq('id', servicioId)
    .eq('clinica_id', clinica.id)
    .maybeSingle()
  if (!servicio) return { error: 'Servicio no encontrado.' }
  const duracion = servicio.duracion_minutos ?? 60

  let profQuery = supabase
    .from('profesionales')
    .select('id, nombre')
    .eq('clinica_id', clinica.id)
    .eq('activo', true)
  if (profesionalId) profQuery = profQuery.eq('id', profesionalId)
  const { data: profesionales } = await profQuery
  if (!profesionales?.length) return { error: 'No hay profesionales disponibles.' }

  // Citas del día (wall-clock range)
  const { data: citas } = await supabase
    .from('citas')
    .select('profesional_id, inicio, fin')
    .eq('clinica_id', clinica.id)
    .gte('inicio', `${fecha}T00:00:00`)
    .lte('inicio', `${fecha}T23:59:59`)
    .not('estado', 'in', '("cancelada","no_asistio")')

  const ocupados = (citas ?? []).map(c => ({
    profesional_id: c.profesional_id as string,
    inicio: wallClockOf(c.inicio as string),
    fin: wallClockOf(c.fin as string),
  }))

  const [desdeH, desdeM] = horarioDia.desde.split(':').map(Number)
  const [hastaH, hastaM] = horarioDia.hasta.split(':').map(Number)
  const hoy = nowSantiago()

  return profesionales.map(p => {
    const horas: string[] = []
    let cur = desdeH * 60 + desdeM
    const fin = hastaH * 60 + hastaM
    while (cur + duracion <= fin) {
      const h = String(Math.floor(cur / 60)).padStart(2, '0')
      const m = String(cur % 60).padStart(2, '0')
      const slotIni = `${fecha}T${h}:${m}:00`
      const finMin = cur + duracion
      const slotFin = `${fecha}T${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}:00`
      const choca = ocupados.some(o =>
        o.profesional_id === p.id && slotIni < o.fin && slotFin > o.inicio,
      )
      const esPasado = fecha === hoy.fecha && `${h}:${m}` <= hoy.hora
      if (!choca && !esPasado) horas.push(`${h}:${m}`)
      cur += duracion
    }
    return { profesional_id: p.id as string, profesional: p.nombre as string, horas }
  })
}

// ─── Definición de herramientas ───────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_disponibilidad',
    description: 'Consulta los horarios disponibles para un servicio en una fecha. Llámala SIEMPRE antes de proponer horas al paciente — nunca inventes horarios. Si el paciente no indicó profesional, omite profesional_id para ver disponibilidad de todos.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        servicio_id: { type: 'string', description: 'ID del servicio (de la lista de servicios)' },
        profesional_id: { type: 'string', description: 'ID del profesional (opcional)' },
      },
      required: ['fecha', 'servicio_id'],
    },
  },
  {
    name: 'crear_cita',
    description: 'Crea una cita confirmada. Llámala SOLO cuando el paciente haya confirmado explícitamente servicio, profesional, fecha y hora, y te haya dado su nombre completo. La hora debe ser una de las devueltas por consultar_disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        servicio_id: { type: 'string' },
        profesional_id: { type: 'string' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora: { type: 'string', description: 'HH:MM (de consultar_disponibilidad)' },
        nombre_paciente: { type: 'string', description: 'Nombre completo del paciente' },
        email_paciente: { type: 'string', description: 'Email del paciente (opcional)' },
      },
      required: ['servicio_id', 'profesional_id', 'fecha', 'hora', 'nombre_paciente'],
    },
  },
  {
    name: 'listar_citas_paciente',
    description: 'Lista las citas próximas del paciente (identificado por su número de WhatsApp). Úsala cuando pregunte por sus citas o quiera cancelar/reagendar.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'cancelar_cita',
    description: 'Cancela una cita del paciente. Confirma con el paciente antes de cancelar. El cita_id viene de listar_citas_paciente.',
    input_schema: {
      type: 'object',
      properties: { cita_id: { type: 'string' } },
      required: ['cita_id'],
    },
  },
  {
    name: 'escalar_a_humano',
    description: 'Deriva la conversación al equipo humano de la clínica. Úsala cuando el paciente lo pida, esté molesto, tenga una consulta médica/clínica que no puedes responder, o lleves varias vueltas sin poder resolver su solicitud.',
    input_schema: {
      type: 'object',
      properties: { motivo: { type: 'string', description: 'Resumen breve para el equipo' } },
      required: ['motivo'],
    },
  },
]

// ─── Ejecución de herramientas ────────────────────────────────

async function ejecutarTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { supabase: SupabaseClient; clinica: ClinicaAgente; telefono: string; conversacionId: string },
): Promise<{ result: string; escalado?: boolean }> {
  const { supabase, clinica, telefono } = ctx

  if (name === 'consultar_disponibilidad') {
    const r = await calcularSlots(
      supabase, clinica,
      String(input.fecha), String(input.servicio_id),
      input.profesional_id ? String(input.profesional_id) : undefined,
    )
    return { result: JSON.stringify(r) }
  }

  if (name === 'crear_cita') {
    const inicio = `${input.fecha}T${input.hora}:00`
    const { data: servicio } = await supabase
      .from('servicios')
      .select('duracion_minutos')
      .eq('id', String(input.servicio_id))
      .eq('clinica_id', clinica.id)
      .maybeSingle()
    if (!servicio) return { result: JSON.stringify({ error: 'Servicio no encontrado' }) }
    const dur = servicio.duracion_minutos ?? 60
    const [h, m] = String(input.hora).split(':').map(Number)
    const finMin = h * 60 + m + dur
    const fin = `${input.fecha}T${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}:00`

    const { data, error } = await supabase.rpc('crear_reserva_publica', {
      p_clinica_id: clinica.id,
      p_servicio_id: String(input.servicio_id),
      p_profesional_id: String(input.profesional_id),
      p_inicio: inicio,
      p_fin: fin,
      p_paciente_nombre: String(input.nombre_paciente),
      p_paciente_telefono: telefono,
      p_paciente_email: input.email_paciente ? String(input.email_paciente) : null,
      p_notas: 'Agendada vía WhatsApp (agente IA)',
      p_paciente_rut: null,
    })
    if (error) return { result: JSON.stringify({ error: error.message }) }
    const res = data as { cita_id?: string; ok?: boolean; error?: string }
    if (!res?.cita_id && !res?.ok) return { result: JSON.stringify({ error: res?.error ?? 'No se pudo crear la cita' }) }
    return { result: JSON.stringify({ ok: true, cita_id: res.cita_id }) }
  }

  if (name === 'listar_citas_paciente') {
    const digits = telefono.replace(/\D/g, '')
    const { data: pacientes } = await supabase
      .from('pacientes')
      .select('id, nombre, telefono')
      .eq('clinica_id', clinica.id)
    const match = (pacientes ?? []).filter(p =>
      (p.telefono as string | null)?.replace(/\D/g, '').endsWith(digits.slice(-9)),
    )
    if (!match.length) return { result: JSON.stringify({ citas: [], nota: 'Paciente no registrado aún con este número' }) }

    const hoy = nowSantiago()
    const { data: citas } = await supabase
      .from('citas')
      .select('id, inicio, estado, servicios(nombre), profesionales(nombre)')
      .eq('clinica_id', clinica.id)
      .in('paciente_id', match.map(p => p.id))
      .gte('inicio', `${hoy.fecha}T00:00:00`)
      .not('estado', 'in', '("cancelada","no_asistio")')
      .order('inicio', { ascending: true })
      .limit(10)

    const items = (citas ?? []).map(c => {
      const wall = wallClockOf(c.inicio as string)
      const serv = Array.isArray(c.servicios) ? c.servicios[0] : c.servicios
      const prof = Array.isArray(c.profesionales) ? c.profesionales[0] : c.profesionales
      return {
        cita_id: c.id,
        fecha: wall.slice(0, 10),
        hora: wall.slice(11, 16),
        estado: c.estado,
        servicio: (serv as { nombre?: string } | null)?.nombre ?? null,
        profesional: (prof as { nombre?: string } | null)?.nombre ?? null,
      }
    })
    return { result: JSON.stringify({ citas: items }) }
  }

  if (name === 'cancelar_cita') {
    // Verify the cita belongs to this clinic and a patient with this phone
    const { data: cita } = await supabase
      .from('citas')
      .select('id, estado, pacientes(telefono)')
      .eq('id', String(input.cita_id))
      .eq('clinica_id', clinica.id)
      .maybeSingle()
    if (!cita) return { result: JSON.stringify({ error: 'Cita no encontrada' }) }
    const pac = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes
    const pacTel = ((pac as { telefono?: string | null } | null)?.telefono ?? '').replace(/\D/g, '')
    const digits = telefono.replace(/\D/g, '')
    if (!pacTel || !pacTel.endsWith(digits.slice(-9))) {
      return { result: JSON.stringify({ error: 'La cita no pertenece a este paciente' }) }
    }
    if (cita.estado === 'cancelada') return { result: JSON.stringify({ error: 'La cita ya estaba cancelada' }) }

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'cancelada' })
      .eq('id', cita.id)
    if (error) return { result: JSON.stringify({ error: error.message }) }
    return { result: JSON.stringify({ ok: true }) }
  }

  if (name === 'escalar_a_humano') {
    await ctx.supabase
      .from('conversaciones')
      .update({ estado: 'humano', no_leidos: 99 })
      .eq('id', ctx.conversacionId)
    return {
      result: JSON.stringify({ ok: true, nota: 'Conversación derivada al equipo. Despídete indicando que una persona del equipo le responderá pronto.' }),
      escalado: true,
    }
  }

  return { result: JSON.stringify({ error: `Herramienta desconocida: ${name}` }) }
}

// ─── System prompt ────────────────────────────────────────────

function buildSystemPrompt(
  clinica: ClinicaAgente,
  servicios: { id: string; nombre: string; duracion_minutos: number | null; precio: number | null }[],
  profesionales: { id: string; nombre: string; especialidad: string | null }[],
): string {
  const ahora = nowSantiago()
  const horarios = clinica.configuracion?.horarios
  const horariosTxt = horarios
    ? Object.entries(horarios)
        .map(([dia, h]) => `- ${dia}: ${h.activo ? `${h.desde} a ${h.hasta}` : 'cerrado'}`)
        .join('\n')
    : '(no configurados — escala a humano si preguntan)'

  return `Eres el asistente virtual de agendamiento de "${clinica.nombre}", una clínica en Chile. Atiendes a pacientes por WhatsApp.

Hoy es ${ahora.diaSemana} ${ahora.fecha} y son las ${ahora.hora} (hora de Chile).

DATOS DE LA CLÍNICA
${clinica.direccion ? `Dirección: ${clinica.direccion}` : ''}
${clinica.telefono ? `Teléfono: ${clinica.telefono}` : ''}

Horarios de atención:
${horariosTxt}

SERVICIOS (usa estos IDs en las herramientas):
${servicios.map(s => `- ${s.nombre} (id: ${s.id}) — ${s.duracion_minutos ?? 60} min${s.precio ? `, $${Number(s.precio).toLocaleString('es-CL')}` : ''}`).join('\n')}

PROFESIONALES (usa estos IDs en las herramientas):
${profesionales.map(p => `- ${p.nombre}${p.especialidad ? ` (${p.especialidad})` : ''} (id: ${p.id})`).join('\n')}

TU TRABAJO
Ayudar al paciente a: agendar una cita, consultar sus citas, cancelar o reagendar, y responder preguntas básicas sobre servicios, precios y horarios.

REGLAS
- Responde SIEMPRE en español chileno, cercano y profesional. Mensajes cortos: esto es WhatsApp, máximo 3-4 líneas por mensaje salvo que listes horarios.
- NUNCA inventes horarios disponibles: usa consultar_disponibilidad antes de proponer horas.
- Para agendar necesitas: servicio, profesional, fecha, hora confirmada por el paciente, y su nombre completo. Pide solo lo que falte, de a poco, sin interrogatorios.
- Si hay varios profesionales disponibles y el paciente no tiene preferencia, sugiere el que tenga más horarios libres.
- Para reagendar: cancela la cita anterior y crea una nueva (confirma primero el nuevo horario con el paciente).
- No des consejos médicos ni diagnósticos. Para temas clínicos, precios especiales, convenios o reclamos, usa escalar_a_humano.
- Si el paciente escribe algo no relacionado con la clínica, redirige amablemente.
- Nunca muestres IDs internos (UUIDs) al paciente.
- Usa emojis con moderación (uno por mensaje máximo).`
}

// ─── Entrada principal ────────────────────────────────────────

export function agenteActivo(clinica: { configuracion: ClinicaAgente['configuracion'] }): boolean {
  return clinica.configuracion?.agente_wsp?.activo === true && !!process.env.ANTHROPIC_API_KEY
}

/**
 * Genera la respuesta del agente para el último mensaje entrante de una conversación.
 * Devuelve texto a enviar (o null si no debe responder).
 */
export async function responderConAgente(params: {
  supabase: SupabaseClient
  clinicaId: string
  conversacionId: string
  telefono: string
}): Promise<RespuestaAgente> {
  const { supabase, clinicaId, conversacionId, telefono } = params

  const { data: clinicaRow } = await supabase
    .from('clinicas')
    .select('id, nombre, telefono, direccion, configuracion')
    .eq('id', clinicaId)
    .maybeSingle()
  if (!clinicaRow) return { texto: null, escalado: false }
  const clinica = clinicaRow as ClinicaAgente

  if (!agenteActivo(clinica)) return { texto: null, escalado: false }

  // Si un humano tomó la conversación, el agente se calla
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('estado')
    .eq('id', conversacionId)
    .maybeSingle()
  if (conv?.estado === 'humano') return { texto: null, escalado: false }

  const [{ data: servicios }, { data: profesionales }, { data: historial }] = await Promise.all([
    supabase.from('servicios')
      .select('id, nombre, duracion_minutos, precio')
      .eq('clinica_id', clinicaId).eq('activo', true).order('nombre'),
    supabase.from('profesionales')
      .select('id, nombre, especialidad')
      .eq('clinica_id', clinicaId).eq('activo', true).order('nombre'),
    supabase.from('mensajes_inbox')
      .select('direccion, contenido, created_at')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  ])

  if (!servicios?.length || !profesionales?.length) return { texto: null, escalado: false }

  // Historial cronológico → mensajes Claude (colapsando roles consecutivos)
  const ordenado = (historial ?? []).reverse()
  const messages: Anthropic.MessageParam[] = []
  for (const m of ordenado) {
    const role: 'user' | 'assistant' = m.direccion === 'entrante' ? 'user' : 'assistant'
    const contenido = String(m.contenido ?? '').trim()
    if (!contenido) continue
    const last = messages[messages.length - 1]
    if (last && last.role === role && typeof last.content === 'string') {
      last.content = `${last.content}\n${contenido}`
    } else {
      messages.push({ role, content: contenido })
    }
  }
  if (!messages.length || messages[0].role !== 'user') {
    // Claude exige que el primer mensaje sea del usuario
    while (messages.length && messages[0].role !== 'user') messages.shift()
    if (!messages.length) return { texto: null, escalado: false }
  }
  if (messages[messages.length - 1].role !== 'user') return { texto: null, escalado: false }

  const client = new Anthropic()
  const system = buildSystemPrompt(clinica, servicios, profesionales)
  const ctx = { supabase, clinica, telefono, conversacionId }
  let escalado = false

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
      })

      if (response.stop_reason !== 'tool_use') {
        const texto = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim()
        return { texto: texto || null, escalado }
      }

      messages.push({ role: 'assistant', content: response.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const r = await ejecutarTool(block.name, block.input as Record<string, unknown>, ctx)
        if (r.escalado) escalado = true
        results.push({ type: 'tool_result', tool_use_id: block.id, content: r.result })
      }
      messages.push({ role: 'user', content: results })
    }
    // Loop agotado: respuesta de cortesía
    return { texto: 'Dame un momento, una persona del equipo te ayudará a la brevedad 🙏', escalado }
  } catch (e) {
    console.error('[whatsapp/agente] error', e)
    return { texto: null, escalado }
  }
}
