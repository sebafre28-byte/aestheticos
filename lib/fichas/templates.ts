export const TIPOS_TRATAMIENTO = ['general', 'botox', 'relleno', 'laser', 'facial', 'corporal', 'mesoterapia'] as const
export type TipoTratamiento = typeof TIPOS_TRATAMIENTO[number]

type TipoCampo = 'text' | 'textarea' | 'select' | 'number' | 'date'
interface Campo { key: string; label: string; tipo: TipoCampo; opciones?: string[]; requerido?: boolean; placeholder?: string }
interface Template { label: string; color: string; campos: Campo[] }

export const TEMPLATES: Record<TipoTratamiento, Template> = {
  general: {
    label: 'General',
    color: 'bg-gray-100 text-gray-700',
    campos: [
      { key: 'motivo_consulta', label: 'Motivo de consulta', tipo: 'textarea', requerido: true, placeholder: 'Descripción del motivo...' },
      { key: 'diagnostico', label: 'Diagnóstico', tipo: 'textarea', placeholder: 'Diagnóstico clínico...' },
      { key: 'tratamiento', label: 'Tratamiento aplicado', tipo: 'textarea', placeholder: 'Procedimiento realizado...' },
    ],
  },
  botox: {
    label: 'Botox',
    color: 'bg-purple-100 text-purple-700',
    campos: [
      { key: 'zona', label: 'Zona tratada', tipo: 'select', opciones: ['Frente', 'Entrecejo', 'Patas de gallo', 'Frente + Entrecejo', 'Frente + Entrecejo + Patas de gallo', 'Otra'], requerido: true },
      { key: 'unidades', label: 'Unidades aplicadas', tipo: 'number', placeholder: 'Ej: 20' },
      { key: 'marca', label: 'Marca del producto', tipo: 'select', opciones: ['Botox (Allergan)', 'Dysport', 'Xeomin', 'Neuronox', 'Otro'] },
      { key: 'lote', label: 'Lote/Número de serie', tipo: 'text', placeholder: 'Ej: ABC12345' },
      { key: 'resultado_esperado', label: 'Resultado esperado', tipo: 'textarea', placeholder: 'Descripción del resultado...' },
    ],
  },
  relleno: {
    label: 'Relleno',
    color: 'bg-pink-100 text-pink-700',
    campos: [
      { key: 'zona', label: 'Zona tratada', tipo: 'select', opciones: ['Labios', 'Surcos nasogenianos', 'Pómulos', 'Ojeras', 'Mentón', 'Mandíbula', 'Otra'], requerido: true },
      { key: 'volumen', label: 'Volumen (ml)', tipo: 'number', placeholder: 'Ej: 1.0' },
      { key: 'producto', label: 'Producto utilizado', tipo: 'text', placeholder: 'Ej: Juvederm Ultra' },
      { key: 'lote', label: 'Lote', tipo: 'text', placeholder: 'Número de lote...' },
      { key: 'tecnica', label: 'Técnica', tipo: 'select', opciones: ['Jeringa', 'Cánula', 'Mixta'] },
    ],
  },
  laser: {
    label: 'Láser / IPL',
    color: 'bg-yellow-100 text-yellow-700',
    campos: [
      { key: 'tipo_laser', label: 'Tipo de láser', tipo: 'select', opciones: ['Nd:YAG', 'CO2', 'Alexandrita', 'Diodo', 'IPL', 'Otro'], requerido: true },
      { key: 'zona', label: 'Zona tratada', tipo: 'text', requerido: true, placeholder: 'Ej: Rostro completo' },
      { key: 'energia', label: 'Energía/Fluencia', tipo: 'text', placeholder: 'Ej: 15 J/cm²' },
      { key: 'sesion_numero', label: 'N° de sesión', tipo: 'number', placeholder: 'Ej: 3' },
      { key: 'reaccion', label: 'Reacción observada', tipo: 'textarea', placeholder: 'Enrojecimiento, eritema...' },
    ],
  },
  facial: {
    label: 'Facial',
    color: 'bg-green-100 text-green-700',
    campos: [
      { key: 'tipo_facial', label: 'Tipo de facial', tipo: 'select', opciones: ['Limpieza profunda', 'Hidratación', 'Anti-acné', 'Anti-edad', 'Despigmentante', 'Otro'], requerido: true },
      { key: 'productos', label: 'Productos utilizados', tipo: 'textarea', placeholder: 'Lista de productos...' },
      { key: 'estado_piel', label: 'Estado de la piel', tipo: 'select', opciones: ['Normal', 'Seca', 'Grasa', 'Mixta', 'Sensible', 'Acneica'] },
      { key: 'observaciones', label: 'Observaciones', tipo: 'textarea', placeholder: 'Estado inicial, reacciones...' },
    ],
  },
  corporal: {
    label: 'Corporal',
    color: 'bg-blue-100 text-blue-700',
    campos: [
      { key: 'tratamiento', label: 'Tratamiento', tipo: 'select', opciones: ['Reducción de medidas', 'Drenaje linfático', 'Cavitación', 'Radiofrecuencia', 'Mesoterapia corporal', 'Otro'], requerido: true },
      { key: 'zona', label: 'Zona tratada', tipo: 'text', requerido: true, placeholder: 'Ej: Abdomen, flancos' },
      { key: 'sesion_numero', label: 'N° de sesión', tipo: 'number', placeholder: 'Ej: 5' },
      { key: 'medidas', label: 'Medidas (cm)', tipo: 'textarea', placeholder: 'Cintura: 80cm, Cadera: 95cm...' },
    ],
  },
  mesoterapia: {
    label: 'Mesoterapia',
    color: 'bg-teal-100 text-teal-700',
    campos: [
      { key: 'zona', label: 'Zona tratada', tipo: 'select', opciones: ['Rostro', 'Cuero cabelludo', 'Abdomen', 'Muslos', 'Otra'], requerido: true },
      { key: 'coctel', label: 'Cóctel utilizado', tipo: 'textarea', requerido: true, placeholder: 'Componentes del cóctel...' },
      { key: 'tecnica', label: 'Técnica', tipo: 'select', opciones: ['Nappage', 'Punto a punto', 'Mesogum', 'Pistola'] },
      { key: 'sesion_numero', label: 'N° de sesión', tipo: 'number', placeholder: 'Ej: 2' },
    ],
  },
}

export function esTipoValido(tipo: string): tipo is TipoTratamiento {
  return TIPOS_TRATAMIENTO.includes(tipo as TipoTratamiento)
}
