-- ============================================================
-- AestheticOS — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE clinicas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  email       text UNIQUE,
  telefono    text,
  direccion   text,
  logo_url    text,
  plan        text NOT NULL DEFAULT 'starter',
  activo      boolean NOT NULL DEFAULT true,
  owner_id    uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profesionales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  nombre      text NOT NULL,
  especialidad text,
  email       text,
  telefono    text,
  color       text NOT NULL DEFAULT '#7C3AED',
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pacientes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id       uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  nombre           text NOT NULL,
  email            text,
  telefono         text,
  rut              text,
  fecha_nacimiento date,
  notas            text,
  activo           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE servicios (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id        uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  nombre            text NOT NULL,
  descripcion       text,
  duracion_minutos  int NOT NULL DEFAULT 60,
  precio            int NOT NULL DEFAULT 0,
  color             text NOT NULL DEFAULT '#7C3AED',
  activo            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE citas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id           uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  paciente_id          uuid NOT NULL REFERENCES pacientes ON DELETE CASCADE,
  profesional_id       uuid NOT NULL REFERENCES profesionales ON DELETE CASCADE,
  servicio_id          uuid NOT NULL REFERENCES servicios ON DELETE CASCADE,
  inicio               timestamptz NOT NULL,
  fin                  timestamptz NOT NULL,
  estado               text NOT NULL DEFAULT 'pendiente',
  notas                text,
  recordatorio_enviado boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT citas_estado_check CHECK (
    estado IN ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio')
  ),
  CONSTRAINT citas_rango_check CHECK (fin > inicio)
);

CREATE TABLE mensajes_whatsapp (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  cita_id     uuid REFERENCES citas ON DELETE SET NULL,
  paciente_id uuid REFERENCES pacientes ON DELETE SET NULL,
  tipo        text NOT NULL,
  contenido   text NOT NULL,
  estado      text NOT NULL DEFAULT 'enviado',
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mensajes_tipo_check CHECK (
    tipo IN ('recordatorio', 'confirmacion', 'cancelacion', 'custom')
  ),
  CONSTRAINT mensajes_estado_check CHECK (
    estado IN ('enviado', 'entregado', 'leido', 'fallido')
  )
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX ON profesionales (clinica_id);
CREATE INDEX ON pacientes (clinica_id);
CREATE INDEX ON pacientes (rut);
CREATE INDEX ON servicios (clinica_id);
CREATE INDEX ON citas (clinica_id);
CREATE INDEX ON citas (inicio);
CREATE INDEX ON citas (paciente_id);
CREATE INDEX ON citas (profesional_id);
CREATE INDEX ON mensajes_whatsapp (clinica_id);
CREATE INDEX ON mensajes_whatsapp (cita_id);

-- ============================================================
-- FUNCIÓN AUXILIAR: obtener clinica_id del usuario autenticado
-- Usada por las políticas RLS para evitar subconsultas repetidas.
-- ============================================================

CREATE OR REPLACE FUNCTION auth_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clinicas WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clinicas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesionales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

-- clinicas: cada usuario accede solo a la clínica que posee
CREATE POLICY "clinicas_owner" ON clinicas
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- profesionales
CREATE POLICY "profesionales_clinica" ON profesionales
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

-- pacientes
CREATE POLICY "pacientes_clinica" ON pacientes
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

-- servicios
CREATE POLICY "servicios_clinica" ON servicios
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

-- citas
CREATE POLICY "citas_clinica" ON citas
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

-- mensajes_whatsapp
CREATE POLICY "mensajes_clinica" ON mensajes_whatsapp
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

-- ============================================================
-- TRIGGER: crear clínica automáticamente al registrar usuario
-- Lee raw_user_meta_data para obtener clinica_nombre y telefono.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO clinicas (owner_id, nombre, telefono, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clinica_nombre', 'Mi Clínica'),
    NEW.raw_user_meta_data->>'telefono',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
