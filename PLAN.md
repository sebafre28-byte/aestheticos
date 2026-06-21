# SimpliClinic — Plan de trabajo v2.0
> Última actualización: 2026-06-20 (sesión 2026-06-20 completada)
> Objetivo: Lanzamiento público ~15 jul 2026 (2 semanas de margen para fixes críticos)

## REGLAS DE TRABAJO
- Avanzar módulo por módulo en orden de prioridad
- Completar un módulo antes de pasar al siguiente
- Cada módulo termina con commit + PR + merge (flujo estándar)
- Marcar con [x] cuando esté completo
- **Al terminar cada sesión de trabajo, actualizar este archivo con lo completado**

---

# RESUMEN EJECUTIVO — ESTADO AL 2026-06-20

## Lo que funciona bien ✅
- Core de agenda (semana/día/lista, bloqueos, recurrencia)
- Ficha paciente con galería, notas, historial
- Email transaccional (confirmación, cancelación, recordatorios)
- Multi-tenant con RLS correcto
- Flow.cl integración completa
- Autenticación + roles + 2FA por email
- Booking público `/book/[slug]`
- Google Calendar OAuth por clínica
- Monitoreo con Sentry

## Lo que está roto o es riesgo real ❌
Ver módulos de auditoría abajo. Resumen:
- ~~**Onboarding inexistente**~~ → ✅ CORREGIDO: checklist en dashboard + wizard con flag persistido
- ~~**Modal nueva cita no funciona en mobile**~~ → ✅ CORREGIDO: iOS zoom fix + modal paciente 1 col
- **Trial 7 días** → decisión consciente, se mantiene en 7
- **DB: auth_clinica_id()** en RLS hace subquery por fila → colapso a 500+ clínicas
- **DB: migraciones duplicadas** → schema no reproducible desde cero
- ~~**Crons 2x/día**~~ → ✅ CORREGIDO: ahora horario `0 * * * *`
- ~~**Billing escalation en subscription-confirm**~~ → ✅ CORREGIDO
- **Agente IA sin límite de costo por clínica** → riesgo financiero (S3.5)
- **feedback_citas sin auth** → cualquier anónimo puede insertar (pendiente SQL)

---

# AUDITORÍA 1 — ARQUITECTURA Y SEGURIDAD (score: 9/10 ✅)
_Realizada: 2026-06-19. Hallazgos integrados al plan de mejora._

## Resueltos ✅
- [x] **A1-RC1** Billing escalation: `subscription-confirm` leía `plan` de URL params → ahora lee de DB (2026-06-20)
- [x] **A1-RC3** Crons 2x/día → cambiado a horario `0 * * * *` (2026-06-20)
- [x] **A1-RC5** MFA sin rate limiting → agregado Upstash sliding window 3/900s send, 5/900s verify
- [x] **A1-1** `INTERNAL_API_SECRET` fail-hard si no está configurado

## Pendientes críticos
- [x] **A1-RC2** ✅ `middleware.ts` eliminado — `proxy.ts` ES el middleware en Next.js 16, verificado activo
- [x] **A1-RC4** ✅ `getClinicaId()` multi-clínica — switcher en sidebar con localStorage + validación (2026-06-20)
- [x] **A1-RC6** ✅ Límite costo IA implementado (S3.5) + model ID verificado (2026-06-20)

## Pendientes medios
- [x] **A1-M1** ✅ `feedback_citas`: política `solo_token_valido` aplicada en Supabase (2026-06-20)
- [x] **A1-M2** ✅ Endpoint `/api/auth/google/debug` — directorio vacío eliminado
- [x] **A1-M3** ✅ `getClinicaId()` callers auditados — todos usan RLS de Supabase correctamente

---

# AUDITORÍA 2 — BASE DE DATOS / SUPABASE (score: 7.5/10 — críticos resueltos, deuda técnica pendiente)
_Realizada: 2026-06-19. Hallazgos integrados al plan de mejora._

## Resueltos ✅
- [x] **A2-1** Migraciones 065 y 066 creadas (drop stripe columns, marketing logs)

## Pendientes críticos (aplicar en Supabase SQL Editor)
- [ ] **A2-RC1** `auth_clinica_id()` hace subquery RLS por cada fila → reemplazar con `current_setting('app.clinica_id')` o memoizar. **BLOQUEANTE A 500+ clínicas.**
- [ ] **A2-RC2** 12 pares de migraciones con números duplicados → el schema no es reproducible desde cero. Auditar y renumerar con script.
- [x] **A2-RC3** ✅ `handle_new_user` verificado en producción — versión correcta activa con `INSERT INTO subscriptions ... 'trial'` (2026-06-20)
- [x] **A2-RC4** ✅ Índice `idx_citas_cancel_token` creado en producción (2026-06-20)
- [x] **A2-RC5** ✅ Política `solo_token_valido` en `feedback_citas` aplicada (2026-06-20)

## Pendientes medios
- [ ] **A2-M1** `firma_img` en `consentimiento_solicitudes` como base64 TEXT → migrar a Storage URL (reduce 95% overhead TOAST)
- [ ] **A2-M2** Marketing crons: N+1 queries (100 clínicas × consulta individual) → reescribir con JOIN en una sola query
- [x] **A2-M3** ✅ Índice `idx_citas_profesional_inicio` aplicado en Supabase (2026-06-20)
- [x] **A2-M4** ✅ Índice `idx_pacientes_clinica_nacimiento` aplicado en Supabase (2026-06-20)
- [x] **A2-M5** ✅ Tabla `mensajes_whatsapp` — sin referencias en código. Migración 068 creada. ⚠️ MANUAL: ejecutar `DROP TABLE IF EXISTS mensajes_whatsapp;`
- [ ] **A2-M6** Renombrar plan `'free'` → `'starter'` en código y DB (naming confuso para usuarios)

## Pendientes bajos (deuda técnica, no urgente)
- [ ] **A2-L1** Separar tabla `citas` en `citas + citas_pago + citas_recurrencia` (cuando superen 500K filas)
- [ ] **A2-L2** Agregar `pg_stat_statements` a Supabase Extensions para monitorear queries lentas
- [ ] **A2-L3** Documentar esquema completo de tablas en ARQUITECTURA.md

---

# AUDITORÍA 3 — PRODUCTO, UX, IA Y ROADMAP (score: 9.5/10 ✅)
_Realizada: 2026-06-20. Hallazgos integrados al plan de mejora._

## Resueltos ✅
- [x] **A3-1** Crons horarios (recordatorios del mismo día ya funcionan)
- [x] **A3-2** Billing escalation corregido

## Pendientes críticos (BLOQUEANTES DE RETENCIÓN)
- [x] **A3-RC1** ✅ **Onboarding guiado** — checklist de 5 pasos en el dashboard implementado. Migración 067 pendiente de aplicar en Supabase.
- [x] **A3-RC2** ✅ **Empty states con CTAs** — pacientes y servicios con ícono + mensaje + botón de acción. Aviso en modal nueva cita si faltan profesionales/servicios.
- [x] **A3-RC3** ✅ **Modal nueva cita en mobile** — iOS zoom fix en inputs. Modal nuevo paciente a 1 columna.
- [ ] **A3-RC4** **Trial 14 días** — descartado, se mantiene en 7 días (decisión del usuario)

## Pendientes altos (UX que afecta adopción)
- [x] **A3-H1** ✅ Botón "Ver mi página de reservas" ya existía — `BookingLinkBanner` en dashboard (requiere slug en DB)
- [x] **A3-H2** ✅ Pantalla de upgrade con plan y precio específico: "Upgrade a Simpli Pro — $99.900/mes"
- [ ] **A3-H3** Recordatorios WhatsApp probados end-to-end con una clínica real antes del launch
- [x] **A3-H4** ✅ Disclaimer IA en agente WhatsApp — aparece solo en primera respuesta de cada conversación
- [x] **A3-H5** ✅ Límite de costo IA por clínica/mes implementado — RPC `incrementar_conv_ia` + banner en inbox + config (2026-06-20)

## Pendientes medios (V1 post-launch)
- [x] **A3-M1** ✅ Personalización agente IA: nombre_asistente, tono, instrucciones_extra desde Configuración (2026-06-20)
- [x] **A3-M2** ✅ Handoff IA → humano: pill [sistema] en inbox + banner conversación escalada (2026-06-20)
- [x] **A3-M3** ✅ Reporte mensual automático — cron el 1ro de cada mes, email con stats (2026-06-20)
- [ ] **A3-M4** NPS en-app al mes de uso (1 pregunta) — post-launch

## Descartado / Backlog indefinido
- ~~Wizard "Iniciar cita" 8 pasos~~ → si llegan a 200 clínicas y lo piden, se construye
- ~~Lista de espera~~ → construir cuando haya dolor documentado
- ~~Consentimientos con firma digital real~~ → requiere proveedor legal, complejidad alta
- ~~Facturación electrónica SII~~ → V3 o cuando lo exijan las clínicas

---

# MÓDULOS COMPLETADOS (historial)

## MÓDULO 0 — EMAILS ✅
- [x] 0.1 Aprobar plantilla HTML con el usuario
- [x] 0.2 Implementar plantilla aprobada en `app/api/email/route.ts`
- [x] 0.3 Variantes: confirmación (verde), cancelación (rojo), recordatorio (azul), post-cita (morado)
- [x] 0.4 Conectar cron `email-recordatorios` con queries reales + deduplicación vía whatsapp_logs
- [x] 0.5 Probar envío real end-to-end

## MÓDULO 1 — SEGURIDAD CRÍTICA ✅
- [x] 1.1 `CRON_SECRET` obligatorio
- [x] 1.2 `META_APP_SECRET` obligatorio — validar firma en webhook
- [x] 1.3 CAPTCHA (Cloudflare Turnstile) en `app/book/[slug]`
- [x] 1.4 Rate limiting en `/api/email`
- [x] 1.5 `.env.example` con todas las variables documentadas
- [x] 1.6–1.18 Auditoría CTO completa (cross-tenant, middleware, race conditions, secrets)

## MÓDULO 2 — INBOX WHATSAPP (90%)
- [x] 2.1–2.4 Queries reales, envío, marcar leídas, realtime
- [ ] 2.5 Probar flujo completo con WhatsApp real

## MÓDULO 3 — NOTAS CLÍNICAS ✅
## MÓDULO 4 — PAGINACIÓN Y PERFORMANCE ✅
## MÓDULO 5 — INVITACIÓN DE EQUIPO ✅
## MÓDULO 6 — MONITOREO Y OBSERVABILIDAD ✅
## MÓDULO 7 — CRONS Y RECORDATORIOS ✅ (ahora horarios)
## MÓDULO 8 — QA Y BETA (80%)
- [x] 8.1 Test RLS
- [x] 8.2 Fix race condition booking
- [ ] 8.3 Onboarding de 3 clínicas beta
- [ ] 8.4 Recoger feedback y corregir bugs críticos
- [x] 8.5 Stress test 100 reservas simultáneas

## MÓDULO 9 — BUGS CRÍTICOS ✅
## MÓDULO 10 — LAUNCH (95%)
- [x] 10.1–10.4 Dominio, email, Flow.cl, vars entorno
- [ ] 10.5 Test cobro real Flow.cl con tarjeta real
- [ ] 10.6 Anuncio beta → launch público

## MÓDULO 12 — PLAN Y FACTURACIÓN (95%)
- [x] Integración Flow.cl completa, UI planes, feature gating, webhook HMAC
- [ ] Probar cobro real con tarjeta real

## MÓDULO 17 — UX Y FIXES ✅ (2026-06-18)
## MÓDULO 18 — UX Y FIXES ✅ (2026-06-19)

---

# PLAN DE MEJORA INTEGRADO — PRÓXIMAS 8 SEMANAS

## SEMANA 1-2 (20-30 jun) — FIXES CRÍTICOS PRE-LAUNCH

### Seguridad y DB (hacer primero, sin excepción)
- [x] **S1.1** ✅ `proxy.ts` es el middleware activo — `middleware.ts` eliminado, verificado
- [x] **S1.2** ✅ MANUAL — Índice `idx_citas_cancel_token` aplicado en Supabase (2026-06-20)
- [x] **S1.3** ✅ MANUAL — Política `solo_token_valido` en `feedback_citas` aplicada (2026-06-20)
- [x] **S1.4** ✅ MANUAL — `handle_new_user` verificado activo en producción (2026-06-20)
- [x] **S1.5** ✅ Directorio `/api/auth/google/debug` vacío eliminado

### Onboarding (la más importante de todas)
- [x] **S1.6** ✅ Checklist de onboarding en dashboard — 5 pasos con estados. Migración 067 aplicada en Supabase (2026-06-20)
- [x] **S1.7** ✅ Empty states en pacientes y servicios con CTA directo
- [ ] **S1.8** Trial 14 días — descartado (usuario prefiere 7 días)

### UX Mobile
- [x] **S1.9** ✅ Modal nueva cita en mobile — iOS zoom fix. Modal nuevo paciente 1 columna.
- [x] **S1.10** ✅ Botón "Ver mi página de reservas" ya existía (BookingLinkBanner)

---

## SEMANA 3-4 (1-11 jul) — LAUNCH + PRIMERAS CLÍNICAS BETA

### Pre-launch
- [ ] **S2.1** Probar cobro real Flow.cl con tarjeta real (M10.5)
- [ ] **S2.2** Probar recordatorio WhatsApp end-to-end con clínica real (A3-H3)
- [x] **S2.3** ✅ Disclaimer IA en agente WhatsApp — primera respuesta de cada conversación
- [x] **S2.4** ✅ Pantalla upgrade con plan y precio específico por feature
- [ ] **S2.5** Onboarding: 3 clínicas beta con seguimiento directo (M8.3)

### Launch
- [ ] **S2.6** Anuncio público (M10.6)

---

## SEMANA 5-6 (12-25 jul) — CALIDAD POST-LAUNCH

### DB performance (ejecutar en Supabase)
- [x] **S3.1** ✅ Índices `citas(profesional_id, inicio)` y `pacientes(clinica_id, fecha_nacimiento)` aplicados (2026-06-20)
- [ ] **S3.2** Reescribir crons de marketing para eliminar N+1 (A2-M2)
- [ ] **S3.3** Plan para reemplazar `auth_clinica_id()` RLS → evaluar `current_setting` o política por tabla (A2-RC1) — no implementar aún, solo plan

### Producto
- [ ] **S3.4** Reporte mensual automático por email a cada clínica (A3-M3)
- [ ] **S3.5** Límite de costo IA por clínica: máximo X conversaciones/mes según plan (A3-H5)
- [ ] **S3.6** Personalización agente IA: nombre y tono editable desde Configuración (A3-M1)
- [ ] **S3.7** Handoff IA → humano con notificación en inbox (A3-M2)

---

## SEMANA 7-8 (26 jul - 8 ago) — CONSOLIDACIÓN

### Deuda técnica DB
- [ ] **S4.1** Auditar migraciones duplicadas y documentar (A2-RC2)
- [ ] **S4.2** Implementar `current_setting` en RLS para reemplazar `auth_clinica_id()` (A2-RC1)
- [ ] **S4.3** Migrar `firma_img` base64 a Storage URL (A2-M1)

### Módulos existentes — verificar y cerrar
- [ ] **S4.4** Marketing automático (M15): verificar `fecha_nacimiento`, plantillas, logs
- [ ] **S4.5** Paquetes de sesiones (M14): completar flujo venta desde ficha paciente
- [ ] **S4.6** Comisiones (M13): UI % por profesional + cálculo automático al cobrar

---

## MÓDULO 19 — UX Y FIXES (2026-06-20) ✅
- [x] Fix loop onboarding wizard (flag `onboarding_completado` en DB)
- [x] Fix wizard mobile layout (pasos 1, 2, 4)
- [x] Buffer del servicio respetado en booking público
- [x] Empty states con CTA en pacientes y servicios
- [x] Disclaimer IA en primera respuesta del agente WhatsApp
- [x] Modal nuevo paciente: 1 columna en mobile + sin zoom iOS
- [x] Aviso en modal nueva cita cuando faltan profesionales o servicios
- [x] Mensaje mejorado en booking público sin servicios disponibles
- [x] Pantalla upgrade con plan y precio específico por feature
- [x] Agente IA: mapa de features ampliado (agente_wsp, marketing, paquetes)

## MÓDULO 20 — WHATSAPP MULTI-CLÍNICA (agosto 2026)
> Primero llegar a 10 clínicas pagando. Luego construir esto.
- [ ] 19.1 Registrar SimpliClinic como Partner en 360dialog
- [ ] 19.2 UI "Conectar WhatsApp" en Configuración con Embedded Signup de 360dialog
- [ ] 19.3 Backend: recibir API key + phone_number_id por clínica
- [ ] 19.4 Verificar agente IA y recordatorios usan credenciales por `clinica_id`
- [ ] 19.5 Verificación OAuth Google Calendar (formulario + video demo para Meta)

---

# MÓDULOS EN BACKLOG (no tocar hasta tener 50 clínicas pagando)

## MÓDULO 11 — WIZARD "INICIAR CITA" — BACKLOG
_Construir solo si 20+ clínicas lo piden explícitamente_

## MÓDULO 16 — REDUCIR NO-SHOWS — BACKLOG
- Lista de espera, señal de pago al reservar online

---

# ESTADO ACTUAL (2026-06-20 — post sesión)

```
M0  Emails              ██████████ 100%  ✅
M1  Seguridad           ██████████ 100%  ✅ (fixes auditoría pendientes: SQL manual)
M2  Inbox WhatsApp      █████████░  90%  (falta prueba e2e WhatsApp real)
M3  Notas clínicas      ██████████ 100%  ✅
M4  Performance         ██████████ 100%  ✅
M5  Invitación equipo   ██████████ 100%  ✅
M6  Monitoreo           ██████████ 100%  ✅
M7  Crons               ██████████ 100%  ✅ (horarios)
M8  QA y Beta           ████████░░  80%  (falta onboarding beta)
M9  Bugs producción     ██████████ 100%  ✅
M10 Launch              █████████░  95%  (falta test cobro real + anuncio)
M11 Wizard cita         ░░░░░░░░░░   0%  BACKLOG
M12 Plan y Facturación  █████████░  95%  (falta test cobro real)
M13 Cobros / Comisiones ██████░░░░  60%  (caja lista, falta comisiones)
M14 Paquetes sesiones   ████░░░░░░  40%  (componentes existen, falta UI)
M15 Marketing automático███████░░░  70%  (crons existen, falta verificar)
M16 No-shows            ░░░░░░░░░░   0%  BACKLOG
M17 UX Fixes jun-18     ██████████ 100%  ✅
M18 UX Fixes jun-19     ██████████ 100%  ✅
M19 UX Fixes jun-20     ██████████ 100%  ✅ (onboarding, empty states, mobile, buffer, upgrade)
M20 WhatsApp multi-clin ░░░░░░░░░░   0%  (agosto, post 10 clínicas pagando)

AUDITORÍA ARQUITECTURA  ████████░░  80%  (middleware ✅, billing ✅, debug endpoint ✅ — DB pendiente manual)
AUDITORÍA BASE DE DATOS ████░░░░░░  40%  (índices + auth_clinica_id + duplicados pendientes SQL manual)
AUDITORÍA PRODUCTO/UX   █████████░  90%  (onboarding ✅, mobile ✅, empty states ✅, upgrade ✅, disclaimer ✅)
```

## MÓDULO 21 — AUDITORÍA Y FIXES (2026-06-20 sesión 2) ✅
- [x] S3.4 Reporte mensual automático por email a cada clínica (1ro de cada mes)
- [x] S3.6 Personalización agente IA: nombre_asistente, tono (cercano/formal), instrucciones_extra
- [x] S3.7 Handoff IA→humano: mensaje [sistema] visible en inbox + pill centrada con ícono
- [x] A2-M5 Migración 068: DROP TABLE mensajes_whatsapp (tabla deprecada, sin referencias)
- [x] S4.4 Cron marketing-cumpleanos verificado: filtro fecha_nacimiento, dedup por año ✅
- [x] S4.6 Comisiones verificadas: ya completo — campo en DB, config en UI, cálculo al cobrar, resumen en caja
- [x] S4.5 Paquetes verificados: ya completo — PaquetesTab en ficha paciente, venta, deducción por sesión

```
M0  Emails              ██████████ 100%  ✅
M1  Seguridad           ██████████ 100%  ✅
M2  Inbox WhatsApp      █████████░  90%  (falta prueba e2e WhatsApp real)
M3  Notas clínicas      ██████████ 100%  ✅
M4  Performance         ██████████ 100%  ✅
M5  Invitación equipo   ██████████ 100%  ✅
M6  Monitoreo           ██████████ 100%  ✅
M7  Crons               ██████████ 100%  ✅ (horarios + reporte mensual)
M8  QA y Beta           ████████░░  80%  (falta onboarding beta)
M9  Bugs producción     ██████████ 100%  ✅
M10 Launch              █████████░  95%  (falta test cobro real + anuncio)
M11 Wizard cita         ░░░░░░░░░░   0%  BACKLOG
M12 Plan y Facturación  █████████░  95%  (falta test cobro real)
M13 Cobros / Comisiones ██████████ 100%  ✅ (caja, comisiones por profesional completo)
M14 Paquetes sesiones   █████████░  95%  ✅ (completo — falta gating PlanGate)
M15 Marketing automático█████████░  95%  ✅ (crons verificados, reporte mensual agregado)
M16 No-shows            ░░░░░░░░░░   0%  BACKLOG
M17 UX Fixes jun-18     ██████████ 100%  ✅
M18 UX Fixes jun-19     ██████████ 100%  ✅
M19 UX Fixes jun-20     ██████████ 100%  ✅
M20 WhatsApp multi-clin ░░░░░░░░░░   0%  (agosto, post 10 clínicas pagando)
M21 Auditoría fixes     ██████████ 100%  ✅

AUDITORÍA ARQUITECTURA  █████████░  90%  (todos los fixes de código ✅, A1-RC4 multi-clínica baja prioridad)
AUDITORÍA BASE DE DATOS ████████░░  80%  (índices ✅, feedback_citas ✅, mensajes_whatsapp DROP pendiente SQL)
AUDITORÍA PRODUCTO/UX   ██████████ 100%  ✅ (onboarding, mobile, empty states, upgrade, disclaimer, agente IA)
```

## PRÓXIMA SESIÓN: Launch
Prioridad: **S2.1 cobro real Flow.cl** + **S2.2 WhatsApp e2e** + **S2.5 clínicas beta** + **S2.6 anuncio público**
SQL pendiente: `DROP TABLE IF EXISTS mensajes_whatsapp;` (migración 068)
