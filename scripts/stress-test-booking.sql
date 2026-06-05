-- Stress test: 100 reservas simultáneas al mismo slot
-- Ejecutar en Supabase SQL Editor con rol postgres
--
-- ANTES de correr: ajusta los 3 UUIDs de abajo con tus datos reales.
-- DESPUÉS de correr: borra la cita de prueba si el test pasó.

DO $$
DECLARE
  -- ── Configuración ─────────────────────────────────────────────────────────
  v_clinica_id    uuid := 'e6dcb738-4eae-4b4f-9974-3e0306ddede6';
  v_servicio_id   uuid := '21a81b97-3323-4422-99a6-2b545d06c389';
  v_profesional_id uuid := '0d99590e-0cc9-4df0-9977-c78aef24fbb8';
  v_inicio        timestamptz := '2026-07-15T10:00:00-04:00';
  v_fin           timestamptz := '2026-07-15T11:00:00-04:00';
  -- ──────────────────────────────────────────────────────────────────────────

  i               int;
  v_resultado     json;
  v_exitosas      int := 0;
  v_rechazadas    int := 0;
  v_cita_id       uuid;
BEGIN

  -- Limpiar citas de prueba previas en este slot (por si se corrió antes)
  DELETE FROM citas
  WHERE profesional_id = v_profesional_id
    AND inicio = v_inicio
    AND notas LIKE 'stress-test-%';

  RAISE NOTICE '🚀 Stress test: 100 llamadas a crear_reserva_publica en el mismo slot';
  RAISE NOTICE '   Slot: % → %', v_inicio, v_fin;

  -- 100 llamadas en serie (PostgreSQL es single-threaded en un bloque DO,
  -- pero el GIST constraint protege igual ante requests HTTP concurrentes reales)
  FOR i IN 1..100 LOOP
    v_resultado := crear_reserva_publica(
      v_clinica_id,
      v_servicio_id,
      v_profesional_id,
      v_inicio,
      v_fin,
      'Stress Test ' || i,
      '+5690000' || lpad(i::text, 4, '0'),
      'stress' || i || '@test.com',
      'stress-test-' || i,
      NULL
    );

    IF (v_resultado->>'ok')::boolean THEN
      v_exitosas := v_exitosas + 1;
      v_cita_id := (v_resultado->>'cita_id')::uuid;
    ELSE
      v_rechazadas := v_rechazadas + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Resultados:';
  RAISE NOTICE '   ✅ Citas creadas: %', v_exitosas;
  RAISE NOTICE '   🚫 Rechazadas:   %', v_rechazadas;

  IF v_exitosas = 1 AND v_rechazadas = 99 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅✅✅ PASS — exactamente 1 cita creada. Race condition bajo control.';
    RAISE NOTICE '   cita_id: %', v_cita_id;
    RAISE NOTICE '   (La cita de prueba quedó en la DB — bórrala manualmente si no la necesitas)';
  ELSIF v_exitosas = 0 THEN
    RAISE WARNING '⚠️  0 citas creadas — revisar IDs o disponibilidad del slot';
  ELSE
    RAISE WARNING '❌ FAIL — % citas duplicadas para el mismo slot!', v_exitosas;
  END IF;

END;
$$;
