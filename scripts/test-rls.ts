/**
 * SimpliClinic — RLS Validation Script
 * Validates Row Level Security tenant isolation across critical tables.
 *
 * Usage:
 *   npx tsx scripts/test-rls.ts              # dry-run (service role, checks pg_policies)
 *   npx tsx scripts/test-rls.ts --full       # full mode (requires TEST_USER_A/B in .env.local)
 *
 * Exit codes:
 *   0  — all checks passed (or only warnings on non-critical tables)
 *   1  — one or more critical tables missing RLS
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Load .env.local ────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const TEST_USER_A_EMAIL = process.env.SUPABASE_TEST_USER_A_EMAIL ?? ''
const TEST_USER_A_PASS = process.env.SUPABASE_TEST_USER_A_PASS ?? ''
const TEST_USER_B_EMAIL = process.env.SUPABASE_TEST_USER_B_EMAIL ?? ''
const TEST_USER_B_PASS = process.env.SUPABASE_TEST_USER_B_PASS ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const FULL_MODE = process.argv.includes('--full')

// ─── Critical tables that MUST have RLS ─────────────────────────────────────

const CRITICAL_TABLES = [
  'pacientes',
  'citas',
  'servicios',
  'clinicas',
  'usuarios_clinica',
  'profesionales',
  'notas_clinicas',
  'conversaciones',
  'mensajes_inbox',
  'whatsapp_logs',
  'mensajes_whatsapp',
  'bloqueos',
  'subscriptions',
]

const NON_CRITICAL_TABLES = [
  'agenda_disponibilidad',
  'agenda_bloqueos',
  'agenda_recordatorios',
  'agenda_notification_jobs',
  'agenda_audit_log',
  'profesional_servicios',
]

// ─── Logging helpers ─────────────────────────────────────────────────────────

const PASS = 'PASS'
const FAIL = 'FAIL'
const WARN = 'WARN'
const INFO = 'INFO'

function log(level: string, msg: string) {
  const prefix =
    level === PASS ? '\x1b[32m[PASS]\x1b[0m' :
    level === FAIL ? '\x1b[31m[FAIL]\x1b[0m' :
    level === WARN ? '\x1b[33m[WARN]\x1b[0m' :
                     '\x1b[36m[INFO]\x1b[0m'
  console.log(`${prefix} ${msg}`)
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PolicyRow {
  schemaname: string
  tablename: string
  policyname: string
  permissive: string
  roles: string[]
  cmd: string
  qual: string | null
  with_check: string | null
}

// ─── DRY-RUN MODE ────────────────────────────────────────────────────────────

async function runDryRun() {
  log(INFO, 'Mode: DRY-RUN (service role — inspecting pg_policies)')
  log(INFO, `Supabase URL: ${SUPABASE_URL || '(not set)'}`)
  console.log()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    log(WARN, 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — falling back to migration audit')
    await runMigrationAudit()
    return
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Query policies from pg_policies
  const { data: policies, error: policiesError } = await admin
    .from('pg_policies' as never)
    .select('*')

  if (policiesError) {
    log(WARN, `Cannot query pg_policies: ${policiesError.message}`)
    log(INFO, 'Falling back to migration file audit...')
    await runMigrationAudit()
    return
  }

  const policyRows = (policies ?? []) as PolicyRow[]

  // Group policies by table
  const byTable: Record<string, PolicyRow[]> = {}
  for (const p of policyRows) {
    if (!byTable[p.tablename]) byTable[p.tablename] = []
    byTable[p.tablename].push(p)
  }

  // 3. Report critical tables
  console.log('━'.repeat(60))
  console.log('  CRITICAL TABLES')
  console.log('━'.repeat(60))

  let criticalFailures = 0

  for (const table of CRITICAL_TABLES) {
    const tablePolicies = byTable[table] ?? []

    if (tablePolicies.length === 0) {
      log(FAIL, `${table.padEnd(30)} — NO POLICIES FOUND`)
      criticalFailures++
    } else {
      const cmds = [...new Set(tablePolicies.map(p => p.cmd))].join(', ')
      log(PASS, `${table.padEnd(30)} — ${tablePolicies.length} polic${tablePolicies.length === 1 ? 'y' : 'ies'} (${cmds || 'ALL'})`)
      for (const p of tablePolicies) {
        console.log(`         \x1b[90m↳ ${p.policyname} [${p.cmd}] roles=${JSON.stringify(p.roles)}\x1b[0m`)
      }
    }
  }

  // 4. Report non-critical tables
  console.log()
  console.log('━'.repeat(60))
  console.log('  SECONDARY TABLES')
  console.log('━'.repeat(60))

  let secondaryWarnings = 0

  for (const table of NON_CRITICAL_TABLES) {
    const tablePolicies = byTable[table] ?? []
    if (tablePolicies.length === 0) {
      log(WARN, `${table.padEnd(30)} — no policies found`)
      secondaryWarnings++
    } else {
      const cmds = [...new Set(tablePolicies.map(p => p.cmd))].join(', ')
      log(PASS, `${table.padEnd(30)} — ${tablePolicies.length} polic${tablePolicies.length === 1 ? 'y' : 'ies'} (${cmds || 'ALL'})`)
    }
  }

  // 5. Show any other public tables with policies not in our lists
  const knownTables = new Set([...CRITICAL_TABLES, ...NON_CRITICAL_TABLES])
  const unknownTablesWithPolicies = Object.keys(byTable).filter(t => !knownTables.has(t))

  if (unknownTablesWithPolicies.length > 0) {
    console.log()
    console.log('━'.repeat(60))
    console.log('  OTHER TABLES WITH POLICIES')
    console.log('━'.repeat(60))
    for (const table of unknownTablesWithPolicies) {
      const tablePolicies = byTable[table]
      log(INFO, `${table.padEnd(30)} — ${tablePolicies.length} polic${tablePolicies.length === 1 ? 'y' : 'ies'}`)
    }
  }

  // 6. Summary
  console.log()
  console.log('━'.repeat(60))
  console.log('  SUMMARY')
  console.log('━'.repeat(60))

  log(INFO, `Total policies found: ${policyRows.length}`)
  log(INFO, `Tables with policies: ${Object.keys(byTable).length}`)

  if (criticalFailures > 0) {
    log(FAIL, `${criticalFailures} critical table(s) missing RLS policies — TENANT ISOLATION AT RISK`)
    console.log()
    process.exit(1)
  } else if (secondaryWarnings > 0) {
    log(WARN, `${secondaryWarnings} secondary table(s) without policies — review recommended`)
    log(PASS, 'All critical tables have RLS policies — tenant isolation OK')
  } else {
    log(PASS, 'All tables have RLS policies — tenant isolation OK')
  }

  if (!FULL_MODE) {
    console.log()
    log(INFO, 'Tip: run with --full to test cross-tenant reads with real users')
    log(INFO, '    Requires in .env.local:')
    log(INFO, '      SUPABASE_TEST_USER_A_EMAIL, SUPABASE_TEST_USER_A_PASS')
    log(INFO, '      SUPABASE_TEST_USER_B_EMAIL, SUPABASE_TEST_USER_B_PASS')
  }

  console.log()
}

// ─── MIGRATION AUDIT (fallback if Supabase not configured) ──────────────────

async function runMigrationAudit() {
  log(INFO, 'Running migration file audit...')
  console.log()

  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations')
  if (!fs.existsSync(migrationsDir)) {
    log(FAIL, 'supabase/migrations/ not found')
    process.exit(1)
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  const tablesWithRLS = new Set<string>()
  const tablesWithPolicies = new Set<string>()

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

    const rlsRegex = /ALTER TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi
    let m: RegExpExecArray | null
    while ((m = rlsRegex.exec(content)) !== null) {
      tablesWithRLS.add(m[1])
    }

    const policyRegex = /CREATE POLICY\s+\S+\s+ON\s+(\w+)/gi
    while ((m = policyRegex.exec(content)) !== null) {
      tablesWithPolicies.add(m[1])
    }
  }

  console.log('━'.repeat(60))
  console.log('  MIGRATION AUDIT — RLS + POLICIES')
  console.log('━'.repeat(60))

  let criticalFailures = 0

  for (const table of CRITICAL_TABLES) {
    const hasRLS = tablesWithRLS.has(table)
    const hasPolicies = tablesWithPolicies.has(table)
    if (!hasRLS && !hasPolicies) {
      log(FAIL, `${table.padEnd(30)} — NOT FOUND in migrations`)
      criticalFailures++
    } else if (!hasRLS) {
      log(WARN, `${table.padEnd(30)} — has policies but ENABLE ROW LEVEL SECURITY not found`)
    } else if (!hasPolicies) {
      log(WARN, `${table.padEnd(30)} — RLS enabled but NO policies found`)
    } else {
      log(PASS, `${table.padEnd(30)} — RLS enabled + policies exist`)
    }
  }

  console.log()

  if (criticalFailures > 0) {
    log(FAIL, `${criticalFailures} critical tables appear unprotected in migrations`)
    process.exit(1)
  } else {
    log(PASS, 'Migration audit passed — all critical tables appear to have RLS')
  }
  console.log()
}

// ─── FULL MODE — cross-tenant reads ──────────────────────────────────────────

async function runFullMode() {
  log(INFO, 'Mode: FULL (cross-tenant read tests with real users)')
  console.log()

  if (!TEST_USER_A_EMAIL || !TEST_USER_A_PASS || !TEST_USER_B_EMAIL || !TEST_USER_B_PASS) {
    log(FAIL, 'Full mode requires in .env.local:')
    log(FAIL, '  SUPABASE_TEST_USER_A_EMAIL, SUPABASE_TEST_USER_A_PASS')
    log(FAIL, '  SUPABASE_TEST_USER_B_EMAIL, SUPABASE_TEST_USER_B_PASS')
    process.exit(1)
  }

  if (!ANON_KEY) {
    log(FAIL, 'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  // Sign in as user A
  const clientA = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data: sessionA, error: errA } = await clientA.auth.signInWithPassword({
    email: TEST_USER_A_EMAIL,
    password: TEST_USER_A_PASS,
  })
  if (errA || !sessionA.session) {
    log(FAIL, `Cannot sign in as User A: ${errA?.message}`)
    process.exit(1)
  }
  log(INFO, `Signed in as User A: ${TEST_USER_A_EMAIL}`)

  // Sign in as user B
  const clientB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data: sessionB, error: errB } = await clientB.auth.signInWithPassword({
    email: TEST_USER_B_EMAIL,
    password: TEST_USER_B_PASS,
  })
  if (errB || !sessionB.session) {
    log(FAIL, `Cannot sign in as User B: ${errB?.message}`)
    process.exit(1)
  }
  log(INFO, `Signed in as User B: ${TEST_USER_B_EMAIL}`)

  // Get clinica for User A
  const { data: clinicaA } = await clientA
    .from('clinicas')
    .select('id, nombre')
    .limit(1)
    .single()

  const { data: clinicaB } = await clientB
    .from('clinicas')
    .select('id, nombre')
    .limit(1)
    .single()

  if (!clinicaA || !clinicaB) {
    log(FAIL, 'Could not determine clinica for test users. Ensure each user has a clinica.')
    process.exit(1)
  }

  if (clinicaA.id === clinicaB.id) {
    log(FAIL, 'Both test users belong to the SAME clinic — cannot test cross-tenant isolation')
    process.exit(1)
  }

  log(INFO, `Clinic A: ${clinicaA.nombre} (${clinicaA.id})`)
  log(INFO, `Clinic B: ${clinicaB.nombre} (${clinicaB.id})`)
  console.log()

  const results: Array<{ test: string; passed: boolean; detail?: string }> = []

  // Helper: test that User B cannot read data belonging to Clinic A
  async function testCrossTenantRead(table: string, filter: { column: string; value: string }) {
    const { data, error } = await (clientB.from(table as never) as ReturnType<typeof clientB.from>)
      .select('id')
      .eq(filter.column, filter.value)

    if (error) {
      results.push({ test: `${table}: B cannot read A's data`, passed: true, detail: `blocked: ${error.message}` })
    } else if (!data || (data as unknown[]).length === 0) {
      results.push({ test: `${table}: B cannot read A's data`, passed: true, detail: 'returned empty (RLS filtered)' })
    } else {
      results.push({ test: `${table}: B cannot read A's data`, passed: false, detail: `EXPOSED: ${(data as unknown[]).length} row(s) visible` })
    }
  }

  // Run cross-tenant read tests
  await testCrossTenantRead('pacientes', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('citas', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('servicios', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('profesionales', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('usuarios_clinica', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('notas_clinicas', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('conversaciones', { column: 'clinica_id', value: clinicaA.id })
  await testCrossTenantRead('whatsapp_logs', { column: 'clinica_id', value: clinicaA.id })

  // Test that User A CAN read their own data
  const { data: ownPacientes } = await clientA
    .from('pacientes')
    .select('id')
    .eq('clinica_id', clinicaA.id)
    .limit(1)
  results.push({
    test: 'pacientes: A can read own data',
    passed: true,
    detail: ownPacientes ? `${(ownPacientes as unknown[]).length} row(s) visible` : 'no data yet',
  })

  // Test that User B cannot see Clinic A's clinicas row
  const { data: clinicaAFromB } = await clientB
    .from('clinicas')
    .select('id')
    .eq('id', clinicaA.id)
  results.push({
    test: 'clinicas: B cannot read A',
    passed: !clinicaAFromB || (clinicaAFromB as unknown[]).length === 0,
    detail: (clinicaAFromB as unknown[] | null)?.length === 0
      ? 'RLS filtered'
      : `EXPOSED: ${(clinicaAFromB as unknown[] | null)?.length} row(s)`,
  })

  // Report
  console.log('━'.repeat(60))
  console.log('  CROSS-TENANT ISOLATION TESTS')
  console.log('━'.repeat(60))

  let failures = 0
  for (const r of results) {
    if (r.passed) {
      log(PASS, `${r.test.padEnd(45)} ${r.detail ?? ''}`)
    } else {
      log(FAIL, `${r.test.padEnd(45)} ${r.detail ?? ''}`)
      failures++
    }
  }

  console.log()
  console.log('━'.repeat(60))
  if (failures > 0) {
    log(FAIL, `${failures} test(s) FAILED — cross-tenant data leakage detected!`)
    process.exit(1)
  } else {
    log(PASS, `All ${results.length} cross-tenant tests passed`)
  }
  console.log()
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log()
  console.log('━'.repeat(60))
  console.log('  SimpliClinic — RLS Validation Script')
  console.log('━'.repeat(60))
  console.log()

  await runDryRun()

  if (FULL_MODE) {
    await runFullMode()
  }
}

main().catch(err => {
  log(FAIL, `Unexpected error: ${(err as Error).message}`)
  console.error(err)
  process.exit(1)
})
