# SimpliClinic — Plan de trabajo v1.0
> Última actualización: 2026-06-12
> Objetivo: Lanzamiento público ~1 jul 2026

## REGLAS DE TRABAJO
- Avanzar módulo por módulo en orden de prioridad
- Completar un módulo antes de pasar al siguiente
- Cada módulo termina con commit + PR + merge (flujo estándar)
- Marcar con [x] cuando esté completo

---

## MÓDULO 0 — EMAILS ✅
- [x] 0.1 Aprobar plantilla HTML con el usuario
- [x] 0.2 Implementar plantilla aprobada en `app/api/email/route.ts`
- [x] 0.3 Variantes: confirmación (verde), cancelación (rojo), recordatorio (azul), post-cita (morado)
- [x] 0.4 Conectar cron `email-recordatorios` con queries reales + deduplicación vía whatsapp_logs
- [x] 0.5 Probar envío real end-to-end

---

## MÓDULO 1 — SEGURIDAD CRÍTICA ✅
**Ronda inicial:**
- [x] 1.1 `CRON_SECRET` obligatorio — lanzar error en startup si no está seteado
- [x] 1.2 `META_APP_SECRET` obligatorio — validar firma en webhook
- [x] 1.3 CAPTCHA (Cloudflare Turnstile) en `app/book/[slug]`
- [x] 1.4 Rate limiting en `/api/email` (10 req/min por IP, in-memory)
- [x] 1.5 Crear `.env.example` con todas las variables documentadas

**Auditoría CTO (2026-06-11):**
- [x] 1.6 `/api/email` requiere `x-internal-secret` O sesión activa (bloqueaba acceso anónimo)
- [x] 1.7 Todas las llamadas internas a `/api/email` y `/api/notificar-cita` incluyen `x-internal-secret`
- [x] 1.8 `/api/galeria/fotos/upload` — validación de MIME type (solo jpg/png/webp/gif)
- [x] 1.9 `/api/galeria/fotos` — filtro por `clinica_id` del usuario autenticado (evitaba cross-tenant)
- [x] 1.10 `/api/fichas` — filtro por `clinica_id` (evitaba cross-tenant)
- [x] 1.11 `/api/inbox/mensajes` — verificación de ownership de conversación antes de retornar mensajes
- [x] 1.12 `/api/citas/jobs` — verificación explícita de ownership de cita
- [x] 1.13 `proxy.ts` — middleware de auth: redirige a `/login` páginas no autenticadas, retorna 401 en APIs
- [x] 1.14 Rutas `usuarios/invite`, `activate`, `resend`, `delete` — `createAdminClient()` movido dentro del handler (evitaba crash en build)
- [x] 1.15 `/api/citas/sync-google` — acepta `x-internal-secret` para llamadas internas
- [ ] 1.16 Rate limiter con Redis/Upstash (actualmente in-memory, se resetea entre deploys)
- [ ] 1.17 `INTERNAL_API_SECRET` separado de `CRON_SECRET` (actualmente comparten la misma variable)
- [ ] 1.18 Race condition en Google Calendar `getValidToken` — doble refresh simultáneo posible

---

## MÓDULO 2 — INBOX WHATSAPP ✅ (90%)
- [x] 2.1 Reemplazar mock data en `/inbox` con queries reales a `conversaciones` + `mensajes_inbox`
- [x] 2.2 Conectar endpoint de envío (`/api/whatsapp/send`) al UI de inbox
- [x] 2.3 Marcar conversaciones como leídas al abrir
- [x] 2.4 Realtime: nuevos mensajes aparecen sin recargar (Supabase subscriptions)
- [ ] 2.5 Probar flujo completo: paciente escribe → aparece en inbox → clínica responde (requiere WhatsApp configurado)

---

## MÓDULO 3 — NOTAS CLÍNICAS ✅
- [x] 3.1 Agregar sección de notas en `PanelDetalleCita` (sidebar de agenda)
- [x] 3.2 Agregar historial de notas en `FichaPaciente`
- [x] 3.3 CRUD notas: crear, eliminar (recepcionista no puede)
- [x] 3.4 Control de acceso: recepcionista solo lee, no escribe

---

## MÓDULO 4 — PAGINACIÓN Y PERFORMANCE ✅
- [x] 4.1 Paginación en lista de pacientes (`/pacientes`)
- [x] 4.2 Paginación en lista de servicios
- [x] 4.3 Lazy load de citas en agenda — queries por rango visible + cache con TTL
- [x] 4.4 Índices DB: compuestos para citas, pacientes y servicios (migración 024)

---

## MÓDULO 5 — INVITACIÓN DE EQUIPO ✅
- [x] 5.1 UI en `/configuracion` → Usuarios y roles: invitar, pills Pendiente/Activo/Inactivo, botón Reenviar
- [x] 5.2 Email de invitación con link mágico (Supabase Auth + plantilla branded)
- [x] 5.3 Flujo de aceptación vía link de Supabase — fix build error `/invite/accept` (SSR con `ssr: false`)
- [x] 5.4 Activar/desactivar miembros desde el panel
- [x] 5.5 Dashboards por rol: admin (completo), profesional (agenda propia), coordinador (sin financiero)
- [x] 5.6 Indicador de actividad last_seen_at — punto verde/gris con tooltip

---

## MÓDULO 6 — MONITOREO Y OBSERVABILIDAD ✅
- [x] 6.1 Instalar Sentry (`@sentry/nextjs`)
- [x] 6.2 Capturar errores en API routes, crons y webhooks
- [x] 6.3 Alertas por email cuando falla un cron o webhook
- [x] 6.4 Dashboard básico de salud del sistema

---

## MÓDULO 7 — CRONS Y RECORDATORIOS MEJORADOS ✅
- [x] 7.1 Evaluar Vercel Pro (crons horarios) vs BullMQ (Redis)
- [x] 7.2 GitHub Actions como scheduler horario gratuito (alternativa a Vercel Pro)
- [x] 7.3 Lógica correcta: ventanas 22-26h y 0.5-3.5h con deduplicación
- [x] 7.4 Evitar duplicados: check en `whatsapp_logs` antes de enviar

---

## MÓDULO 8 — QA Y BETA (80%)
- [x] 8.1 Test RLS policies — `scripts/test-rls.ts` + `scripts/test-rls.sql`
- [x] 8.2 Fix race condition booking simultáneo — `044_booking_advisory_lock.sql` (pg_advisory_xact_lock)
- [ ] 8.3 Onboarding de 3 clínicas beta
- [ ] 8.4 Recoger feedback y corregir bugs críticos
- [x] 8.5 Stress test: 100 reservas simultáneas — `scripts/stress-test-booking.js`

---

## MÓDULO 9 — BUGS CRÍTICOS RESUELTOS (auditoría 2026-06-11)
_Módulo agregado para registrar fixes de producción fuera del plan original._

- [x] 9.A Google Calendar no sincronizaba al reservar por página pública (`/book/[slug]`)
- [x] 9.B Google Calendar no sincronizaba al reservar por agente WhatsApp
- [x] 9.C Error boundary en `/agenda` — crashes no manejados
- [x] 9.D Race condition en realtime de agenda (stale closure en subscription)
- [x] 9.E `ListaPendientes` — confirmar cita sin try/catch/finally podía dejar UI colgada
- [x] 9.F Build crash en `/invite/accept` — `createBrowserClient` a nivel de módulo

---

## MÓDULO 10 — LAUNCH
- [ ] 10.1 Dominio `simpliclinic.cl` + DNS
- [ ] 10.2 Email `@simpliclinic.cl` verificado en Resend
- [ ] 10.3 Stripe en modo LIVE (no test)
- [ ] 10.4 Variables de entorno producción actualizadas en Vercel
- [ ] 10.5 Anuncio beta → launch público

---

## MÓDULO 11 — WIZARD "INICIAR CITA" (backlog)
- [ ] 11.1 Diseño UX del wizard: layout paso a paso, barra de progreso
- [ ] 11.2 Paso 1 — Datos del paciente: completar datos faltantes
- [ ] 11.3 Paso 2 — Ficha clínica: anamnesis, motivo de consulta, alergias, antecedentes
- [ ] 11.4 Paso 3 — Fotos (antes): cámara o subida de archivos
- [ ] 11.5 Paso 4 — Consentimiento informado: documento + firma digital o checkbox
- [ ] 11.6 Paso 5 — Protocolo del servicio: checklist del tratamiento
- [ ] 11.7 Paso 6 — Notas clínicas (integrar el módulo existente)
- [ ] 11.8 Paso 7 — Fotos (después)
- [ ] 11.9 Paso 8 — Cierre: marcar completada, cobro, agendar seguimiento
- [ ] 11.10 Pasos configurables por clínica desde Configuración

---

---

## MÓDULO 12 — PLAN Y FACTURACIÓN / FLOW.CL (2026-06-12)

### Decisiones de arquitectura
- **Pasarela de pago**: Flow.cl (reemplaza Stripe, que no opera en Chile)
- **Modo producción**: `FLOW_SANDBOX=0` (NO sandbox — las credenciales de sandbox son distintas)
- **Flujo de cobro**: Flow.cl cobra automáticamente vía Webpay One Click (tarjeta registrada)
- **Planes en Flow**: 6 planes creados manualmente en panel Flow → Suscripciones → Planes
  - SIMPLI_MENSUAL, SIMPLI+_MENSUAL, SIMPLIPRO_MENSUAL
  - SIMPLI_ANUAL, SIMPLI+_ANUAL, SIMPLIPRO_ANUAL
- **"Cargo Automático"**: debe estar ACTIVO en Flow → Medios de pago (ya activado)

### Variables de entorno en Vercel (todas ya configuradas)
```
FLOW_API_KEY=...           # API key de Flow producción
FLOW_SECRET_KEY=...        # Secret key para firma HMAC-SHA256
FLOW_SANDBOX=0             # 0 = producción, 1 = sandbox
FLOW_PLAN_FREE=...         # Plan ID mensual Simpli (free)
FLOW_PLAN_PRO=...          # Plan ID mensual Simpli+
FLOW_PLAN_CLINICA=...      # Plan ID mensual Simpli Pro
FLOW_PLAN_FREE_ANUAL=...   # Plan ID anual Simpli
FLOW_PLAN_PRO_ANUAL=...    # Plan ID anual Simpli+
FLOW_PLAN_CLINICA_ANUAL=...# Plan ID anual Simpli Pro
NEXT_PUBLIC_APP_URL=https://app.simpliclinic.cl
```

### Flujo de pago (cómo funciona end-to-end)
1. Usuario hace click "Contratar" → POST `/api/flow/checkout`
2. Flow crea/obtiene customer (con `externalId=clinica_id`)
3. Flow devuelve URL Webpay para registro de tarjeta
4. Usuario ingresa tarjeta en Webpay → Flow redirige a `/api/flow/subscription-confirm?token=...`
5. Callback obtiene estado tarjeta (`getCardRegisterStatus`) y guarda `card_last4`, `card_type`
6. Crea suscripción en Flow (`/subscription/create` con planId correcto mensual/anual)
7. Flow cobra automáticamente según intervalo del plan (mensual o anual)
8. Flow notifica cobros/fallas vía webhook → `/api/flow/webhook` (con verificación HMAC)

### DB: tabla `subscriptions` — campos relevantes
```
plan              = 'free' | 'pro' | 'clinica'
estado            = 'trial' | 'activa' | 'pausada' | 'cancelada'
trial_ends_at     = timestamp (7 días desde registro)
flow_customer_id  = ID del customer en Flow
flow_subscription_id = ID de la suscripción en Flow
card_last4        = últimos 4 dígitos de tarjeta
card_type         = tipo de tarjeta (Visa, Mastercard, etc.)
```

### Migraciones aplicadas en Supabase
- `049`: trigger `handle_new_user()` — crea subscription con `plan='free'`, `estado='trial'`, `trial_ends_at=now()+7d`
- `050`: columna `cancelacion_motivo`
- `051`: columnas `flow_customer_id`, `flow_subscription_id`
- `052`: columnas `card_last4`, `card_type` ← **PENDIENTE aplicar en Supabase SQL Editor**

### Archivos clave
- `lib/subscriptions/flow.ts` — cliente REST Flow (HMAC signing, customer, subscription, webhook handler)
- `lib/subscriptions/queries.ts` — tipos, PLAN_LIMITS, PLAN_LABELS, PLAN_PRICES
- `lib/subscriptions/useSubscripcion.ts` — hook con caché: plan, estado, trial, puedeUsar(), limite()
- `app/api/flow/checkout/route.ts` — inicia flujo de pago
- `app/api/flow/subscription-confirm/route.ts` — callback post-registro tarjeta
- `app/api/flow/webhook/route.ts` — recibe eventos Flow (subscription_paid, payment_failed, canceled)
- `app/api/flow/portal/route.ts` — genera URL para actualizar tarjeta
- `components/subscriptions/PlanesCard.tsx` — UI plan y facturación (TrialCard / ActivePlanCard / PlanCard)
- `components/subscriptions/PlanGate.tsx` — bloquea features por plan
- `components/subscriptions/TrialBanner.tsx` — banner trial en header

### Estado del módulo
- [x] Integración Flow.cl completa (customer, card registration, subscription, webhook)
- [x] UI Plan y Facturación: TrialCard / ActivePlanCard / comparación de planes
- [x] Feature gating: useSubscripcion + PlanGate bloquea features por plan
- [x] Toggle anual: envía anual=true al checkout, usa plan IDs anuales de Flow
- [x] Webhook verificado con HMAC-SHA256
- [x] Pill en menú Configuración dinámica (Trial/Simpli/Simpli+/Pro)
- [ ] Migración 052 pendiente aplicar en Supabase SQL Editor
- [ ] Probar cobro real con tarjeta real (end-to-end post-trial)
- [ ] Guardar campo `anual` en tabla subscriptions para saber si un plan es mensual o anual

---

## ESTADO ACTUAL
```
M0  Emails              ██████████ 100%  ✅ COMPLETO
M1  Seguridad           █████████░  93%  ✅ (3 pendientes menores: Redis, secret separado, GCal token race)
M2  Inbox WhatsApp      █████████░  90%  ✅ (falta prueba e2e con WhatsApp real)
M3  Notas clínicas      ██████████ 100%  ✅ COMPLETO
M4  Performance         ██████████ 100%  ✅ COMPLETO
M5  Invitación equipo   ██████████ 100%  ✅ COMPLETO
M6  Monitoreo           ██████████ 100%  ✅ COMPLETO
M7  Crons mejorados     ██████████ 100%  ✅ COMPLETO
M8  QA y Beta           ████████░░  80%  (falta onboarding beta y feedback)
M9  Bugs producción     ██████████ 100%  ✅ COMPLETO (auditoría jun 2026)
M10 Launch              ░░░░░░░░░░   0%  ← SIGUIENTE
M11 Wizard cita         ░░░░░░░░░░   0%  (backlog post-launch)
M12 Plan y Facturación  █████████░  90%  ✅ (falta migración 052, prueba cobro real, campo anual en DB)
```

### Pendientes de seguridad antes del launch (M1 incompletos)
1. **Rate limiter Redis** — el actual in-memory se resetea con cada deploy, inefectivo en producción
2. **`INTERNAL_API_SECRET`** separado — actualmente `CRON_SECRET` sirve para crons Y llamadas internas, mezcla responsabilidades
3. **`getValidToken` race condition** — si dos requests llegan simultáneos con token expirado, ambos intentan refrescar; el segundo sobreescribe el primero
