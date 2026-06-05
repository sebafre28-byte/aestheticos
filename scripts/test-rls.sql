-- Test RLS tenant isolation
-- Ejecutar en Supabase SQL Editor con rol postgres
-- Verifica que una clínica no puede ver datos de otra clínica

DO $$
DECLARE
  v_clinica_a uuid;
  v_clinica_b uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_paciente_a uuid;
  v_cita_a uuid;
  v_count int;
  v_errores int := 0;
BEGIN

  -- Tomar dos usuarios reales de auth.users para evitar FK violation
  SELECT id INTO v_user_a FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_user_b FROM auth.users ORDER BY created_at DESC LIMIT 1;

  IF v_user_a IS NULL OR v_user_b IS NULL OR v_user_a = v_user_b THEN
    RAISE EXCEPTION 'Se necesitan al menos 2 usuarios en auth.users para correr este test';
  END IF;

  -- ── Setup: crear dos clínicas de prueba ──────────────────────────────────────
  INSERT INTO clinicas (nombre, slug, owner_id)
  VALUES ('Test Clínica A', 'test-rls-a-' || extract(epoch from now())::int, v_user_a)
  RETURNING id INTO v_clinica_a;

  INSERT INTO clinicas (nombre, slug, owner_id)
  VALUES ('Test Clínica B', 'test-rls-b-' || extract(epoch from now())::int, v_user_b)
  RETURNING id INTO v_clinica_b;

  -- Crear paciente en clínica A
  INSERT INTO pacientes (clinica_id, nombre, telefono)
  VALUES (v_clinica_a, 'Paciente Test A', '+56900000001')
  RETURNING id INTO v_paciente_a;

  -- Crear cita en clínica A
  INSERT INTO citas (clinica_id, paciente_id, inicio, fin, estado)
  VALUES (v_clinica_a, v_paciente_a, now() + interval '1 day', now() + interval '1 day 1 hour', 'pendiente')
  RETURNING id INTO v_cita_a;

  RAISE NOTICE '✅ Setup: clínica A=%, clínica B=%, user_a=%, user_b=%', v_clinica_a, v_clinica_b, v_user_a, v_user_b;

  -- ── Test 1: usuario B NO puede ver pacientes de A ────────────────────────────
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO v_count
  FROM pacientes
  WHERE clinica_id = v_clinica_a;

  IF v_count > 0 THEN
    RAISE WARNING '❌ TEST 1 FALLO: usuario B puede ver % paciente(s) de clínica A', v_count;
    v_errores := v_errores + 1;
  ELSE
    RAISE NOTICE '✅ Test 1 OK: usuario B no puede ver pacientes de clínica A';
  END IF;

  -- ── Test 2: usuario B NO puede ver citas de A ────────────────────────────────
  SELECT count(*) INTO v_count
  FROM citas
  WHERE clinica_id = v_clinica_a;

  IF v_count > 0 THEN
    RAISE WARNING '❌ TEST 2 FALLO: usuario B puede ver % cita(s) de clínica A', v_count;
    v_errores := v_errores + 1;
  ELSE
    RAISE NOTICE '✅ Test 2 OK: usuario B no puede ver citas de clínica A';
  END IF;

  -- ── Test 3: usuario A SÍ puede ver sus propios pacientes ─────────────────────
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO v_count
  FROM pacientes
  WHERE clinica_id = v_clinica_a;

  IF v_count = 0 THEN
    RAISE WARNING '❌ TEST 3 FALLO: usuario A no puede ver sus propios pacientes';
    v_errores := v_errores + 1;
  ELSE
    RAISE NOTICE '✅ Test 3 OK: usuario A ve % paciente(s) propios', v_count;
  END IF;

  -- ── Test 4: usuario A SÍ puede ver sus propias citas ─────────────────────────
  SELECT count(*) INTO v_count
  FROM citas
  WHERE clinica_id = v_clinica_a;

  IF v_count = 0 THEN
    RAISE WARNING '❌ TEST 4 FALLO: usuario A no puede ver sus propias citas';
    v_errores := v_errores + 1;
  ELSE
    RAISE NOTICE '✅ Test 4 OK: usuario A ve % cita(s) propias', v_count;
  END IF;

  -- ── Test 5: usuario B NO puede insertar paciente en clínica A ────────────────
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);

  BEGIN
    INSERT INTO pacientes (clinica_id, nombre, telefono)
    VALUES (v_clinica_a, 'Intruso', '+56900000099');
    RAISE WARNING '❌ TEST 5 FALLO: usuario B pudo insertar paciente en clínica A';
    v_errores := v_errores + 1;
  EXCEPTION WHEN others THEN
    RAISE NOTICE '✅ Test 5 OK: usuario B no puede insertar en clínica A (bloqueado por RLS)';
  END;

  -- ── Resultado final ───────────────────────────────────────────────────────────
  IF v_errores = 0 THEN
    RAISE NOTICE '✅✅✅ TODOS LOS TESTS PASARON — aislamiento RLS correcto';
  ELSE
    RAISE WARNING '❌ % TEST(S) FALLARON — revisar políticas RLS', v_errores;
  END IF;

  -- ── Cleanup ───────────────────────────────────────────────────────────────────
  DELETE FROM citas WHERE clinica_id IN (v_clinica_a, v_clinica_b);
  DELETE FROM pacientes WHERE clinica_id IN (v_clinica_a, v_clinica_b);
  DELETE FROM clinicas WHERE id IN (v_clinica_a, v_clinica_b);
  RAISE NOTICE '🧹 Cleanup completado';

EXCEPTION WHEN others THEN
  DELETE FROM citas WHERE clinica_id IN (v_clinica_a, v_clinica_b);
  DELETE FROM pacientes WHERE clinica_id IN (v_clinica_a, v_clinica_b);
  DELETE FROM clinicas WHERE id IN (v_clinica_a, v_clinica_b);
  RAISE;
END;
$$;
