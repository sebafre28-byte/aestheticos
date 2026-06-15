# SimpliClinic — Plan de Ejecución: 6.2 → 10/10
> Última actualización: 2026-06-15 16:38
> Basado en auditoría investment-grade de 12 dimensiones
> Score inicial: **6.2 / 10** | Score actual: **~9.1** | Score objetivo: **10 / 10**

---

## CÓMO LEER ESTE DOCUMENTO

```
[ ] = pendiente
[~] = en progreso
[x] = completado ✅
```

---

## FASE 1 — SEGURIDAD
> Estado: ✅ CASI COMPLETA (12/14 items)
> Score aporte: +1.5

### 🔴 CRÍTICOS — todos completados ✅

- [x] **SEC-1** — RLS `USING (true)` en `consentimiento_solicitudes` → migración 060
- [x] **SEC-2** — `feedback_citas` INSERT anónimo sin restricción → migración 060
- [x] **SEC-3** — `/api/inbox/send` sin ownership check — cross-tenant WhatsApp
- [x] **SEC-4** — `/api/flow/subscription-confirm` sin autenticación
- [x] **SEC-5** — `INTERNAL_API_SECRET` en código potencialmente cliente
- [x] **SEC-6** — Cross-tenant webhook WhatsApp — mensajes mezclados entre clínicas
- [x] **SEC-7** — Double-booking en `reagendar_cita_por_token` → migración 061

### 🟠 ALTOS

- [x] **SEC-8** — Protección de rutas solo client-side → `proxy.ts` activo (Next.js 16)
- [x] **SEC-9** — `/api/stripe/` activas sin uso → eliminadas
- [x] **SEC-10** — CAPTCHA bloquea booking en producción si env var falta
- [x] **SEC-11** — Rate limiting Redis/Upstash activo en producción
- [x] **SEC-14** — Security headers HTTP (X-Frame-Options, X-Content-Type-Options, etc.)

### 🟡 MEDIOS

- [ ] **SEC-12** — WhatsApp `access_token` en JSONB → migrar a tabla separada
- [ ] **SEC-13** — Sin audit log de acciones administrativas

---

## FASE 2 — ARQUITECTURA Y DEUDA TÉCNICA
> Estado: 🟡 EN PROGRESO (2/6 items)

- [x] **ARQ-1** — Eliminar `/api/stripe/` y campos `stripe_*` del schema TypeScript
- [x] **ARQ-2** — `proxy.ts` como middleware server-side (Next.js 16)
- [ ] **ARQ-3** — Separar `lib/agenda/queries.ts` (~1000 líneas) en módulos
- [ ] **ARQ-4** — Auditar y limpiar BullMQ (dependencia sin uso declarado)
- [ ] **ARQ-5** — Agregar `loading.tsx` y `error.tsx` a todas las rutas del dashboard
- [ ] **ARQ-6** — Refactorizar `app/book/[slug]/page.tsx` (~1256 líneas) en subcomponentes

---

## FASE 3 — BASE DE DATOS Y PERFORMANCE
> Estado: 🟡 EN PROGRESO (2/6 items)

- [x] **DB-1** — Índices faltantes → migración 061
- [x] **DB-2** — Fix `reagendar_cita_por_token` con `profesional_id` → migración 061
- [ ] **DB-3** — Cache in-memory de agenda → migrar a Upstash Redis (ya instalado)
- [ ] **DB-4** — Cursor-based pagination en queries de crons (evitar timeout serverless)
- [ ] **DB-5** — N+1 en Google Calendar sync → batch query con join
- [ ] **DB-6** — `getClinicaId()` con cache para evitar query extra por request

---

## FASE 4 — IA Y WHATSAPP
> Estado: 🟡 EN PROGRESO (2/5 items)

- [ ] **IA-1** — Agente WhatsApp async (200 OK a Meta inmediato, procesar en background)
- [x] **IA-2** — Historial conversacional persistente (últimos 30 mensajes)
- [x] **IA-3** — Switch dinámico Sonnet/Opus según complejidad (ahorro 60-70% costo IA)
- [ ] **IA-4** — Monitor de expiración de token Meta WhatsApp
- [ ] **IA-5** — Queue para envíos masivos de WhatsApp (evitar rate limit Meta)

---

## FASE 5 — GOOGLE CALENDAR
> Estado: 🟡 EN PROGRESO (2/3 items)

- [x] **GCal-1** — Fix timezone (reemplazar regex por UTC getters)
- [ ] **GCal-2** — Sync inversa Google → SimpliClinic (bloqueos de agenda)
- [x] **GCal-3** — Alerta en UI cuando token GCal expira

---

## FASE 6 — UX/UI Y PRODUCTO
> Estado: 🟡 EN PROGRESO (1/6 items)

- [x] **UX-1** — Estado "en sala" → migración 062 + botón "Llegó ✓" + punto pulsante verde
- [ ] **UX-2** — PWA básico (instalar en tablet de recepcionista)
- [ ] **UX-3** — Export de citas a CSV
- [ ] **UX-4** — Widget estadísticas diarias en dashboard
- [ ] **UX-5** — CAPTCHA obligatorio si env var falta *(cubierto por SEC-10)*
- [ ] **UX-6** — Búsqueda server-side con debounce en listado de pacientes

---

## MÓDULOS DE PRODUCTO

| Módulo | Estado |
|--------|--------|
| M13 Cobros y Comisiones | ✅ YA IMPLEMENTADO (migración 057, /caja, CajaClient, comisiones por profesional) |
| M14 Paquetes de Sesiones | ✅ YA IMPLEMENTADO (tablas paquetes + paquetes_vendidos, UI en agenda y fichas) |
| M15 Marketing Automático | ⬜ Pendiente |
| M16 Reducir No-Shows | ⬜ Pendiente |

---

## TABLERO DE SCORE

| Fase | Completado | Score |
|------|-----------|-------|
| Inicial | — | 6.2 |
| Fase 1 Seguridad (12/14) | ████████████░░ | ~7.8 |
| Fase 2 Arquitectura (2/6) | ████░░░░░░░░░░ | ~8.0 |
| Fase 3 DB (2/6) | ████░░░░░░░░░░ | ~8.2 |
| Fase 4 IA (2/5) | ██████░░░░░░░░ | ~8.5 |
| Fase 5 GCal (2/3) | ██████████░░░░ | ~8.7 |
| Fase 6 UX (1/6) | ██░░░░░░░░░░░░ | ~8.8 |
| M13+M14 ya implementados | ██████████████ | ~9.1 |
| **OBJETIVO** | | **10.0** |

---

## LO QUE FALTA PARA 10/10

### Impacto alto (mueven el score)
1. **ARQ-3** — Partir `queries.ts` en módulos (mantenibilidad)
2. **ARQ-5** — `loading.tsx` + `error.tsx` en todas las rutas
3. **DB-3** — Cache Redis para agenda (performance)
4. **IA-1** — Agente WhatsApp async (confiabilidad webhooks Meta)
5. **M15** — Marketing automático (cumpleaños + reactivación)
6. **M16** — Lista de espera + señal anti no-show

### Impacto medio
7. **UX-3** — Export CSV de citas
8. **UX-6** — Búsqueda server-side pacientes
9. **DB-5** — Fix N+1 en Google Calendar sync
10. **SEC-12** — Mover WhatsApp token a vault

### Impacto bajo
11. **UX-2** — PWA básico
12. **UX-4** — Widget estadísticas en dashboard
13. **GCal-2** — Sync inversa Google → SimpliClinic
14. **SEC-13** — Audit log admin

---

## LOG DE CAMBIOS

| Fecha | Item | Estado |
|-------|------|--------|
| 2026-06-15 | SEC-1,2 | Migración 060 — RLS consentimientos y feedback_citas ✅ |
| 2026-06-15 | SEC-3 | inbox/send ownership check ✅ |
| 2026-06-15 | SEC-4 | subscription-confirm auth guard ✅ |
| 2026-06-15 | SEC-5 | INTERNAL_API_SECRET nunca en cliente ✅ |
| 2026-06-15 | SEC-6 | WhatsApp webhook scoped por clinica_id ✅ |
| 2026-06-15 | SEC-7,DB-2 | Migración 061 — reagendar_cita conflict check con profesional_id ✅ |
| 2026-06-15 | SEC-8 | proxy.ts activo como middleware server-side ✅ |
| 2026-06-15 | SEC-9 | Eliminados /api/stripe/ y stripe.ts ✅ |
| 2026-06-15 | SEC-10,11 | CAPTCHA + Rate limiting Redis ✅ |
| 2026-06-15 | SEC-14 | Security headers HTTP ✅ |
| 2026-06-15 | ARQ-1 | Campos stripe_* eliminados de TypeScript ✅ |
| 2026-06-15 | DB-1 | Migración 061 — 4 índices faltantes ✅ |
| 2026-06-15 | IA-2,3 | Historial conversacional + switch Sonnet/Opus ✅ |
| 2026-06-15 | GCal-1,3 | Fix timezone + alerta expiración token ✅ |
| 2026-06-15 | UX-1 | Estado "en sala" — migración 062 + visual verde pulsante ✅ |
| 2026-06-15 | M13,M14 | Confirmado ya implementados en codebase ✅ |
