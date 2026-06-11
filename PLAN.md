# SimpliClinic — Plan de trabajo v1.0
> Última actualización: 2026-06-11
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
```

### Pendientes de seguridad antes del launch (M1 incompletos)
1. **Rate limiter Redis** — el actual in-memory se resetea con cada deploy, inefectivo en producción
2. **`INTERNAL_API_SECRET`** separado — actualmente `CRON_SECRET` sirve para crons Y llamadas internas, mezcla responsabilidades
3. **`getValidToken` race condition** — si dos requests llegan simultáneos con token expirado, ambos intentan refrescar; el segundo sobreescribe el primero
