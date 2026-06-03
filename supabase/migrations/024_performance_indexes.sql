-- Índices de performance para queries frecuentes (M4)

-- Pacientes: búsqueda por texto + ordenado por created_at
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_created
  ON pacientes (clinica_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre_trgm
  ON pacientes USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pacientes_telefono
  ON pacientes (clinica_id, telefono);

-- Citas: query de agenda por rango de fechas (la más frecuente)
CREATE INDEX IF NOT EXISTS idx_citas_clinica_inicio
  ON citas (clinica_id, inicio);

CREATE INDEX IF NOT EXISTS idx_citas_clinica_estado_inicio
  ON citas (clinica_id, estado, inicio);

-- Citas: queries de historial por paciente y profesional
CREATE INDEX IF NOT EXISTS idx_citas_paciente_inicio
  ON citas (paciente_id, inicio DESC);

CREATE INDEX IF NOT EXISTS idx_citas_profesional_inicio
  ON citas (profesional_id, inicio DESC);

-- Servicios: búsqueda + orden
CREATE INDEX IF NOT EXISTS idx_servicios_clinica_activo
  ON servicios (clinica_id, activo, created_at DESC);

-- Habilitar extensión trigram si no está activa (para búsqueda por texto eficiente)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
