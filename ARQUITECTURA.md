# SimpliClinic — Arquitectura del sistema
> Última actualización: 2026-06-20
> Este documento es la fuente de verdad para entender cómo está construido el sistema.
> **Actualizar este archivo cada vez que se completa un módulo o se toma una decisión técnica relevante.**

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 16 (App Router, RSC) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Pagos | Flow.cl (Webpay One Click) — NO Stripe (no opera en Chile) |
| Email | Resend |
| WhatsApp | Meta Cloud API |
| Monitoreo | Sentry |
| Deploy | Vercel |
| Scheduler | GitHub Actions (crons gratuitos) |

---

## Dominio y URLs

- **Producción**: `https://app.simpliclinic.cl`
- **Booking público**: `https://app.simpliclinic.cl/book/[slug]`
- **Webhook Flow**: `https://app.simpliclinic.cl/api/flow/webhook`
- **Webhook Meta/WhatsApp**: `https://app.simpliclinic.cl/api/whatsapp/webhook`

---

## Estructura de carpetas relevantes

```
app/
  (dashboard)/          # Rutas autenticadas (agenda, pacientes, configuracion, etc.)
  api/
    flow/               # checkout, subscription-confirm, webhook, portal
    email/              # envío de emails vía Resend
    whatsapp/           # webhook Meta, send, agente IA
    citas/              # sync-google, jobs, etc.
    cron/               # email-recordatorios, cleanup
lib/
  subscriptions/        # queries, useSubscripcion, flow.ts
  onboarding/           # queries de clínica, getClinicaId
  supabase/             # client.ts (browser), server.ts (SSR), admin.ts
  whatsapp/             # agente.ts (IA), mensajes
  google-calendar/      # tokens, sync
components/
  subscriptions/        # PlanesCard, PlanGate, TrialBanner, LimiteAlcanzadoBanner
  agenda/               # AgendaView, PanelDetalleCita
  auth/                 # RolGuard, useAcceso
  layout/               # DashboardShell, proxy.ts (middleware auth)
supabase/
  migrations/           # 035 → 052 aplicadas en producción
```

---

## Multi-tenancy

Cada clínica tiene un `clinica_id` (UUID). Toda la data está aislada por RLS en Supabase.
- `getClinicaId()` → obtiene el clinica_id del usuario autenticado
- Middleware en `proxy.ts` → redirige a `/login` si no hay sesión, retorna 401 en APIs

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin` | Todo (owner de la clínica) |
| `profesional` | Solo su agenda |
| `recepcionista` | Agenda, pacientes, sin reportes financieros ni notas clínicas |
| `coordinador` | Como admin pero sin reportes financieros |

Control en frontend: `useAcceso(seccion)` y `<RolGuard rol="admin">`.
Control en backend: queries filtran por `clinica_id` del usuario autenticado.

---

## Suscripciones y planes

### Planes
| Código | Nombre | Precio mensual | Profesionales | Pacientes |
|--------|--------|---------------|---------------|-----------|
| `free` | Simpli | $29.900 CLP | 1 | 200 |
| `pro` | Simpli+ | $59.900 CLP | 5 | 1.000 |
| `clinica` | Simpli Pro | $99.900 CLP | ilimitados | 5.000 |

Descuento anual: −20% (plan anual separado en Flow)

### Estados de suscripción
- `trial` → 7 días de acceso completo (se crea automáticamente con trigger `handle_new_user`)
- `activa` → plan pagado activo
- `pausada` → pago fallido, acceso bloqueado
- `cancelada` → cancelado por usuario, acceso bloqueado

### Flujo de pago (Flow.cl)
1. POST `/api/flow/checkout` → crea customer en Flow, retorna URL Webpay
2. Usuario registra tarjeta en Webpay
3. GET `/api/flow/subscription-confirm?token=...` → confirma tarjeta, crea suscripción en Flow
4. Flow cobra automáticamente según intervalo del plan
5. Eventos llegan vía webhook POST `/api/flow/webhook` (verificado con HMAC-SHA256)

### Variables de entorno Flow (todas en Vercel)
```
FLOW_API_KEY, FLOW_SECRET_KEY, FLOW_SANDBOX=0
FLOW_PLAN_FREE, FLOW_PLAN_PRO, FLOW_PLAN_CLINICA
FLOW_PLAN_FREE_ANUAL, FLOW_PLAN_PRO_ANUAL, FLOW_PLAN_CLINICA_ANUAL
```

### Feature gating
- `useSubscripcion()` → hook con `puedeUsar(feature)` y `limite(recurso)`
- `<PlanGate feature="whatsapp">` → bloquea con pantalla de upgrade si no tiene acceso
- Durante trial: acceso completo a todo
- Trial vencido / pausada / cancelada: solo features de `free`

---

## Emails (Resend)

Endpoint: POST `/api/email` con `{ tipo, destinatario, datos }`
Tipos implementados: `confirmacion`, `cancelacion`, `recordatorio`, `post_cita`, `pago_fallido`, `suscripcion_cancelada`, `invitacion`
Requiere header `x-internal-secret` (= `CRON_SECRET`) para llamadas internas sin sesión.

---

## WhatsApp (Meta Cloud API)

- Webhook recibe mensajes en `/api/whatsapp/webhook`
- Agente IA responde automáticamente (lib/whatsapp/agente.ts)
- Inbox en `/inbox` muestra conversaciones en tiempo real (Supabase realtime)
- Recordatorios automáticos via GitHub Actions cron

### Estado actual: configuración manual por clínica
Cada clínica que quiere WhatsApp requiere configuración manual asistida:
el admin de SimpliClinic les ayuda a crear la app en Meta Developers,
obtener el token y phone_id, y registrarlo en la DB.
Esto es viable en beta (<10 clínicas) pero no escala.

### Roadmap: WhatsApp auto-gestionable por clínica

**Objetivo:** la clínica conecta su propio número de WhatsApp en 3 clics desde
Configuración → WhatsApp, sin intervención del equipo de SimpliClinic.

**Solución correcta: Meta Embedded Signup**
Meta ofrece un flujo OAuth para plataformas SaaS que permite al usuario
autorizar su número directamente desde la app. SimpliClinic recibe el token
automáticamente y lo guarda por clínica.

Flujo:
1. Clínica: Configuración → WhatsApp → "Conectar mi número"
2. Popup de Facebook → acepta permisos → elige número de WhatsApp Business
3. SimpliClinic recibe `access_token` + `phone_number_id` vía callback
4. Se guardan en tabla `whatsapp_config` por `clinica_id`
5. Recordatorios y agente IA funcionan automáticamente con ese número

Requisito bloqueante: SimpliClinic debe ser aprobada como
**WhatsApp Business Solution Provider (BSP)** por Meta.
Proceso: 2-4 semanas, requiere volumen mínimo de mensajes demostrable.
Referencia: https://developers.facebook.com/docs/whatsapp/embedded-signup

**Alternativa para escala intermedia: BSP externo**
Usar un BSP ya aprobado (360dialog, Twilio, Bird) que ofrecen
multi-tenant out-of-the-box. SimpliClinic actúa como ISV sobre su API.
Más rápido de implementar, añade costo por clínica (~€50-100/mes por número).

**Decisión de implementación:**
- Beta (0-10 clínicas): configuración manual asistida ← estado actual
- Lanzamiento (10-50 clínicas): evaluar BSP externo (360dialog recomendado)
- Escala (50+ clínicas): solicitar BSP status a Meta + Embedded Signup propio

**Nota sobre Crisp WhatsApp plugin:**
Crisp tiene integración con Meta Cloud API pero conecta UN solo número al
inbox de Crisp — es para soporte de SimpliClinic, no para las clínicas.
No es solución multi-tenant.

---

## Google Calendar

- OAuth2 por clínica: tokens en tabla `google_calendar_tokens`
- Sync bidireccional: crear/cancelar cita → sync a Google
- Token refresh automático (riesgo: race condition si dos requests simultáneos)

---

## Crons (GitHub Actions)

- `email-recordatorios`: ventanas 22-26h y 0.5-3.5h antes de la cita
- Deduplicación vía `whatsapp_logs` antes de enviar
- Autenticados con `CRON_SECRET` en header `x-cron-secret`

---

## Seguridad

- RLS en todas las tablas de Supabase
- HMAC-SHA256 en webhooks Flow y Meta
- CAPTCHA Cloudflare Turnstile en booking público
- Rate limiting in-memory en `/api/email` (10 req/min por IP)
- Middleware `proxy.ts` protege todas las rutas autenticadas
- Sentry captura errores en API routes, crons y webhooks

---

## Migraciones Supabase aplicadas

| Migración | Descripción |
|-----------|-------------|
| 035-036 | Galería de fotos y storage policies |
| 038-043 | Fixes críticos RLS, Google Calendar tokens |
| 044 | Booking advisory lock (race condition) |
| 045-048 | Agente WhatsApp, contador conversaciones IA |
| 049 | Trial automático 7 días al registrar clínica |
| 050 | Campo `cancelacion_motivo` en subscriptions |
| 051 | Campos `flow_customer_id`, `flow_subscription_id` |
| 052 | Campos `card_last4`, `card_type` ← **aplicar en Supabase SQL Editor** |

---

## Decisiones técnicas importantes

1. **Flow.cl en producción directa** (no sandbox) — sandbox requiere credenciales distintas
2. **`externalId` requerido** en Flow `/customer/create` — usamos `clinica_id`
3. **Cargo Automático** debe estar ACTIVO en panel Flow → Medios de pago
4. **No Stripe** — Stripe no procesa pagos en Chile
5. **GitHub Actions como scheduler** — alternativa gratuita a Vercel Pro crons (ahora horario: `0 * * * *`)
6. **`createAdminClient()` dentro del handler** — no a nivel de módulo (causa crash en build)
7. **Toggle anual** envía `anual=true` al checkout → usa plan IDs anuales distintos en Flow
8. **`subscription-confirm` lee plan de DB, NO de URL params** — evita billing escalation (fix 2026-06-20)
9. **checkout guarda `plan` + `billing_period` en DB** antes de redirigir a Flow, para que confirm los lea de forma segura
10. **Trial 14 días** (cambiar de 7 a 14) — estándar de mercado, reduce churn por falta de tiempo de evaluación
11. **`auth_clinica_id()` en RLS es un cuello de botella** — hace subquery por cada fila evaluada. A 500+ clínicas necesita reemplazarse por `current_setting('app.clinica_id')` o materialización por sesión. No urgente hoy, crítico a escala.
12. **Migraciones con números duplicados** — el schema no es reproducible desde cero. Auditar antes de escalar el equipo de desarrollo.

---

## Riesgos conocidos y umbrales de acción

| Riesgo | Umbral de acción | Plan |
|--------|-----------------|------|
| `auth_clinica_id()` RLS lento | 500+ clínicas | Reemplazar con `current_setting` |
| Tabla `citas` muy grande | 500K+ filas | Particionar por `clinica_id` |
| Costo IA Anthropic | $200+/mes | Límite por clínica según plan |
| WhatsApp multi-clínica | 10+ clínicas pagando | 360dialog Embedded Signup |
| Migraciones duplicadas | Al escalar equipo | Renumerar y documentar |
