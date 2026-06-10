#!/usr/bin/env node
/**
 * Stress test: 100 reservas simultáneas al mismo slot via Supabase RPC.
 * Verifica que solo 1 cita quede creada (race condition fix).
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   CLINICA_ID=<uuid> \
 *   SERVICIO_ID=<uuid> \
 *   PROFESIONAL_ID=<uuid> \
 *   INICIO="2026-07-01T10:00:00-04:00" \
 *   FIN="2026-07-01T11:00:00-04:00" \
 *   node scripts/stress-test-booking.js
 *
 * Obtén SUPABASE_URL y SUPABASE_ANON_KEY desde Supabase → Project Settings → API.
 * Obtén los UUIDs desde Supabase → Table Editor (tablas: clinicas, servicios, profesionales).
 * IMPORTANTE: Usa un slot futuro que no tenga citas reales, o borra la cita creada después.
 */

const SUPABASE_URL    = process.env.SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_ANON_KEY
const CLINICA_ID      = process.env.CLINICA_ID
const SERVICIO_ID     = process.env.SERVICIO_ID
const PROFESIONAL_ID  = process.env.PROFESIONAL_ID
const INICIO          = process.env.INICIO
const FIN             = process.env.FIN
const CONCURRENCY     = parseInt(process.env.CONCURRENCY ?? '100')

if (!SUPABASE_URL || !SUPABASE_KEY || !CLINICA_ID || !SERVICIO_ID || !PROFESIONAL_ID || !INICIO || !FIN) {
  console.error(`
❌ Faltan variables de entorno. Uso:

  SUPABASE_URL=https://xxx.supabase.co \\
  SUPABASE_ANON_KEY=eyJ... \\
  CLINICA_ID=<uuid> \\
  SERVICIO_ID=<uuid> \\
  PROFESIONAL_ID=<uuid> \\
  INICIO="2026-07-01T10:00:00-04:00" \\
  FIN="2026-07-01T11:00:00-04:00" \\
  node scripts/stress-test-booking.js
`)
  process.exit(1)
}

async function makeBooking(i) {
  const payload = {
    p_clinica_id:        CLINICA_ID,
    p_servicio_id:       SERVICIO_ID,
    p_profesional_id:    PROFESIONAL_ID,
    p_inicio:            INICIO,
    p_fin:               FIN,
    p_paciente_nombre:   `Stress Test ${i}`,
    p_paciente_telefono: `+5690000${String(i).padStart(4, '0')}`,
    p_paciente_email:    `stress${i}@test.com`,
    p_notas:             `stress-test-${i}`,
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/crear_reserva_publica`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    // json es el resultado directo: { ok: true, cita_id: "..." } o { ok: false, error: "..." }
    return { i, ok: json?.ok === true, error: json?.error ?? null, status: res.status }
  } catch (err) {
    return { i, ok: false, error: err.message, status: 0 }
  }
}

async function run() {
  console.log(`\n🚀 Stress test: ${CONCURRENCY} requests simultáneos al mismo slot`)
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Slot: ${INICIO} → ${FIN}\n`)

  const start = Date.now()
  const requests = Array.from({ length: CONCURRENCY }, (_, i) => makeBooking(i + 1))
  const results = await Promise.all(requests)
  const elapsed = Date.now() - start

  const exitosas  = results.filter(r => r.ok)
  const rechazadas = results.filter(r => !r.ok && r.status !== 0)
  const erroresRed = results.filter(r => r.status === 0)

  console.log(`📊 Resultados en ${elapsed}ms:`)
  console.log(`   ✅ Citas creadas (ok: true):   ${exitosas.length}`)
  console.log(`   🚫 Rechazadas (slot ocupado):  ${rechazadas.length}`)
  console.log(`   💥 Errores de red:             ${erroresRed.length}`)

  if (exitosas.length === 1) {
    console.log(`\n✅✅✅ PASS — exactamente 1 cita creada. Race condition bajo control.`)
    console.log(`   cita_id creada: ${results.find(r => r.ok)?.cita_id ?? 'ver en Supabase'}`)
    console.log(`\n⚠️  Recuerda borrar la cita de prueba en Supabase → Table Editor → citas`)
  } else if (exitosas.length === 0) {
    console.log(`\n⚠️  0 citas creadas. Posibles causas:`)
    console.log(`   - El slot ya tiene una cita (elige otro horario)`)
    console.log(`   - Los IDs de clínica/servicio/profesional son incorrectos`)
    console.log(`   - La función crear_reserva_publica no tiene permisos para anon`)
    const muestra = results.slice(0, 3)
    muestra.forEach(r => console.log(`   #${r.i} status=${r.status}: ${r.error}`))
  } else {
    console.log(`\n❌ FAIL — ${exitosas.length} citas duplicadas para el mismo slot.`)
    console.log(`   Race condition activo. Revisar GIST constraint en tabla citas.`)
  }
}

run()
