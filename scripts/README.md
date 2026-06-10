# scripts/

Scripts de utilidad para SimpliClinic.

---

## test-rls.ts — Validación de políticas RLS

Verifica que el aislamiento entre clínicas (multi-tenant) funcione correctamente en todas las tablas críticas de Supabase.

### Requisitos

- `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`

### Uso

```bash
# Modo dry-run: inspecciona pg_policies via service role key
npx tsx scripts/test-rls.ts

# Modo full: realiza selects reales cross-tenant con dos usuarios de prueba
npx tsx scripts/test-rls.ts --full
```

### Variables para modo --full

Agregar en `.env.local`:

```env
SUPABASE_TEST_USER_A_EMAIL=usuario-a@test.com
SUPABASE_TEST_USER_A_PASS=password-a
SUPABASE_TEST_USER_B_EMAIL=usuario-b@test.com
SUPABASE_TEST_USER_B_PASS=password-b
```

Los dos usuarios deben pertenecer a **clínicas distintas**.

### Tablas validadas

**Críticas** (FAIL si no tienen políticas):
- `pacientes`, `citas`, `servicios`, `clinicas`
- `usuarios_clinica`, `profesionales`, `notas_clinicas`
- `conversaciones`, `mensajes_inbox`, `whatsapp_logs`
- `mensajes_whatsapp`, `bloqueos`, `subscriptions`

**Secundarias** (WARN si no tienen políticas):
- `agenda_disponibilidad`, `agenda_bloqueos`, `agenda_recordatorios`
- `agenda_notification_jobs`, `agenda_audit_log`, `profesional_servicios`

### Exit codes

| Código | Significado |
|--------|-------------|
| `0` | Todo OK — aislamiento correcto |
| `1` | Una o más tablas críticas sin RLS, o leakage detectado en modo --full |

### Fallback

Si no hay conexión a Supabase, el script hace un audit de los archivos en `supabase/migrations/` buscando `ENABLE ROW LEVEL SECURITY` y `CREATE POLICY` por tabla.

---

## whatsapp-worker.ts

Worker BullMQ para procesar recordatorios WhatsApp en background.

```bash
npx tsx scripts/whatsapp-worker.ts
```

Requiere `REDIS_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
