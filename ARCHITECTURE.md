# DOCUMENTACIÓN TÉCNICA COMPLETA — SimpliClinic

## 1. RESUMEN EJECUTIVO

**SimpliClinic** es una plataforma SaaS de gestión integral para clínicas estéticas que automatiza la operación médica y administrativa.

### Qué es el producto
Una aplicación web moderna (Next.js 16 + Supabase) que digitaliza:
- **Agenda médica** con vistas día/semana/mes, búsqueda de disponibilidad y bloqueos
- **Gestión de pacientes** con fichas clínicas y historial
- **Servicios y profesionales** con colores personalizados y especialidades
- **Recordatorios automáticos** por WhatsApp (Twilio/Meta) con confirmación bidireccional
- **Reportes y analíticos** de citas, ingresos y servicios
- **Sistema de suscripciones** con Stripe (planes Free, Pro, Clínica)
- **Book público** para que pacientes agendan citas sin login
- **Multi-usuario** con roles (Admin, Profesional, Recepcionista)
- **Inbox integrado** para WhatsApp Business (Meta)

### Para quién
- Clínicas estéticas medianas (1–50 profesionales)
- Centros de belleza y spa con múltiples servicios
- Profesionales independientes (dermatólogos, esteticiens)
- Operaciones en América Latina (inicial: Chile, zona horaria America/Santiago)

---

## 2. STACK TÉCNICO

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| **Frontend** | Next.js | 16.2.6 | Framework React SSR/SSG + App Router |
| | React | 19.2.4 | UI library |
| | TypeScript | ^5 | Type safety |
| | Tailwind CSS | ^4 | Styling |
| | shadcn/ui | ^4.7.0 | Headless component library |
| | date-fns | ^4.1.0 | Date manipulation (locales: es) |
| | Recharts | ^3.8.1 | Charts para reportes |
| **Backend** | Next.js API Routes | 16.2.6 | Serverless endpoints en Vercel |
| | Vercel Cron | Nativo | Jobs horarios (recordatorios cada hora) |
| **Base de datos** | Supabase | v2 | PostgreSQL 15 + RLS + Real-time |
| **Auth** | Supabase Auth | Nativo | JWT + email/password |
| **Queue** | BullMQ | ^5.76.8 | Redis-backed job queue |
| | ioredis | ^5.10.1 | Redis client |
| **WhatsApp** | Twilio API | REST | Provider principal |
| | Meta Cloud API | REST | Alternativa (WhatsApp Business Account) |
| **Pagos** | Stripe | REST | Checkout + subscriptions + webhooks |
| **Storage** | Supabase Storage | Nativo | Logos, fotos |
| **Testing** | Vitest | ^4.1.5 | Unit tests |

---

## 3. ESTRUCTURA DE CARPETAS

```
/
├── app/
│   ├── layout.tsx                    # Root layout (auth init, env validation)
│   ├── page.tsx                      # Landing page pública
│   ├── api/
│   │   ├── auth/callback/            # Supabase OAuth redirect
│   │   ├── stripe/checkout/          # Crear Stripe session
│   │   ├── stripe/portal/            # Customer portal session
│   │   ├── stripe/webhook/           # Procesar eventos Stripe
│   │   ├── stripe/sync-checkout/     # Sync plan tras pago (fallback webhook)
│   │   ├── whatsapp/webhook/         # Twilio/Meta inbound messages
│   │   ├── whatsapp/send/            # Envío manual WhatsApp
│   │   ├── cron/recordatorios/       # Hourly reminder job
│   │   ├── cron/email-recordatorios/ # Email reminders
│   │   ├── citas/jobs/               # Schedule/cancel WhatsApp jobs
│   │   ├── usuarios/invite/          # Invitar usuario a clínica
│   │   └── notificar-cita/           # Trigger notificación manual
│   ├── (auth)/                       # Login, register, forgot/reset password
│   ├── (onboarding)/                 # Wizard post-signup
│   ├── (dashboard)/
│   │   ├── dashboard/                # KPIs, próximas citas
│   │   ├── agenda/                   # Calendar views
│   │   ├── pacientes/                # Patient CRUD
│   │   ├── servicios/                # Service CRUD
│   │   ├── reportes/                 # Analytics + export
│   │   ├── whatsapp/                 # WhatsApp config
│   │   ├── inbox/                    # Message center
│   │   └── configuracion/            # Settings
│   └── book/[slug]/page.tsx          # Book público (anónimo)
│
├── components/
│   ├── agenda/                       # AgendaView, CalendarioMes/Semana/Dia, ModalCita, ModalBloqueo
│   ├── pacientes/                    # ListaPacientes, FichaPaciente, FormPaciente
│   ├── servicios/                    # ListaServicios, FormServicio
│   ├── dashboard/                    # SaludoHeader, MetricCard, ProximasCitas
│   ├── reportes/                     # SelectorMes, ExportButtons
│   ├── auth/                         # RolGuard
│   ├── subscriptions/                # PlanesCard
│   └── ui/                           # shadcn base components
│
├── lib/
│   ├── supabase/                     # client.ts, server.ts, admin.ts
│   ├── auth/useRol.ts
│   ├── agenda/                       # datetime.ts, scheduling.ts, queries.ts, metrics.ts
│   ├── subscriptions/                # stripe.ts, queries.ts, useSubscripcion.ts
│   ├── whatsapp/                     # provider.ts, jobs.ts, templates.ts, queries.ts
│   ├── onboarding/                   # queries.ts, queries-server.ts
│   ├── pacientes/queries.ts
│   ├── servicios/queries.ts
│   ├── usuarios/queries.ts
│   ├── dashboard/queries.ts
│   ├── reportes/queries.ts
│   ├── cobros/                       # utils.ts, queries.ts
│   ├── utils.ts                      # cn() classnames helper
│   └── env.ts                        # Env var validation
│
├── supabase/migrations/              # 001–023 SQL migrations
├── types/index.ts                    # Global TypeScript types
└── scripts/whatsapp-worker.ts        # BullMQ worker
```

---

## 4. BASE DE DATOS

### Tablas

#### **clinicas** — Cada clínica es un tenant
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| nombre | text | |
| email | text UNIQUE | |
| telefono | text | |
| direccion | text | |
| sitio_web | text | |
| logo_url | text | Supabase Storage |
| plan | text | 'starter', 'pro', 'clinica' (legacy, usar subscriptions) |
| slug | text UNIQUE | URL del book público |
| configuracion | jsonb | Horarios, templates, config general |
| activo | boolean | |
| owner_id | uuid FK auth.users | |

**Trigger**: `handle_new_user()` crea clínica en signup

---

#### **usuarios_clinica** — Miembros del equipo
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id | uuid FK | |
| user_id | uuid FK auth.users | null si invitado pendiente |
| rol | enum | 'admin', 'profesional', 'recepcionista' |
| nombre | text | |
| email | text | |
| activo | boolean | |

---

#### **profesionales**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id | uuid FK | |
| nombre | text | |
| especialidad | text | |
| email / telefono | text | |
| foto_url | text | |
| bio | text | |
| color | text | Hex para calendario |
| activo | boolean | |

---

#### **pacientes**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id | uuid FK | |
| nombre | text | |
| email / telefono | text | |
| rut | text | Chile-specific, unique por clínica |
| fecha_nacimiento | date | |
| notas | text | |
| activo | boolean | |

---

#### **servicios**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id | uuid FK | |
| nombre | text | |
| duracion_minutos | int | |
| precio | int | CLP |
| buffer_minutos | int | Tiempo de descanso post-cita |
| color | text | Hex |
| activo | boolean | |

---

#### **citas** — Entidad central
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id | uuid FK | |
| paciente_id | uuid FK | |
| profesional_id | uuid FK | |
| servicio_id | uuid FK | |
| inicio / fin | timestamptz | Wall-clock America/Santiago |
| estado | text | 'pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio' |
| notas | text | |
| pago_monto | int | CLP |
| pago_estado | text | 'pendiente', 'pagado', 'parcial' |
| pago_metodo | text | 'efectivo', 'transferencia', 'debito', 'credito' |
| buffer_minutos | int | Copiado del servicio al crear |
| lock_version | int | Optimistic locking |
| rango | tstzrange | GENERATED: tstzrange(inicio, fin) |
| recurrence_kind | text | 'none', 'daily', 'weekly', 'monthly' |
| event_timezone | text | Siempre 'America/Santiago' |

**Constraint GIST**: No overlap por profesional (excepto canceladas/no_asistio)

---

#### **agenda_bloqueos** — Horarios bloqueados
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| clinica_id / profesional_id | uuid FK | profesional_id=null → bloquea todos |
| inicio / fin | timestamptz | |
| titulo | text | 'Almuerzo', 'Vacaciones', etc. |
| tipo | text | |
| motivo | text | |

---

#### **agenda_disponibilidad** — Horario semanal del profesional
| Columna | Tipo | Descripción |
|---------|------|-------------|
| profesional_id | uuid FK | |
| dia_semana | int | 1=Lunes … 7=Domingo (ISO) |
| hora_inicio / hora_fin | time | |
| activo | boolean | |

---

#### **subscriptions** — Estado del plan Stripe
| Columna | Tipo | Descripción |
|---------|------|-------------|
| clinica_id | uuid FK UNIQUE | |
| plan | text | 'free', 'pro', 'clinica' |
| estado | text | 'activa', 'pausada', 'cancelada', 'trial' |
| stripe_customer_id | text | cus_xxx |
| stripe_subscription_id | text | sub_xxx |
| trial_ends_at | timestamptz | |
| current_period_start/end | timestamptz | |

---

#### **whatsapp_logs** — Historial de mensajes enviados
| Columna | Tipo | Descripción |
|---------|------|-------------|
| clinica_id / cita_id | uuid FK | |
| paciente_telefono | text | E164 |
| tipo_mensaje | text | 'recordatorio_24h', 'recordatorio_2h', 'post_cita', 'confirmacion', 'manual' |
| estado | text | 'enviado', 'entregado', 'leido', 'fallido', 'respondido' |
| respuesta_paciente | text | 'SI', 'NO', o error |

---

#### **conversaciones / mensajes_inbox** — Inbox Meta WhatsApp
- `conversaciones`: thread por teléfono × clínica (unique)
- `mensajes_inbox`: mensajes individuales con `direccion` (entrante/saliente)

---

#### **agenda_recordatorios** — Jobs de recordatorio por cita
| Columna | Tipo | Descripción |
|---------|------|-------------|
| cita_id | uuid FK | |
| canal | text | 'whatsapp', 'email' |
| minutos_antes | int | |
| activo | boolean | |
| sent_at | timestamptz | null si no enviado aún |

---

#### **notas_clinicas** — Notas clínicas por paciente/cita
| Columna | Tipo | Descripción |
|---------|------|-------------|
| paciente_id / cita_id / profesional_id | uuid FK | |
| contenido | text | |

---

#### **agenda_audit_log** — Cambios en citas
| Columna | Tipo | Descripción |
|---------|------|-------------|
| cita_id | uuid FK | |
| actor_id | uuid | auth.users |
| accion | text | 'created', 'updated', 'deleted' |
| antes / despues | jsonb | Estado anterior/posterior |

---

### Funciones SQL (RPCs)

| Función | Auth | Descripción |
|---------|------|-------------|
| `auth_clinica_id()` | Autenticado | UUID de la clínica del usuario actual |
| `auth_rol_usuario()` | Autenticado | Rol del usuario ('admin', 'profesional', etc.) |
| `get_clinica_publica(slug)` | Anon | Info pública para book (servicios, profesionales) |
| `get_slots_ocupados(clinica_id, fecha, prof_id)` | Anon | Rangos ocupados para un día |
| `crear_reserva_publica(...)` | Anon | Crea cita + paciente desde el book público |

---

## 5. AUTENTICACIÓN Y ROLES

### Flujo
1. Signup → Supabase Auth crea user + trigger crea clínica
2. Login → JWT almacenado en cookies (SSR)
3. Server Components leen JWT con `supabase.auth.getUser()`
4. RLS enforced en cada query

### Roles

| Rol | Puede |
|-----|-------|
| **admin** | Todo (CRUD completo, config, facturación, equipo) |
| **profesional** | Ver/editar sus propias citas, ver pacientes (solo lectura) |
| **recepcionista** | CRUD citas (todos), CRUD pacientes, inbox WhatsApp |

### Guards
- `RolGuard` component para proteger secciones UI
- `useAcceso(seccion)` hook client-side
- RLS policies en Supabase como última línea de defensa

---

## 6. MÓDULOS Y ESTADO

| Módulo | Estado | Archivos clave |
|--------|--------|----------------|
| Agenda (día/semana/mes) | ✅ Completo | `components/agenda/`, `lib/agenda/` |
| Drag & drop en citas | ✅ Completo | `BloquesCita.tsx`, `CalendarioDia/Semana.tsx` |
| Bloqueos horarios | ✅ Completo | `ModalBloqueo.tsx`, `BloqueHorario.tsx` |
| Pacientes CRUD | ✅ Completo | `components/pacientes/`, `lib/pacientes/queries.ts` |
| Servicios CRUD | ✅ Completo | `components/servicios/`, `lib/servicios/queries.ts` |
| Profesionales + disponibilidad | ✅ Completo | `configuracion/page.tsx`, `lib/agenda/queries.ts` |
| Book público | ✅ Completo | `app/book/[slug]/page.tsx` |
| WhatsApp recordatorios (Twilio) | ✅ Completo | `lib/whatsapp/jobs.ts`, `app/api/cron/` |
| Templates WhatsApp configurables | ✅ Completo | `configuracion → Recordatorios` |
| Stripe checkout + webhooks | ✅ Completo | `lib/subscriptions/stripe.ts` |
| Planes + gating por features | ✅ Completo | `useSubscripcion.ts`, `PlanGate.tsx` |
| Reportes básicos | ✅ Completo | `lib/reportes/queries.ts` |
| Dashboard KPIs | ✅ Completo | `lib/dashboard/queries.ts` |
| Multi-usuario + roles | ✅ Completo | `lib/usuarios/queries.ts` |
| Realtime agenda | ✅ Completo | `AgendaView.tsx` (debounce 800ms) |
| Fotos de profesionales | ✅ Completo | `CalendarioDia.tsx`, `book/[slug]/` |
| RUT como identificador | ✅ Completo | `FormPaciente.tsx`, `book/[slug]/`, RPC `crear_reserva_publica` |
| Inbox WhatsApp (Meta) | ⚠️ Parcial | UI básica, tablas en DB, send untested |
| Email recordatorios | ❌ Stub | Código existe, proveedor no integrado |
| Citas recurrentes | ❌ Structural | Campos en DB, sin UI |
| Notas clínicas | ❌ Pendiente | Tabla existe, sin UI |

---

## 7. API ROUTES

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/callback` | GET | — | Supabase OAuth redirect |
| `/api/stripe/checkout` | POST | ✓ | Crear Stripe checkout session |
| `/api/stripe/portal` | POST | ✓ | Abrir portal de facturación Stripe |
| `/api/stripe/webhook` | POST | Stripe sig | Procesar eventos (checkout, subscription) |
| `/api/stripe/sync-checkout` | POST | ✓ | Sync plan directamente desde Stripe (fallback) |
| `/api/whatsapp/send` | POST | ✓ | Envío manual de WhatsApp |
| `/api/whatsapp/webhook` | POST | Twilio/Meta sig | Recibir mensajes entrantes |
| `/api/whatsapp/webhook` | GET | Meta token | Verificación Meta webhook |
| `/api/cron/recordatorios` | GET | CRON_SECRET | Job horario de recordatorios |
| `/api/cron/email-recordatorios` | GET | CRON_SECRET | Job horario de emails |
| `/api/citas/jobs` | POST | ✓ | Programar/cancelar jobs WhatsApp |
| `/api/usuarios/invite` | POST | ✓ admin | Invitar usuario al equipo |
| `/api/notificar-cita` | POST | ✓ | Trigger notificación manual |

---

## 8. INTEGRACIONES EXTERNAS

### Stripe
- **Checkout**: `POST /api/stripe/checkout` → crea session → redirect → webhook actualiza `subscriptions`
- **Webhooks procesados**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Firma**: HMAC-SHA256 con `STRIPE_WEBHOOK_SECRET`
- **Sin SDK**: Usa native `fetch` a `https://api.stripe.com/v1`

### WhatsApp Twilio (Primary)
- **Envío**: `POST /Accounts/{sid}/Messages.json` con `From=whatsapp:+N`, `To=whatsapp:+N`
- **Inbound**: Twilio envía form-data a `/api/whatsapp/webhook`
- **Confirmación bidi**: Paciente responde SI/NO → actualiza `citas.estado`

### WhatsApp Meta (Alternativo)
- **Envío**: Graph API v18.0
- **Webhook**: JSON + `x-hub-signature-256`
- **Conversaciones persistentes** en `conversaciones` + `mensajes_inbox`

### Supabase Realtime
- Suscripciones activas en `AgendaView`: tablas `agenda_citas` y `agenda_bloqueos`
- Debounce 800ms para evitar re-renders excesivos
- Cleanup en unmount (`removeChannel`)

### Vercel Cron
```
GET /api/cron/recordatorios  → cada hora
GET /api/cron/email-recordatorios → cada hora
```

---

## 9. PLANES Y SUBSCRIPCIONES

| Plan | Profesionales | Precio/mes | Características |
|------|---|---|---|
| **Starter (Free)** | 1 | $0 | Agenda básica, 1 profesional, sin reportes |
| **Pro** | 5 | $79.900 CLP | Reportes, equipo, WhatsApp 200/mes, booking público |
| **Clínica** | Ilimitado | $129.900 CLP | Todo Pro + WhatsApp ilimitado + API access |

- **Trial**: 7 días gratis al registrarse con acceso completo Pro
- **Gating**: `useSubscripcion().puedeUsar(feature)` y `limite('profesionales')`

---

## 10. VARIABLES DE ENTORNO

```bash
# Supabase (requeridas)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (requeridas para pagos)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_xxx        # ⚠️ debe ser price_, no prod_
STRIPE_PRICE_CLINICA=price_xxx

# Twilio WhatsApp (requeridas para recordatorios)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+34...
TWILIO_VALIDATE_WEBHOOK=1
TWILIO_WEBHOOK_BASE_URL=https://tu-dominio.com

# Cron (requerida para recordatorios automáticos)
CRON_SECRET=token_secreto_largo

# WhatsApp provider
WHATSAPP_PROVIDER=twilio           # o 'meta'

# Meta (opcional, si WHATSAPP_PROVIDER=meta)
META_APP_ID=...
META_APP_SECRET=...
META_WEBHOOK_VERIFY_TOKEN=...

# Redis (opcional, para BullMQ deferred jobs)
REDIS_URL=redis://...
```

---

## 11. FLUJOS CRÍTICOS

### Registro y onboarding
```
1. POST /auth/register → Supabase Auth crea user
2. Trigger handle_new_user() → INSERT clinicas
3. INSERT subscriptions (plan='free', estado='trial', trial_ends_at=now()+7d)
4. Redirect /onboarding → wizard 3 pasos (clínica → profesional → servicio)
5. Redirect /agenda
```

### Paciente agenda por book público
```
1. /book/[slug] → RPC get_clinica_publica(slug)
2. Selecciona fecha → profesional → servicio
3. JS llama get_slots_ocupados() → muestra disponibilidad
4. Ingresa datos → RPC crear_reserva_publica()
   - Busca paciente por RUT → por teléfono → crea nuevo
   - Verifica disponibilidad (race condition check)
   - INSERT cita (estado='pendiente')
5. Cron horario → envía WhatsApp 24h antes
6. Paciente responde SI/NO → webhook → actualiza estado
```

### Pago de plan
```
1. Configuración → Plan → "Actualizar a Pro"
2. POST /api/stripe/checkout → redirect checkout.stripe.com
3. Pago exitoso → redirect /configuracion?checkout=success
4. PlanesCard detecta ?checkout=success → POST /api/stripe/sync-checkout
   → sincroniza plan directamente desde Stripe (fallback si webhook falla)
5. Stripe webhook → actualiza subscriptions table
```

---

## 12. DECISIONES TÉCNICAS CLAVE

### Wall-clock timezone (America/Santiago)
Todas las citas se guardan con hora de pared Chile, no UTC.  
**Por qué**: users ven "10:00" y quieren guardar "10:00" — conversión UTC sería confusa con DST.  
**Código**: `lib/agenda/datetime.ts` — toda conversión centralizada aquí.  
**Regla**: NUNCA usar `new Date(iso).getHours()` para mostrar horas. Usar `citaWallClockTime(iso)`.

### RLS como única capa de auth multi-tenant
Sin middleware de permisos separado — Supabase RLS se encarga de todo.  
**Trade-off**: Simple pero si RLS tiene bug, hay fuga de datos entre clínicas.  
**Mitigación**: Queries client-side también filtran por `clinica_id` explícitamente.

### Stripe sin SDK oficial
Usa native `fetch` a la Stripe REST API.  
**Por qué**: Reduce dependencias y bundle size, Stripe API es estable.

### BullMQ + Cron (doble sistema de recordatorios)
- BullMQ: timing preciso si Redis disponible
- Cron horario: fallback sin Redis
- Anti-duplication: check `whatsapp_logs` antes de enviar

### clinica = tenant (1 user, 1 clinic)
Un usuario pertenece a UNA clínica.  
**Trade-off**: Simple, pero no soporta multi-clínica (planned feature).

---

## 13. DEUDA TÉCNICA

| Item | Severidad | Descripción |
|------|-----------|-------------|
| Inbox con mock data | 🔴 Alta | `inbox/page.tsx` usa datos hardcodeados en producción |
| CRON_SECRET opcional | 🔴 Alta | Sin él, cualquiera puede triggerear envío masivo |
| META_APP_SECRET opcional | 🔴 Alta | Sin él, cualquiera puede inyectar mensajes falsos |
| Validación multi-tenant en APIs | 🟡 Media | Algunos endpoints confían solo en RLS |
| Sin paginación en listas | 🟡 Media | Pacientes, servicios cargan todo — problema con >10K registros |
| Email recordatorios | 🟡 Media | Código stub, sin proveedor configurado |
| Citas recurrentes | 🟢 Baja | Campos en DB, sin UI |
| Notas clínicas | 🟢 Baja | Tabla existe, sin UI |
| Sin rate limiting en book público | 🟡 Media | Podría ser abusado |
| Sin Sentry/logging centralizado | 🟡 Media | Solo console.error |

---

## 14. CÓMO EMPEZAR (para nuevos devs)

```bash
# 1. Clonar e instalar
git clone ... && cd aestheticos && npm install

# 2. Config env vars
cp .env.example .env.local
# llenar con valores de Supabase, Stripe, Twilio

# 3. DB
npx supabase db push  # aplica migrations 001-023

# 4. Dev server
npm run dev  # http://localhost:3000

# 5. Registrarse y completar onboarding wizard

# 6. Tests
npm run test
```

### Comandos útiles
```bash
npx tsc --noEmit          # verificar TypeScript
npm run lint              # ESLint
npx supabase db diff      # ver cambios pendientes en schema
```

---

*Última actualización: Junio 2026 — Versión 1.0 MVP*
