# SimpliClinic — Documento de negocio y producto

> Versión 1.0 · 21 de junio de 2026
> Documento base para el equipo. Describe qué es SimpliClinic, qué está construido,
> cómo funciona el negocio y hacia dónde va.

---

## 1. Resumen ejecutivo

**SimpliClinic es un software de gestión para clínicas estéticas en Chile. Está construido, funciona, y todavía no tiene clientes pagando.**

El estado real, medido sobre el código:

| Métrica | Valor |
|---|---|
| Líneas de TypeScript | 42.619 |
| Archivos de código | 264 |
| Migraciones de base de datos | 76 |
| Módulos funcionales completos | 14 |
| Endpoints de API | 71 |
| Clínicas pagando | 0 |

Lo que falta para facturar el primer peso son cuatro cosas concretas, ninguna grande:

1. Probar un cobro real con tarjeta real en Flow.cl
2. Probar el flujo de WhatsApp punta a punta con una clínica real
3. Onboardear 3 clínicas beta
4. Anunciar públicamente

**La tesis de largo plazo no es "software para clínicas estéticas".** Es que la gestión de un negocio de servicios con agenda es el mismo problema en todos los rubros. Una veterinaria, una barbería, un spa y una clínica estética agendan, atienden, cobran y recuerdan de la misma forma. Cambia el vocabulario y cambian dos o tres módulos; el resto es idéntico.

Eso no es una intuición: está medido. De 386 llamadas a base de datos en el código, **solo 24 tocan conceptos exclusivos de salud** (fichas clínicas, notas clínicas, consentimientos). El 94% del sistema ya es agnóstico al rubro.

---

## 2. El problema

### Cómo opera hoy una clínica estética chilena

La clínica típica de 1 a 5 profesionales opera con una combinación de:

- **Agenda en papel o Google Calendar** — sin relación con el paciente ni el servicio
- **WhatsApp personal del dueño o la recepcionista** — mezclado con conversaciones personales, sin historial, sin traspaso cuando alguien renuncia
- **Excel para los cobros** — actualizado a mano, casi siempre desactualizado
- **Fotos de tratamientos en el rollo del celular** — sin asociar al paciente, sin respaldo
- **Consentimientos en papel** — en una carpeta, ilegibles a los seis meses

El resultado predecible: no-shows entre 20% y 30%, confirmaciones manuales que consumen horas de recepción, sin visibilidad de ingresos hasta fin de mes, y cero capacidad de reactivar pacientes que dejaron de venir.

### Por qué el software existente no resuelve esto

| Alternativa | Por qué no funciona en Chile |
|---|---|
| **Agenda Pro** (local) | Precio alto, interfaz pesada, curva de aprendizaje larga |
| **Fresha / Booksy** (global) | No integran WhatsApp con IA, cobran comisión por reserva, soporte en inglés |
| **Mindbody** (global) | Diseñado para gimnasios y estudios grandes, sobra 80% de la funcionalidad |
| **Google Calendar + WhatsApp** | Gratis pero no es un sistema: no hay ficha, no hay cobros, no hay reportes |

El hueco real es: **software simple, en español chileno, que hable WhatsApp de forma nativa, a precio de PYME**.

### Por qué ahora

WhatsApp Business API dejó de ser exclusivo de grandes empresas. Desde julio 2025, Meta cobra por mensaje en vez de por conversación, y los mensajes de utilidad dentro de la ventana de 24 horas son gratis — que es exactamente el caso de uso de un recordatorio de cita. Al mismo tiempo, los modelos de lenguaje se volvieron lo suficientemente buenos y baratos como para que un agente conversacional agende citas de forma confiable.

Hace tres años esta combinación no era económicamente viable. Hoy sí.

---

## 3. La visión: dos ejes de expansión

SimpliClinic no es el producto. Es la primera vertical de una plataforma.

### Eje 1 — Modularidad (profundidad)

Hoy el producto se vende en tres planes con paquetes fijos de funcionalidades. La visión es que se venda como **módulos que el negocio va activando según crece**.

El punto de entrada más bajo posible es un profesional independiente que solo necesita una cosa:

> **"Que un agente de IA conteste mi WhatsApp, agende, y me lo ponga en mi Google Calendar."**

Eso es todo. Sin fichas, sin equipo, sin reportes, sin caja. Y desde ahí escala:

```
Nivel 0 — Agente
  Agente IA por WhatsApp + Google Calendar
  → Profesional independiente. Sin gestión, solo agendamiento automático.

Nivel 1 — Agenda
  + Agenda propia, pacientes, recordatorios, booking público
  → El profesional que ya quiere su base de datos.

Nivel 2 — Equipo
  + Múltiples profesionales, roles, comisiones, caja
  → El negocio con 2 a 5 personas.

Nivel 3 — Clínica
  + Fichas clínicas, galería antes/después, consentimientos,
    paquetes de sesiones, marketing automático, reportes
  → La clínica establecida.
```

La diferencia con el modelo de planes actual no es cosmética. Un plan es una decisión de compra única y rígida. Un módulo es una decisión reversible que el propio usuario toma desde la plataforma cuando el negocio lo necesita. El segundo modelo reduce la fricción de entrada, aumenta el valor promedio con el tiempo y hace que el producto crezca con el cliente en vez de forzarlo a elegir por adelantado.

### Eje 2 — Verticales (amplitud)

El mismo sistema, con otro vocabulario y otros módulos activos por defecto:

| Producto | Rubro | Qué cambia |
|---|---|---|
| **SimpliClinic** | Clínicas estéticas | Base actual |
| **SimpliVet** | Veterinarias | Paciente → mascota + dueño. Ficha clínica y consentimientos se mantienen. |
| **SimpliBarber** | Barberías | Paciente → cliente. Se desactiva ficha clínica y consentimientos. Se agrega walk-in. |
| **SimpliSpa** | Spa y salones de belleza | Paciente → cliente. Paquetes y membresías toman protagonismo. |

### El hallazgo: los dos ejes son el mismo trabajo técnico

Esta es la conclusión más importante del documento.

Medimos el acoplamiento del código al dominio clínico contando cada llamada a base de datos:

| Tipo de tabla | Llamadas | % |
|---|---|---|
| Genéricas (clínicas, pacientes, profesionales, servicios, citas, agenda, conversaciones, caja, paquetes, galería) | 337 | 87% |
| Específicas de salud (fichas clínicas, notas clínicas, consentimientos) | 24 | 6% |
| Otras (infraestructura, logs, suscripciones) | 25 | 7% |

**Solo el 6% del código toca conceptos exclusivos de salud.** Y de ese 6%, la veterinaria también lo necesita.

La consecuencia práctica: **no hay que hacer un fork del código para lanzar SimpliVet o SimpliBarber**. Hay que construir dos cosas, una sola vez:

1. **Un sistema de módulos activables** — que ya se necesita para el eje 1
2. **Una capa de vocabulario por vertical** — un mapa de etiquetas (`paciente` → `cliente` → `mascota`) que se resuelve en tiempo de render

Con esas dos piezas, una vertical nueva deja de ser un proyecto de meses y pasa a ser una configuración: elegir qué módulos vienen activos por defecto, definir el vocabulario, y sembrar servicios de ejemplo.

Estimación: **3 a 4 semanas de desarrollo para habilitar ambos ejes**. Después de eso, cada vertical nueva es cuestión de días.

---

## 4. El producto hoy

### Inventario funcional

| Módulo | Qué hace | Estado |
|---|---|---|
| **Agenda** | Vista día / semana / lista. Bloqueos, recurrencia, detección de conflictos, arrastrar para reagendar, estado "en sala". | Completo |
| **Pacientes** | Ficha con datos, historial de citas, galería de fotos antes/después, notas, importar/exportar CSV. | Completo |
| **Fichas clínicas** | Alergias, antecedentes, medicamentos. Notas por cita, privadas o compartidas. | Completo |
| **Servicios** | Duración, buffer entre citas, precio, color, activo/inactivo. | Completo |
| **Profesionales** | Perfil, especialidad, color en agenda, disponibilidad por día, % de comisión. | Completo |
| **Booking público** | Página propia por clínica (`/book/[slug]`). Reserva sin cuenta, con CAPTCHA y bloqueo anti–doble reserva. | Completo |
| **WhatsApp — Inbox** | Conversaciones en tiempo real, envío manual, marcar leídas, vínculo con ficha del paciente. | Completo |
| **WhatsApp — Agente IA** | Agenda, reagenda, cancela y responde consultas por chat. Deriva a humano cuando corresponde. | Completo |
| **Recordatorios** | Email y WhatsApp automáticos. Ventanas de 22–26h y 0,5–3,5h antes. Deduplicación. | Completo |
| **Emails transaccionales** | Confirmación, cancelación, recordatorio, post-cita, pago fallido, invitación de equipo. | Completo |
| **Cobros y caja** | Cobro por cita, cierre de caja diario por método de pago, cálculo automático de comisiones. | Completo |
| **Paquetes de sesiones** | Venta de paquetes, descuento automático por sesión usada, seguimiento de saldo. | Completo |
| **Consentimientos** | Plantillas configurables, envío por link, firma digital, PDF descargable. | Completo |
| **Marketing automático** | Cumpleaños, reactivación de pacientes inactivos, reporte mensual por email. | Completo |
| **Reportes** | Ingresos por mes y por día, ticket promedio, tasa de no-show, servicios más vendidos, exportar CSV. | Completo |
| **Google Calendar** | OAuth por clínica, sincronización bidireccional, importar bloqueos. | Completo |
| **Equipo y roles** | Admin, profesional, recepcionista, coordinador. Invitación por email. | Completo |
| **Autenticación** | Login, registro, recuperación, 2FA por email con rate limiting. | Completo |
| **Suscripciones** | Integración Flow.cl completa: checkout, webhook con HMAC, portal, cancelación. | Sin probar con dinero real |
| **Onboarding** | Wizard de configuración inicial + checklist de 5 pasos en el dashboard. | Completo |
| **Superadmin** | Panel interno: métricas de negocio, MRR, listado de clínicas, logs de auditoría. | Completo |
| **Monitoreo** | Sentry en API routes, crons y webhooks. | Completo |

### El agente IA — el diferenciador

Es la pieza que ningún competidor local tiene y la que justifica el precio.

**Cómo funciona:** el paciente escribe por WhatsApp al número de la clínica. El agente responde en lenguaje natural y tiene cinco herramientas reales contra la base de datos:

| Herramienta | Qué hace |
|---|---|
| `consultar_disponibilidad` | Calcula horarios libres reales según horario de la clínica, duración del servicio, buffer y citas ya tomadas |
| `crear_cita` | Crea la cita con bloqueo anti–doble reserva, sincroniza a Google Calendar y dispara emails |
| `listar_citas_paciente` | Busca las citas próximas del paciente por su número de teléfono |
| `cancelar_cita` | Cancela, verificando que la cita efectivamente le pertenezca a ese paciente |
| `escalar_a_humano` | Deriva la conversación al equipo y la marca visiblemente en el inbox |

**Decisiones de diseño relevantes:**

- **Dos modelos según complejidad.** Un clasificador por palabras clave detecta mensajes sensibles (reclamos, consultas médicas, temas de facturación) y los enruta a un modelo más capaz. El resto — que es el 80% — va a un modelo más económico.
- **Personalizable por clínica.** Nombre del asistente, tono (cercano o formal) e instrucciones adicionales se configuran desde la plataforma.
- **Límite de costo por clínica.** Cada plan tiene un tope mensual de conversaciones. Al 90% se avisa por email al administrador. Esto protege el margen.
- **Disclaimer automático.** La primera respuesta de cada conversación aclara que es un asistente automático.
- **Se calla cuando un humano toma la conversación.** Si alguien del equipo responde en el inbox, el agente deja de intervenir.
- **Nunca inventa horarios.** El prompt lo obliga a consultar disponibilidad real antes de proponer una hora.

---

## 5. Modelo de negocio

### Planes actuales

| Plan | Precio mensual | Profesionales | Pacientes | Conversaciones IA |
|---|---|---|---|---|
| **Simpli** | $29.900 CLP | 1 | 200 | — |
| **Simpli+** | $59.900 CLP | 5 | 1.000 | 300 |
| **Simpli Pro** | $99.900 CLP | Ilimitados | 5.000 | 1.000 |

Descuento anual: 20%. Trial de 7 días con acceso completo, sin tarjeta.

### Unit economics estimados

Cifras aproximadas a un tipo de cambio de 950 CLP/USD. El costo de IA depende del uso real.

| Concepto | Simpli | Simpli+ | Simpli Pro |
|---|---|---|---|
| Precio (USD) | $31 | $63 | $105 |
| Infraestructura compartida | $5 | $5 | $5 |
| Plataforma WhatsApp | — | $6 | $6 |
| Mensajes Meta | — | $5 | $5 |
| Agente IA | — | $8 | $28 |
| **Costo total** | **$5** | **$24** | **$44** |
| **Margen bruto** | **84%** | **62%** | **58%** |

**Escenario a 50 clínicas** (20 Simpli, 20 Simpli+, 10 Simpli Pro):

- MRR: **US$2.930** ≈ CLP $2,8 millones
- COGS: US$1.020
- Margen bruto: **65%**

El agente IA es el mayor costo variable y también el mayor diferenciador. Vigilar ese margen es la disciplina financiera central del negocio.

### La contradicción que hay que resolver

Hay un conflicto directo entre el empaquetado actual y la visión declarada.

**La visión dice:** el punto de entrada es un profesional independiente que solo quiere un agente IA que le agende.

**El producto hoy dice:** el agente IA está disponible únicamente en el plan Simpli Pro, de $99.900 CLP.

Es decir, **la funcionalidad diseñada para atraer al usuario más pequeño está encerrada en el plan más caro**. Un profesional independiente no va a pagar $99.900 por un agente; y el plan de $29.900 no incluye ni WhatsApp ni IA, que es exactamente lo que ese usuario busca.

**Propuesta:** crear un cuarto plan de entrada.

| Plan propuesto | Precio | Incluye |
|---|---|---|
| **Simpli Agente** | $19.900 CLP | Agente IA por WhatsApp (100 conversaciones) + Google Calendar. Sin gestión. |

Este plan cumple tres funciones simultáneas:

1. **Baja la barrera de entrada** de $29.900 a $19.900 con la funcionalidad que realmente atrae
2. **Es la puerta natural de cada vertical nueva** — el mismo agente sirve a un peluquero, un veterinario o un kinesiólogo sin cambiar nada
3. **Genera upgrades orgánicos** — el usuario que empieza solo con el agente y le funciona, tarde o temprano quiere la ficha del cliente y el historial

Con 100 conversaciones el costo de IA es de aproximadamente US$3, dejando un margen sobre 70%.

### Mercado

| Segmento | Estimación en Chile |
|---|---|
| Clínicas y centros de estética | 3.000 – 5.000 |
| Peluquerías y barberías formalizadas | 15.000+ |
| Veterinarias | 2.500+ |
| Spa y centros de bienestar | 1.500+ |

Objetivo realista año 1: **50 a 100 clínicas pagando** en la vertical estética. A un ticket promedio de $60.000 CLP, eso es un MRR de $3 a $6 millones.

---

## 6. Arquitectura técnica

### Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router, RSC) | Un solo repo, un solo deploy, renderizado en servidor |
| Base de datos | Supabase (PostgreSQL + RLS) | Aislamiento multi-tenant a nivel de base de datos, no de aplicación |
| Autenticación | Supabase Auth | Integrado con RLS |
| Pagos | Flow.cl (Webpay OneClick) | Stripe no procesa pagos en Chile |
| Email | Resend | API simple, buena entregabilidad |
| WhatsApp | Meta Cloud API (con abstracción para Twilio) | Costo por mensaje más bajo del mercado |
| IA | Claude API (Anthropic) | Calidad de tool use en español |
| Monitoreo | Sentry | Errores en API, crons y webhooks |
| Deploy | Vercel | Integración nativa con Next.js |
| Tareas programadas | GitHub Actions | Gratis; evita el costo de Vercel Pro crons |

### Multi-tenancy

Cada clínica es un `clinica_id` (UUID). El aislamiento se hace con **Row Level Security de PostgreSQL**, no con filtros en el código de aplicación.

Esto importa: significa que un bug en una query no puede exponer datos de otra clínica, porque la base de datos misma rechaza la fila. Es la diferencia entre "confiamos en que el desarrollador filtró bien" y "es estructuralmente imposible".

### Seguridad

- RLS activo en todas las tablas
- HMAC-SHA256 verificado en webhooks de Flow y de Meta
- CAPTCHA (Cloudflare Turnstile) en el booking público
- Rate limiting con Upstash en endpoints sensibles
- 2FA por email con límites de intentos
- Secretos obligatorios: el sistema falla al arrancar si falta una variable crítica

### Qué tan preparado está el código para nuevas verticales

| Aspecto | Estado |
|---|---|
| Modelo de datos agnóstico al rubro | 94% — solo fichas, notas y consentimientos son específicos |
| Sistema de módulos activables | No existe — hay feature gating por plan, no por módulo |
| Capa de vocabulario por vertical | No existe — las etiquetas están escritas directamente en los componentes |
| Aislamiento por tenant | Listo — RLS ya soporta cualquier cantidad de tenants |
| Facturación por módulo | No existe — Flow está configurado por plan |

Las tres piezas faltantes son el trabajo de las 3 a 4 semanas mencionadas en la sección 3.

---

## 7. Estado real del desarrollo

### Lo que está terminado y probado

Agenda, pacientes, fichas clínicas, servicios, profesionales, booking público, inbox de WhatsApp, agente IA, recordatorios, emails, cobros y caja, paquetes, consentimientos, marketing automático, reportes, Google Calendar, equipo y roles, autenticación con 2FA, onboarding, superadmin, monitoreo.

### Lo que está construido pero sin probar en producción real

| Item | Riesgo |
|---|---|
| **Cobro real con Flow.cl** | Alto — es el único camino de ingresos y nunca se ha ejecutado con una tarjeta real |
| **WhatsApp punta a punta con clínica real** | Alto — la configuración por clínica está construida pero no verificada en producción |

### Deuda técnica conocida

| Item | Impacto | Umbral de acción |
|---|---|---|
| **Un solo número de WhatsApp para todas las clínicas** | La abstracción `getWhatsappProviderForClinica()` existe en el código pero **nunca se invoca** — los cinco puntos de envío usan el proveedor global. Todas las clínicas envían desde el mismo número. | Antes de la segunda clínica beta |
| **`auth_clinica_id()` en RLS** | Hace una subconsulta por cada fila evaluada. Funciona bien hoy, colapsa a escala. | 500+ clínicas |
| **9 pares de migraciones con número duplicado** | El esquema no es reproducible desde cero. Dificulta incorporar desarrolladores nuevos. | Al sumar el segundo desarrollador |
| **Firmas de consentimiento en base64** | Guardadas como TEXT en la fila en vez de como archivo en Storage. Infla la tabla. | 1.000+ consentimientos |
| **Crons de marketing con N+1** | Una consulta por clínica en vez de un JOIN. Lento a partir de 100 clínicas. | 100+ clínicas |
| **Cobertura de tests baja** | 3 archivos de test sobre 264 de código. Cubren lo crítico (fechas, agendamiento, cobros) pero no más. | Al sumar el segundo desarrollador |

### El plan de WhatsApp multi-clínica

Esta es la decisión técnica más importante pendiente, porque cada clínica necesita **su propio número** — un paciente no confía en un mensaje que dice "Clínica Valentina" pero llega desde un número desconocido.

Opciones evaluadas:

| Opción | Costo a 10 clínicas | Costo a 50 clínicas | Self-service | Riesgo |
|---|---|---|---|---|
| **Kapso** | US$25–95/mes | US$299/mes | Sí — link de configuración | Startup joven |
| **360dialog** | ~€490/mes | ~€2.450/mes | Sí — Embedded Signup | Ninguno, es BSP establecido |
| **Twilio** | ~US$90/mes | ~US$450/mes | Requiere desarrollo propio | Ninguno |
| **Meta Tech Provider directo** | Solo mensajes | Solo mensajes | Se construye | 2–6 semanas de aprobación |

**Recomendación:** empezar con Kapso en el plan Pro (US$25/mes, 3 números) para las clínicas beta. El SDK usa el mismo formato de la API de Meta, así que si hay que migrar, se cambia la URL base y poco más — no hay lock-in profundo. Evaluar Meta Tech Provider directo al llegar a 20+ clínicas.

---

## 8. Riesgos y decisiones abiertas

### Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **El cobro con Flow falla en producción** | Media | Probar con tarjeta real antes de anunciar. Es la tarea #1. |
| **El costo de IA erosiona el margen** | Media | Ya hay límite por clínica y alerta al 90%. Vigilar mensualmente. |
| **Las clínicas no adoptan el agente IA** | Media | Las 3 clínicas beta son la prueba. Si no lo usan, el diferenciador no existe. |
| **Un competidor local copia el agente** | Baja en 12 meses | La ventaja es la ejecución y los datos, no la idea. |
| **Meta cambia las reglas de WhatsApp** | Baja | La abstracción de proveedor permite cambiar sin reescribir. |

### Decisiones que el equipo debe tomar

1. **¿Se crea el plan "Simpli Agente" de entrada?** Es la decisión que alinea el empaquetado con la visión. Sin esto, la estrategia modular no tiene puerta de entrada.

2. **¿Se construye la modularización antes o después de las primeras 10 clínicas?** El argumento para después: validar primero que alguien paga. El argumento para antes: cada clínica que entra con el modelo viejo es una migración futura.

3. **¿Cuál es la segunda vertical?** SimpliVet reutiliza más código (ficha clínica y consentimientos sirven igual). SimpliBarber tiene mercado más grande pero necesita walk-in y descarta módulos.

4. **¿Cómo se reparte el trabajo entre los socios?** El documento asume: desarrollo, producto/comercial, y una tercera área por definir.

5. **¿Se levanta capital o se financia con ingresos?** A 65% de margen bruto y costos de infraestructura bajos, el negocio puede autofinanciarse desde las primeras 20 clínicas.

---

## 9. Hoja de ruta

### Fase 1 — Lanzar (próximas 2 semanas)

Objetivo: **primer peso facturado**.

- Probar cobro real con tarjeta real en Flow.cl
- Conectar WhatsApp de la primera clínica beta y probar punta a punta
- Corregir el cableado del proveedor de WhatsApp por clínica
- Onboardear 3 clínicas beta con acompañamiento directo
- Anuncio público

### Fase 2 — Validar (meses 1 a 3)

Objetivo: **10 clínicas pagando**.

- Recoger feedback y corregir lo que aparezca
- Medir uso real del agente IA — ¿lo usan? ¿los pacientes agendan solos?
- Validar los unit economics con datos reales
- Conectar Kapso para números por clínica
- Decidir si el plan "Simpli Agente" entra al catálogo

### Fase 3 — Modularizar (meses 3 a 6)

Objetivo: **la plataforma deja de ser un producto y pasa a ser una base**.

- Sistema de módulos activables desde la plataforma
- Capa de vocabulario por vertical
- Facturación por módulo en Flow
- Migrar clínicas existentes al modelo modular
- Resolver la deuda técnica de escala (`auth_clinica_id`, migraciones duplicadas)

### Fase 4 — Segunda vertical (meses 6 a 9)

Objetivo: **probar que la tesis multi-vertical es cierta**.

- Elegir vertical, configurar módulos y vocabulario
- Landing propia y posicionamiento
- 10 clientes en la vertical nueva

Si la fase 4 toma semanas en vez de meses, la tesis está confirmada y el negocio deja de ser "un software para clínicas" y pasa a ser lo que se planteó desde el principio.

---

## Anexo — Cómo trabajar sobre este proyecto

**Documentos vivos en el repositorio:**

| Archivo | Contiene |
|---|---|
| `NEGOCIO.md` | Este documento — visión, modelo de negocio, estado |
| `PLAN.md` | Plan de trabajo detallado, tareas y estado por módulo |
| `ARQUITECTURA.md` | Esquema de base de datos, decisiones técnicas, riesgos |
| `AGENTS.md` | Reglas de trabajo para agentes de IA sobre este repo |

**Regla que se mantiene:** al terminar cada sesión de trabajo se actualiza `PLAN.md` con lo completado y `ARQUITECTURA.md` si hubo una decisión técnica relevante. El objetivo es que cualquiera — persona o IA — pueda retomar con contexto real y sin repetir lo ya hecho.
