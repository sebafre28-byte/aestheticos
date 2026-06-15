# SimpliClinic — Plan de Ejecución: 6.2 → 10/10
> Última actualización: 2026-06-15
> Basado en auditoría investment-grade de 12 dimensiones
> Score inicial: **6.2 / 10** | Score objetivo: **10 / 10**

---

## CÓMO LEER ESTE DOCUMENTO

```
[ ] = pendiente
[~] = en progreso
[x] = completado
```

Cada ítem tiene: descripción, impacto (🔴 crítico / 🟠 alto / 🟡 medio / 🟢 bajo), y estimado de tiempo.

---

## FASE 1 — SEGURIDAD (bloqueador absoluto antes de escalar)
> Estado: 🟡 EN PROGRESO
> Score aporte: +1.5 puntos → llevar a ~7.7

### 🔴 CRÍTICOS (exponen datos de pacientes o rompen aislamiento)

- [x] **SEC-1** — RLS `USING (true)` en `consentimiento_solicitudes` — datos médicos públicos
  - Fix: migración `060_security_rls_fixes.sql` creada
  - **ACCIÓN REQUERIDA**: Aplicar en Supabase SQL Editor
  - _Tiempo: 30 min_

- [x] **SEC-2** — `feedback_citas` INSERT anónimo sin restricción — métricas manipulables
  - Fix: incluido en migración `060_security_rls_fixes.sql`
  - **ACCIÓN REQUERIDA**: Aplicar en Supabase SQL Editor
  - _Tiempo: 15 min_

- [x] **SEC-3** — `/api/inbox/send` sin verificación de ownership — cross-tenant WhatsApp sending
  - Fix: PR #211 — verificación de `clinica_id` antes de enviar
  - **ACCIÓN REQUERIDA**: Mergear PR #211

- [x] **SEC-4** — `/api/flow/subscription-confirm` sin autenticación — activación de planes sin sesión
  - Fix: PR #211 — require sesión + ownership del `clinica_id`
  - **ACCIÓN REQUERIDA**: Mergear PR #211

- [ ] **SEC-5** — `INTERNAL_API_SECRET` en código potencialmente cliente (`lib/agenda/queries.ts`)
  - Risk: si ese código llega a un componente cliente en un refactor, el secret queda en el bundle
  - Fix: mover la llamada a `/api/notificar-cita` a una Server Action o API route interna
  - _Tiempo: 2 horas_

- [ ] **SEC-6** — Cross-tenant en webhook WhatsApp — mensajes pueden asignarse a clínica incorrecta
  - Risk: dos clínicas con el mismo número de paciente → mensajes mezclados
  - Fix: validar `clinica_id` en el upsert de conversaciones en `/api/whatsapp/webhook/route.ts`
  - _Tiempo: 2 horas_

- [ ] **SEC-7** — Double-booking en `reagendar_cita_por_token` — conflict check sin `profesional_id`
  - Fix: migración SQL que corrija el conflict check en función RPC
  - _Tiempo: 1 hora_

### 🟠 ALTOS

- [ ] **SEC-8** — No existe `middleware.ts` — protección de rutas sólo client-side
  - Risk: RSC del dashboard se ejecutan sin verificar sesión
  - Fix: crear `middleware.ts` con verificación server-side (equivale a mover proxy.ts)
  - _Tiempo: 3 horas_

- [ ] **SEC-9** — `/api/stripe/` routes activas sin uso — superficie de ataque y código muerto
  - Fix: eliminar directorio `/app/api/stripe/` completo
  - _Tiempo: 30 min_

- [ ] **SEC-10** — CAPTCHA opcional por env var — booking público sin protección si falta la var
  - Fix: lanzar error en startup si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no está configurada
  - _Tiempo: 30 min_

- [ ] **SEC-11** — Rate limiting sólo en `/api/email` — falta en `/api/flow/checkout` y webhook WhatsApp
  - Fix: aplicar rate limiter existente a endpoints críticos
  - _Tiempo: 1 hora_

### 🟡 MEDIOS

- [ ] **SEC-12** — WhatsApp `access_token` en JSONB en tabla `clinicas` en lugar de Supabase Vault
  - Fix: migrar a tabla separada con RLS estricta o Supabase Vault
  - _Tiempo: 4 horas_

- [ ] **SEC-13** — Sin audit log de acciones administrativas (quién eliminó qué)
  - Fix: tabla `audit_log` con trigger en tablas críticas
  - _Tiempo: 1 día_

- [ ] **SEC-14** — Headers HTTP de seguridad (CSP, X-Frame-Options, HSTS)
  - Fix: agregar en `next.config.js` → `headers()`
  - _Tiempo: 2 horas_

---

## FASE 2 — ARQUITECTURA Y DEUDA TÉCNICA
> Estado: ⬜ PENDIENTE
> Score aporte: +0.8 puntos → llevar a ~8.5

- [ ] **ARQ-1** — Eliminar `/app/api/stripe/` y campos `stripe_*` del schema TypeScript
  - _Tiempo: 1 hora_

- [ ] **ARQ-2** — Crear `middleware.ts` con verificación server-side de sesión
  - Mover lógica de `proxy.ts` a `middleware.ts` (convención Next.js)
  - _Tiempo: 3 horas_

- [ ] **ARQ-3** — Separar `lib/agenda/queries.ts` (~1000 líneas) en módulos
  - `lib/agenda/cache.ts` — cache in-memory y deduplicación inflight
  - `lib/agenda/citas.ts` — CRUD de citas
  - `lib/agenda/profesionales.ts` — queries de profesionales y disponibilidad
  - `lib/agenda/disponibilidad.ts` — slots y conflict checking
  - _Tiempo: 1 día_

- [ ] **ARQ-4** — Auditar y limpiar BullMQ — si no está en uso activo, remover
  - _Tiempo: 2 horas_

- [ ] **ARQ-5** — Agregar `loading.tsx` y `error.tsx` a todas las rutas del dashboard
  - _Tiempo: 3 horas_

- [ ] **ARQ-6** — Refactorizar `app/book/[slug]/page.tsx` (~1256 líneas) en subcomponentes por paso
  - _Tiempo: 1 día_

---

## FASE 3 — BASE DE DATOS Y PERFORMANCE
> Estado: ⬜ PENDIENTE
> Score aporte: +0.5 puntos → llevar a ~9.0

- [ ] **DB-1** — Índices faltantes (migración SQL)
  - `consentimiento_solicitudes(clinica_id)`
  - `whatsapp_logs(clinica_id, created_at)` — crítico para crons
  - `mensajes_inbox(conversacion_id, created_at)`
  - `paquetes_vendidos(paciente_id, servicio_id)`
  - _Tiempo: 1 hora_

- [ ] **DB-2** — Fix conflict check en `reagendar_cita_por_token` (agregar `profesional_id`)
  - Incluir en migración 061
  - _Tiempo: 1 hora_

- [ ] **DB-3** — Migrar cache in-memory de agenda a Upstash Redis (ya instalado)
  - Con invalidación por evento de Supabase Realtime
  - _Tiempo: 1 día_

- [ ] **DB-4** — Agregar cursor-based pagination a todos los queries de crons (evitar timeout serverless)
  - _Tiempo: 3 horas_

- [ ] **DB-5** — Batch la query de tokens Google Calendar (N+1 → 1 query con join)
  - _Tiempo: 2 horas_

- [ ] **DB-6** — `getClinicaId()` con cache server-side para evitar query por request
  - _Tiempo: 2 horas_

---

## FASE 4 — IA Y WHATSAPP
> Estado: ⬜ PENDIENTE
> Score aporte: +0.7 puntos → llevar a ~9.7

- [ ] **IA-1** — Agente WhatsApp async (responder 200 OK a Meta inmediatamente, procesar en background)
  - Implementar con Upstash Queue o BullMQ
  - Elimina riesgo de timeout 20s de Meta
  - _Tiempo: 1 día_

- [ ] **IA-2** — Historial conversacional persistente para el agente
  - Cargar últimos N mensajes de `mensajes_inbox` antes de invocar el agente
  - _Tiempo: 4 horas_

- [ ] **IA-3** — Switch dinámico Sonnet/Opus según complejidad del mensaje
  - Sonnet para casos simples (80%), Opus para razonamiento complejo (20%)
  - Reducción de costo estimada: 60-70%
  - _Tiempo: 4 horas_

- [ ] **IA-4** — Monitor de expiración de token Meta WhatsApp con alerta proactiva
  - Cron diario que verifica expiración y notifica a clínica + superadmin
  - _Tiempo: 3 horas_

- [ ] **IA-5** — Queue para envíos masivos de WhatsApp (crons nocturnos)
  - Evita saturar rate limits de Meta
  - _Tiempo: 4 horas_

---

## FASE 5 — GOOGLE CALENDAR
> Estado: ⬜ PENDIENTE
> Score aporte: +0.2 puntos → llevar a ~9.9

- [ ] **GCal-1** — Fix manejo de timezone (reemplazar regex por ISO 8601 correcto)
  - _Tiempo: 2 horas_

- [ ] **GCal-2** — Sincronización inversa Google Calendar → SimpliClinic
  - Webhook push de GCal que notifica bloqueos de agenda del profesional
  - _Tiempo: 2 días_

- [ ] **GCal-3** — Monitor de expiración de tokens Google Calendar con alerta en UI
  - _Tiempo: 3 horas_

---

## FASE 6 — UX/UI Y PRODUCTO
> Estado: ⬜ PENDIENTE
> Score aporte: +0.1 puntos → llevar a **10.0**

- [ ] **UX-1** — Estado "paciente en sala" en agenda (quick win operacional)
  - _Tiempo: 4 horas_

- [ ] **UX-2** — PWA básico (manifest + service worker para instalar en tablet de recepcionista)
  - _Tiempo: 4 horas_

- [ ] **UX-3** — Export de citas a CSV desde agenda
  - _Tiempo: 2 horas_

- [ ] **UX-4** — Widget de estadísticas diarias en dashboard
  - _Tiempo: 4 horas_

- [ ] **UX-5** — CAPTCHA obligatorio (error de startup si env var falta)
  - _Tiempo: 30 min_

- [ ] **UX-6** — Búsqueda server-side con debounce en listado de pacientes
  - _Tiempo: 3 horas_

---

## MÓDULOS DEL PLAN ORIGINAL (siguen en pie)

> Los módulos de PLAN.md siguen siendo la hoja de ruta de producto.
> Este documento se foca en calidad técnica y seguridad.

| Módulo | Estado |
|--------|--------|
| M13 Cobros y Comisiones | ⬜ Pendiente — SIGUIENTE en PLAN.md |
| M14 Paquetes de Sesiones | ⬜ Pendiente |
| M15 Marketing Automático | ⬜ Pendiente |
| M16 Reducir No-Shows | ⬜ Pendiente |

---

## ESTADO DE SCORE

| Fase | Items | Score estimado |
|------|-------|---------------|
| Inicial (auditoría) | — | **6.2** |
| + Fase 1 Seguridad | 14 items | **7.7** |
| + Fase 2 Arquitectura | 6 items | **8.5** |
| + Fase 3 DB y Performance | 6 items | **9.0** |
| + Fase 4 IA y WhatsApp | 5 items | **9.7** |
| + Fase 5 Google Calendar | 3 items | **9.9** |
| + Fase 6 UX/UI y Producto | 6 items | **10.0** |

---

## ACCIONES INMEDIATAS REQUERIDAS (del usuario)

Estas acciones las debe hacer el usuario — no se pueden automatizar:

1. **Aplicar migración 060** en Supabase SQL Editor:
   - Abrir: https://supabase.com/dashboard → SQL Editor
   - Copiar y ejecutar el contenido de `supabase/migrations/060_security_rls_fixes.sql`

2. **Mergear PR #211** en GitHub:
   - https://github.com/sebafre28-byte/aestheticos/pull/211

3. **Test de cobro real con Flow.cl** (acción manual del usuario)

---

## LOG DE CAMBIOS

| Fecha | Item | Descripción |
|-------|------|-------------|
| 2026-06-15 | SEC-3 | Fix inbox/send ownership check — PR #211 |
| 2026-06-15 | SEC-4 | Fix subscription-confirm auth guard — PR #211 |
| 2026-06-15 | SEC-1 | Migración 060: RLS consentimiento_solicitudes |
| 2026-06-15 | SEC-2 | Migración 060: feedback_citas policy fix |
