// Agente IA de agendamiento — maneja mensajes entrantes y ejecuta herramientas de agenda.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AgenteInput = {
  supabase: SupabaseClient
  clinicaId: string
  /** Mensaje del paciente en texto plano */
  mensaje: string
  /** Historial previo de la conversación (opcional) */
  historial?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export type AgenteOutput = {
  respuesta: string
  herramientasUsadas: string[]
}

// ─── Tipos Anthropic Messages API ─────────────────────────────────────────────

type AnthropicTool = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

type AnthropicTextBlock = { type: 'text'; text: string }
type AnthropicToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[] | Array<{ type: 'tool_result'; tool_use_id: string; content: string }>
}

type AnthropicResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  content: AnthropicContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string
}

// ─── Herramientas disponibles ─────────────────────────────────────────────────

const tools: AnthropicTool[] = [
  {
    name: 'buscar_disponibilidad',
    description: 'Busca los horarios disponibles para un servicio y/o profesional en una fecha determinada.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        servicio_id: { type: 'string', description: 'UUID del servicio (opcional)' },
        profesional_id: { type: 'string', description: 'UUID del profesional (opcional)' },
      },
      required: ['fecha'],
    },
  },
  {
    name: 'crear_cita',
    description: 'Crea una nueva cita para un paciente en el sistema.',
    input_schema: {
      type: 'object',
      properties: {
        paciente_id: { type: 'string', description: 'UUID del paciente' },
        servicio_id: { type: 'string', description: 'UUID del servicio' },
        profesional_id: { type: 'string', description: 'UUID del profesional' },
        inicio: { type: 'string', description: 'Fecha y hora de inicio en formato ISO 8601' },
        fin: { type: 'string', description: 'Fecha y hora de fin en formato ISO 8601' },
      },
      required: ['paciente_id', 'servicio_id', 'profesional_id', 'inicio', 'fin'],
    },
  },
  {
    name: 'buscar_paciente',
    description: 'Busca un paciente por número de teléfono o nombre.',
    input_schema: {
      type: 'object',
      properties: {
        telefono: { type: 'string', description: 'Número de teléfono del paciente' },
        nombre: { type: 'string', description: 'Nombre del paciente (búsqueda parcial)' },
      },
    },
  },
  {
    name: 'listar_servicios',
    description: 'Lista los servicios disponibles en la clínica.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'confirmar_cita',
    description: 'Confirma una cita pendiente cuando el paciente dice SI, confirmo, ok, etc.',
    input_schema: {
      type: 'object',
      properties: {
        cita_id: { type: 'string', description: 'UUID de la cita a confirmar' },
      },
      required: ['cita_id'],
    },
  },
]

// ─── Ejecución de herramientas ────────────────────────────────────────────────

async function ejecutarHerramienta(
  name: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  clinicaId: string,
): Promise<unknown> {
  switch (name) {
    case 'buscar_disponibilidad': {
      const { fecha, servicio_id, profesional_id } = input as {
        fecha: string
        servicio_id?: string
        profesional_id?: string
      }
      let query = supabase
        .from('citas')
        .select('id, inicio, fin, profesional_id, servicio_id')
        .eq('clinica_id', clinicaId)
        .gte('inicio', `${fecha}T00:00:00`)
        .lt('inicio', `${fecha}T23:59:59`)
        .in('estado', ['pendiente', 'confirmada'])

      if (profesional_id) query = query.eq('profesional_id', profesional_id)
      if (servicio_id) query = query.eq('servicio_id', servicio_id)

      const { data, error } = await query
      if (error) return { ok: false, error: error.message }
      return { ok: true, citas_ocupadas: data ?? [] }
    }

    case 'crear_cita': {
      const { paciente_id, servicio_id, profesional_id, inicio, fin } = input as {
        paciente_id: string
        servicio_id: string
        profesional_id: string
        inicio: string
        fin: string
      }
      const { data, error } = await supabase
        .from('citas')
        .insert({
          clinica_id: clinicaId,
          paciente_id,
          servicio_id,
          profesional_id,
          inicio,
          fin,
          estado: 'pendiente',
        })
        .select('id, inicio, fin, estado')
        .single()

      if (error) return { ok: false, error: error.message }
      return { ok: true, cita: data }
    }

    case 'buscar_paciente': {
      const { telefono, nombre } = input as { telefono?: string; nombre?: string }
      let query = supabase
        .from('pacientes')
        .select('id, nombre, telefono, email')
        .eq('clinica_id', clinicaId)

      if (telefono) query = query.ilike('telefono', `%${(telefono as string).replace(/\D/g, '')}%`)
      else if (nombre) query = query.ilike('nombre', `%${nombre}%`)

      const { data, error } = await query.limit(5)
      if (error) return { ok: false, error: error.message }
      return { ok: true, pacientes: data ?? [] }
    }

    case 'listar_servicios': {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, duracion_minutos, precio')
        .eq('clinica_id', clinicaId)
        .eq('activo', true)
        .order('nombre')

      if (error) return { ok: false, error: error.message }
      return { ok: true, servicios: data ?? [] }
    }

    case 'confirmar_cita': {
      const { cita_id } = input as { cita_id: string }
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'confirmada' })
        .eq('id', cita_id)
        .eq('clinica_id', clinicaId)
        .eq('estado', 'pendiente')
      if (error) {
        return { ok: false, error: error.message }
      } else {
        return { ok: true, mensaje: 'Cita confirmada exitosamente' }
      }
    }

    default:
      return { ok: false, error: `Herramienta desconocida: ${name}` }
  }
}

// ─── Llamada a la API de Anthropic ───────────────────────────────────────────

async function callAnthropicAPI(
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<AnthropicResponse>
}

// ─── Agente principal ─────────────────────────────────────────────────────────

export async function runAgenteAgendamiento(opts: AgenteInput): Promise<AgenteOutput> {
  const { supabase, clinicaId, mensaje, historial = [] } = opts

  // Cargar config de la clínica para personalización
  const { data: clinicaRow } = await supabase
    .from('clinicas')
    .select('nombre, configuracion')
    .eq('id', clinicaId)
    .maybeSingle()

  const clinicaNombre = clinicaRow?.nombre ?? 'la clínica'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (clinicaRow?.configuracion ?? {}) as Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agenteWsp = (cfg.agente_wsp ?? {}) as Record<string, any>

  const nombreAsistente: string = agenteWsp.nombre_asistente ?? 'Asistente'
  const tono: 'cercano' | 'formal' = agenteWsp.tono === 'formal' ? 'formal' : 'cercano'
  const instruccionesExtra: string | undefined = agenteWsp.instrucciones_extra || undefined

  const tonoInstruccion =
    tono === 'formal'
      ? 'Usa un tono formal y de respeto, dirígete al paciente de "usted".'
      : 'Usa un tono cercano y amigable, dirígete al paciente de "tú".'

  let systemPrompt = `Eres ${nombreAsistente}, el asistente virtual de agendamiento de ${clinicaNombre}.
Tu rol es ayudar a los pacientes a agendar, consultar y confirmar citas por WhatsApp.
${tonoInstruccion}
- Sé conciso y claro en tus respuestas.
- Antes de crear una cita, verifica la disponibilidad.
- Si el paciente no está registrado, pregunta sus datos básicos.
- Confirma siempre los detalles antes de crear una cita.
- No inventes información; usa las herramientas para obtener datos reales.`

  if (instruccionesExtra) {
    systemPrompt += `\n\nInstrucciones adicionales:\n${instruccionesExtra}`
  }

  const herramientasUsadas: string[] = []

  const messages: AnthropicMessage[] = [
    ...historial.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: mensaje },
  ]

  // Bucle agente: continúa hasta que Claude no use más herramientas
  let iteraciones = 0
  const MAX_ITERACIONES = 8

  while (iteraciones < MAX_ITERACIONES) {
    iteraciones++

    const response = await callAnthropicAPI(systemPrompt, messages)

    // Acumular respuesta en el historial
    messages.push({ role: 'assistant', content: response.content })

    // Si terminó sin usar herramientas, retornar
    if (response.stop_reason === 'end_turn') {
      const texto = response.content
        .filter((b): b is AnthropicTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()

      return { respuesta: texto, herramientasUsadas }
    }

    // Procesar tool_use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is AnthropicToolUseBlock => b.type === 'tool_use',
    )

    if (toolUseBlocks.length === 0) {
      // stop_reason no es end_turn pero tampoco hay herramientas (max_tokens?)
      const texto = response.content
        .filter((b): b is AnthropicTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      return { respuesta: texto || 'Lo siento, no pude procesar tu solicitud en este momento.', herramientasUsadas }
    }

    // Ejecutar cada herramienta y construir tool_result
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []
    for (const toolUse of toolUseBlocks) {
      herramientasUsadas.push(toolUse.name)
      const result = await ejecutarHerramienta(
        toolUse.name,
        toolUse.input,
        supabase,
        clinicaId,
      )
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return {
    respuesta: 'Lo siento, no pude completar tu solicitud. Por favor, contacta directamente a la clínica.',
    herramientasUsadas,
  }
}
