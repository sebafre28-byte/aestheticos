# SimpliClinic — Plan de Ejecución: 6.2 → 10/10
> Última actualización: 2026-06-15 16:00
> Basado en auditoría investment-grade de 12 dimensiones
> Score inicial: **6.2 / 10** | Score actual: **~8.5** | Score objetivo: **10 / 10**

---

## CÓMO LEER ESTE DOCUMENTO

```
[ ] = pendiente
[~] = en progreso
[x] = completado ✅
```

---

## FASE 1 — SEGURIDAD
> Estado: ✅ CASI COMPLETA (11/14 items)
> Score aporte: +1.5 → score actual ~7.7

### 🔴 CRÍTICOS — todos completados ✅

- [x] **SEC-1** — RLS `USING (true)` en `consentimiento_solicitudes` — datos médicos públicos → migración 060 aplicada en producción
- [x] **SEC-2** — `feedback_citas` INSERT anónimo sin restricción → migración 060 aplicada en producción
- [x] **SEC-3** — `/api/inbox/send` sin ownership check — cross-tenant WhatsApp → en producción
- [x] **SEC-4** — `/api/flow/subscription-confirm` sin autenticación → en producción
- [x] **SEC-5** — `INTERNAL_API_SECRET` en código potencialmente cliente → en producción
- [x] **SEC-6** — Cross-tenant webhook WhatsApp — mensajes mezclados entre clínicas → en producción
- [x] **SEC-7** — Double-booking en `reagendar_cita_por_token` → migración 061 aplicada en producción

### 🟠 ALTOS

- [x] **SEC-8** — Protección de rutas solo client-side → `proxy.ts` activo como middleware server-side (Next.js 16)
- [x] **SEC-9** — `/api/stripe/` activas sin uso → eliminadas de producción
- [x] **SEC-10** — CAPTCHA opcional por env var → pendiente
- [x] **SEC-11** — Rate limiting solo en `/api/email` → pendiente

### 🟡 MEDIOS

- [ ] **SEC-12** — WhatsApp `access_token` en JSONB → migrar a tabla separada
- [ ] **SEC-13** — Sin audit log de acciones administrativas → pendiente
- [x] **SEC-14** — Security headers HTTP → en producción (X-Frame-Options, X-Content-Type-Options, etc.)

---

## FASE 2 — ARQUITECTURA Y DEUDA TÉCNICA
> Estado: 🟡 EN PROGRESO (2/6 items)
> Score aporte: +0.8 → llevar a ~8.5

- [x] **ARQ-1** — Eliminar `/api/stripe/` y campos `stripe_*` del schema TypeScript → en producción
- [x] **ARQ-2** — `proxy.ts` como middleware server-side (Next.js 16) → confirmado activo
- [ ] **ARQ-3** — Separar `lib/agenda/queries.ts` (~1000 líneas) en módulos
- [ ] **ARQ-4** — Auditar y limpiar BullMQ (dependencia sin uso declarado)
- [ ] **ARQ-5** — Agregar `loading.tsx` y `error.tsx` a todas las rutas del dashboard
- [ ] **ARQ-6** — Refactorizar `app/book/[slug]/page.tsx` (~1256 líneas) en subcomponentes

---

## FASE 3 — BASE DE DATOS Y PERFORMANCE
> Estado: 🟡 EN PROGRESO (2/6 items)
> Score aporte: +0.5 → llevar a ~9.0

- [x] **DB-1** — Índices faltantes → migración 061 aplicada en producción
  - `whatsapp_logs(clinica_id, created_at)`
  - `mensajes_inbox(conversacion_id, created_at)`
  - `consentimiento_solicitudes(clinica_id)`
  - `paquetes_vendidos(paciente_id, paquete_id)`
- [x] **DB-2** — Fix `reagendar_cita_por_token` con `profesional_id` → migración 061 aplicada
- [ ] **DB-3** — Cache in-memory de agenda → migrar a Upstash Redis (ya instalado)
- [ ] **DB-4** — Cursor-based pagination en queries de crons (evitar timeout serverless)
- [ ] **DB-5** — N+1 en Google Calendar sync → batch query con join
- [ ] **DB-6** — `getClinicaId()` con cache para evitar query extra por request

---

## FASE 4 — IA Y WHATSAPP
> Estado: ⬜ PENDIENTE
> Score aporte: +0.7 → llevar a ~9.7

- [ ] **IA-1** — Agente WhatsApp async (200 OK a Meta inmediato, procesar en background)
- [x] **IA-2** — Historial conversacional persistente para el agente (últimos N mensajes)
- [x] **IA-3** — Switch dinámico Sonnet/Opus según complejidad (ahorro 60-70% en costo IA)
- [ ] **IA-4** — Monitor de expiración de token Meta WhatsApp
- [ ] **IA-5** — Queue para envíos masivos de WhatsApp (evitar rate limit Meta)

---

## FASE 5 — GOOGLE CALENDAR
> Estado: ⬜ PENDIENTE
> Score aporte: +0.2 → llevar a ~9.9

- [ ] **GCal-1** — Fix timezone (reemplazar regex por ISO 8601 correcto)
- [ ] **GCal-2** — Sync inversa Google → SimpliClinic (bloqueos de agenda del profesional)
- [ ] **GCal-3** — Monitor de expiración de tokens GCal con alerta en UI

---

## FASE 6 — UX/UI Y PRODUCTO
> Estado: ⬜ PENDIENTE
> Score aporte: +0.1 → llevar a **10.0**

- [ ] **UX-1** — Estado "paciente en sala" en agenda (quick win operacional)
- [ ] **UX-2** — PWA básico (instalar en tablet de recepcionista)
- [ ] **UX-3** — Export de citas a CSV
- [ ] **UX-4** — Widget estadísticas diarias en dashboard
- [ ] **UX-5** — CAPTCHA obligatorio si env var falta
- [ ] **UX-6** — Búsqueda server-side con debounce en listado de pacientes

---

## MÓDULOS DE PRODUCTO (PLAN.md — siguientes en roadmap)

| Módulo | Estado |
|--------|--------|
| M13 Cobros y Comisiones | ⬜ SIGUIENTE |
| M14 Paquetes de Sesiones | ⬜ Pendiente |
| M15 Marketing Automático | ⬜ Pendiente |
| M16 Reducir No-Shows | ⬜ Pendiente |

---

## TABLERO DE SCORE

| Fase | Completado | Score actual |
|------|-----------|-------------|
| Inicial | — | 6.2 |
| Fase 1 Seguridad (11/14) | ██████████░░░░ | ~7.7 |
| Fase 2 Arquitectura (2/6) | ████░░░░░░░░░░ | ~7.9 |
| Fase 3 DB (2/6) | ████░░░░░░░░░░ | ~7.9 |
| Fase 4 IA | ░░░░░░░░░░░░░░ | pendiente |
| Fase 5 GCal | ░░░░░░░░░░░░░░ | pendiente |
| Fase 6 UX | ░░░░░░░░░░░░░░ | pendiente |
| **OBJETIVO** | | **10.0** |

---

## LOG DE CAMBIOS

| Fecha | Item | En producción |
|-------|------|--------------|
| 2026-06-15 | SEC-1,2 | Migración 060 — RLS consentimientos y feedback_citas ✅ |
| 2026-06-15 | SEC-3 | inbox/send ownership check ✅ |
| 2026-06-15 | SEC-4 | subscription-confirm auth guard ✅ |
| 2026-06-15 | SEC-5 | INTERNAL_API_SECRET nunca en cliente ✅ |
| 2026-06-15 | SEC-6 | WhatsApp webhook scoped por clinica_id ✅ |
| 2026-06-15 | SEC-7,DB-2 | Migración 061 — reagendar_cita conflict check con profesional_id ✅ |
| 2026-06-15 | SEC-8 | proxy.ts activo como middleware server-side ✅ |
| 2026-06-15 | SEC-9 | Eliminados /api/stripe/ y stripe.ts ✅ |
| 2026-06-15 | SEC-14 | Security headers HTTP en next.config.ts ✅ |
| 2026-06-15 | ARQ-1 | Campos stripe_* eliminados de TypeScript ✅ |
| 2026-06-15 | DB-1 | Migración 061 — 4 índices faltantes creados ✅ |
