# SimpliClinic — Plan de trabajo v1.0
> Última actualización: 2026-06-02
> Objetivo: Lanzamiento público ~1 jul 2026

## REGLAS DE TRABAJO
- Avanzar módulo por módulo en orden de prioridad
- Completar un módulo antes de pasar al siguiente
- Cada módulo termina con commit + PR + merge (flujo estándar)
- Marcar con [x] cuando esté completo

---

## MÓDULO 0 — EMAILS (EN CURSO)
**Objetivo**: Emails profesionales, funcionales y con diseño aprobado.

- [ ] 0.1 Aprobar plantilla HTML con el usuario
- [ ] 0.2 Implementar plantilla aprobada en `app/api/email/route.ts`
- [ ] 0.3 Variantes: confirmación (verde), cancelación (rojo), recordatorio (azul), post-cita (morado)
- [ ] 0.4 Conectar cron `email-recordatorios` con queries reales (día anterior + mismo día)
- [ ] 0.5 Probar envío real end-to-end

---

## MÓDULO 1 — SEGURIDAD CRÍTICA
**Objetivo**: Cerrar huecos de seguridad antes de tener usuarios reales.

- [ ] 1.1 `CRON_SECRET` obligatorio — lanzar error en startup si no está seteado
- [ ] 1.2 `META_APP_SECRET` obligatorio — validar firma en webhook
- [ ] 1.3 CAPTCHA (hCaptcha o Cloudflare Turnstile) en `app/book/[slug]`
- [ ] 1.4 Rate limiting en `/api/email` y `/book/` (middleware Vercel o Upstash)
- [ ] 1.5 Crear `.env.example` con todas las variables documentadas

---

## MÓDULO 2 — INBOX WHATSAPP
**Objetivo**: El inbox debe mostrar datos reales, no hardcodeados.

- [ ] 2.1 Reemplazar mock data en `/inbox` con queries reales a `conversaciones` + `mensajes_inbox`
- [ ] 2.2 Conectar endpoint de envío (`/api/whatsapp/send`) al UI de inbox
- [ ] 2.3 Marcar conversaciones como leídas al abrir
- [ ] 2.4 Realtime: nuevos mensajes aparecen sin recargar (Supabase subscriptions)
- [ ] 2.5 Probar flujo completo: paciente escribe → aparece en inbox → clínica responde

---

## MÓDULO 3 — NOTAS CLÍNICAS
**Objetivo**: UI para crear y ver notas por cita y por paciente.

- [ ] 3.1 Agregar sección de notas en `PanelDetalleCita` (sidebar de agenda)
- [ ] 3.2 Agregar historial de notas en `FichaPaciente`
- [ ] 3.3 CRUD notas: crear, editar, eliminar (solo el profesional que la escribió)
- [ ] 3.4 Control de acceso: recepcionista solo lee, no escribe

---

## MÓDULO 4 — PAGINACIÓN Y PERFORMANCE
**Objetivo**: La app no se rompe con 1000+ pacientes/servicios/citas.

- [ ] 4.1 Paginación cursor-based en lista de pacientes (`/pacientes`)
- [ ] 4.2 Paginación en lista de servicios
- [ ] 4.3 Lazy load de citas en agenda (solo cargar ventana visible)
- [ ] 4.4 Índices DB: revisar queries lentas con `EXPLAIN ANALYZE`

---

## MÓDULO 5 — INVITACIÓN DE EQUIPO
**Objetivo**: El flujo de invitar miembros al equipo funciona end-to-end.

- [ ] 5.1 UI en `/configuracion?tab=equipo` para generar links de invitación
- [ ] 5.2 Email de invitación con link mágico
- [ ] 5.3 Página de aceptación de invitación (`/invite/[token]`)
- [ ] 5.4 Activar/desactivar miembros desde el panel

---

## MÓDULO 6 — MONITOREO Y OBSERVABILIDAD
**Objetivo**: Saber en producción qué falla, cuándo y por qué.

- [ ] 6.1 Instalar Sentry (`@sentry/nextjs`)
- [ ] 6.2 Capturar errores en API routes, crons y webhooks
- [ ] 6.3 Alertas por email cuando falla un cron o webhook
- [ ] 6.4 Dashboard básico de salud del sistema

---

## MÓDULO 7 — CRONS Y RECORDATORIOS MEJORADOS
**Objetivo**: Recordatorios WhatsApp/email llegan en el momento correcto.

- [ ] 7.1 Evaluar Vercel Pro (crons horarios) vs BullMQ (Redis)
- [ ] 7.2 Si BullMQ: deployar Redis (Upstash) + worker
- [ ] 7.3 Si Vercel Pro: actualizar `vercel.json` a `0 * * * *` (cada hora)
- [ ] 7.4 Lógica correcta: ventana 24h ± 30min y 2h ± 15min
- [ ] 7.5 Evitar duplicados: check en `whatsapp_logs` antes de enviar

---

## MÓDULO 8 — QA Y BETA
**Objetivo**: 3–5 clínicas reales prueban el sistema 1 semana antes del launch.

- [ ] 8.1 Test RLS policies (script Supabase que valida aislamiento entre tenants)
- [ ] 8.2 Fix race condition booking simultáneo (transaction lock)
- [ ] 8.3 Onboarding de 3 clínicas beta
- [ ] 8.4 Recoger feedback y corregir bugs críticos
- [ ] 8.5 Stress test: 100 reservas simultáneas en booking público

---

## MÓDULO 9 — LAUNCH
- [ ] 9.1 Dominio `simpliclinic.cl` + DNS
- [ ] 9.2 Email `@simpliclinic.cl` verificado en Resend
- [ ] 9.3 Stripe en modo LIVE (no test)
- [ ] 9.4 Variables de entorno producción actualizadas en Vercel
- [ ] 9.5 Anuncio beta → launch público

---

## ESTADO ACTUAL
```
M0 Emails            ████████░░  80%  (falta aprobar diseño + cron)
M1 Seguridad         ██░░░░░░░░  20%  (solo vercel.json fix hecho)
M2 Inbox WhatsApp    ████░░░░░░  40%  (tablas OK, UI mock)
M3 Notas clínicas    ██░░░░░░░░  20%  (solo tabla en BD)
M4 Performance       ░░░░░░░░░░   0%
M5 Invitación equipo ████░░░░░░  40%  (API existe, sin UI)
M6 Monitoreo         ░░░░░░░░░░   0%
M7 Crons mejorados   ████░░░░░░  40%  (estructura existe, timing malo)
M8 QA y Beta         ░░░░░░░░░░   0%
M9 Launch            ░░░░░░░░░░   0%
```
