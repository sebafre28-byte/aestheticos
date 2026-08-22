# Prompt para armar la estrategia de marketing de SimpliClinic

> Copiar todo lo que está debajo de la línea y pegarlo en la conversación con la otra IA.
> Adjuntar además: `NEGOCIO.md`, el PDF `SimpliClinic-Negocio.pdf`, y el link del documento
> publicado: https://claude.ai/code/artifact/9d916198-1d04-4762-9352-01f31f30b2c8

---

## Quién soy y qué necesito de ti

Soy cofundador de **SimpliClinic**, un software de gestión para clínicas estéticas en Chile. Me hago cargo de **marketing y producto**. Somos tres socios: uno es full tecnología (desarrollo), otro es experto en innovación y emprendimiento (con contactos), y yo.

Necesito que me ayudes a construir **una presentación de marketing y go-to-market**: cómo vamos a vender esto. La presentación es principalmente para alinear al equipo interno, y después servirá de base para material comercial.

**La regla más importante: todo tiene que estar aterrizado a lo que realmente tenemos hoy.** No quiero una presentación aspiracional que prometa cosas que el producto no hace. Más abajo te doy el estado real, incluyendo lo que NO está construido. Si algo de lo que propones depende de una funcionalidad que no existe, decímelo explícitamente.

---

## Qué es SimpliClinic

Software de gestión para clínicas estéticas: agenda, pacientes, fichas clínicas, cobros, recordatorios automáticos, y **un agente de IA que agenda citas por WhatsApp**.

Está construido y funciona. **Todavía no tiene clientes pagando.** Estamos por lanzar.

### Números reales del producto

| Métrica | Valor |
|---|---|
| Líneas de código | 42.619 |
| Módulos funcionales completos | 14 |
| Migraciones de base de datos | 76 |
| Endpoints de API | 71 |
| Clínicas pagando | 0 |

### Lo que hace hoy, verificado

Agenda (día/semana/lista, bloqueos, recurrencia, detección de conflictos) · Pacientes (ficha, historial, galería antes/después, notas) · Fichas clínicas (alergias, antecedentes, medicamentos) · Servicios y profesionales · Booking público (página propia por clínica) · Inbox de WhatsApp en tiempo real · **Agente IA** · Recordatorios automáticos por email y WhatsApp · Cobros y cierre de caja · Comisiones por profesional · Paquetes de sesiones · Consentimientos con firma digital · Marketing automático (cumpleaños, reactivación) · Reportes e ingresos · Google Calendar bidireccional · Equipo con roles · 2FA · Onboarding guiado.

### El agente IA — el producto estrella

Es el diferenciador y ningún competidor local lo tiene. El paciente escribe por WhatsApp al número de la clínica y el agente:

- Consulta disponibilidad **real** (horario de la clínica, duración del servicio, buffer entre citas, citas ya tomadas)
- Crea la cita con bloqueo anti–doble reserva y la sincroniza a Google Calendar
- Lista, cancela y reagenda las citas del paciente
- Responde consultas de servicios, precios y horarios
- Deriva a un humano cuando el paciente lo pide, está molesto, o hay una consulta médica

Detalles que importan para la comunicación: nunca inventa horarios (está obligado a consultar disponibilidad real antes de proponer); se personaliza por clínica (nombre del asistente, tono cercano o formal, instrucciones propias); avisa que es un asistente automático en la primera respuesta; y se calla apenas alguien del equipo toma la conversación.

---

## El giro estratégico que quiero hacer

Hoy vendemos **tres planes cerrados**: Simpli ($29.900), Simpli+ ($59.900) y Simpli Pro ($99.900). Quiero cambiar a un modelo **modular, con el agente como base**.

### La tesis

**El agente es el núcleo. No existe SimpliClinic sin agente.** Todo lo demás son módulos que el usuario va sumando, solo, desde la plataforma, cuando su negocio lo necesita.

```
NÚCLEO (todos lo tienen)
  Simpli Agente — agente IA en WhatsApp + agenda + Google Calendar
  El precio escala por volumen de conversaciones al mes.

MÓDULOS (se activan y desactivan solos)
  Pacientes     — ficha, historial, galería antes/después
  Equipo        — múltiples profesionales, roles, comisiones
  Caja          — cobros, cierre diario, métodos de pago
  Analítica     — dashboard, ingresos, no-shows, ranking de servicios
  Marketing     — cumpleaños, reactivación de inactivos, campañas
  Clínico       — fichas clínicas, consentimientos digitales
  Paquetes      — venta y control de paquetes de sesiones
  Insumos       — inventario y alertas de stock  (AÚN NO CONSTRUIDO)
```

### Por qué este modelo

1. **Baja la barrera de entrada.** El punto de partida deja de ser "$29.900 por un software de gestión" y pasa a ser "$19.900 porque un agente te contesta el WhatsApp y te agenda". Es una venta mucho más fácil de explicar.
2. **Hace la comunicación más simple.** Un solo mensaje de entrada: *tu WhatsApp agenda solo*. Todo lo demás se cuenta después.
3. **Crece con el cliente.** El usuario no elige un plan por adelantado y se equivoca; suma cuando le duele algo.
4. **Es la puerta de las verticales futuras.** El mismo agente sirve a un peluquero, un veterinario o un kinesiólogo. Ya validamos técnicamente que el 94% del código es agnóstico al rubro.

### Propuesta de precios de partida (a validar contigo)

**Base — Simpli Agente**, escalando por conversaciones al mes:

| Conversaciones/mes | Precio CLP | Margen |
|---|---|---|
| 100 | $19.900 | 11% |
| 300 | $34.900 | 34% |
| 800 | $59.900 | 40% |
| 2.000 | $99.900 | 33% |

**Módulos:** entre $7.900 y $12.900 cada uno. Margen ~95% (es software ya construido, costo marginal casi cero).

---

## ⚠️ El dato más importante para la estrategia de venta

Corrí los números y hay algo que cambia todo:

**El agente tiene margen bajo. Los módulos tienen margen altísimo.**

- El piso de costo por clínica con WhatsApp activo es de **$15.200 CLP/mes** (infraestructura + plataforma WhatsApp + mensajes de Meta). Ese costo existe aunque la clínica no use nada.
- Por eso el plan de entrada a $19.900 deja apenas **11% de margen**.
- Un módulo a $9.900 deja **95%**, porque no tiene costo marginal.

**Un cliente con agente de 300 conversaciones + 3 módulos paga $67.600 y deja 64% de margen.** Ese es el cliente que hace funcionar el negocio.

### Lo que esto significa para el marketing

1. **El agente es el gancho de adquisición, no el producto rentable.** Se vende barato a propósito, para entrar.
2. **La métrica de éxito no es "clínicas adquiridas" sino "módulos activos por clínica".** Toda la estrategia de contenido, onboarding y comunicación tiene que estar diseñada para que el usuario sume módulos.
3. **No se puede descontar el plan base.** A 11% de margen no hay espacio. Si hay que hacer promociones, que sean sobre módulos (regalar un módulo 3 meses), no sobre la base.

Quiero que la presentación refleje esta lógica.

---

## Lo que NO está construido (crítico — no prometer esto)

| Falta | Impacto en la estrategia |
|---|---|
| **El sistema de módulos activables** | Hoy son 3 planes fijos. La venta modular no se puede ejecutar todavía. Son ~3-4 semanas de desarrollo. |
| **Onboarding self-service de WhatsApp** | Hoy conectar el WhatsApp de una clínica es manual y lo hace el equipo. Para que el modelo funcione, la clínica tiene que poder conectarlo sola en minutos. Hay solución identificada (Kapso, con links de configuración) pero no está integrada. |
| **Módulo de insumos/inventario** | No existe. Es idea, no producto. |
| **Cobro real probado** | La integración con Flow.cl está completa pero **nunca se ejecutó un cobro con una tarjeta real**. |
| **Un número de WhatsApp por clínica** | Hoy todas las clínicas compartirían el mismo número. Está identificado el arreglo, es rápido, pero no está hecho. |

**Consecuencia práctica:** la estrategia modular es hacia dónde vamos, pero las primeras clínicas beta entran con el modelo actual. Necesito que la presentación distinga claramente entre **lo que vendemos hoy** y **hacia dónde va el producto**, sin mezclarlos.

---

## Activos de go-to-market que tenemos

### Contactos reales

- **Gina** — trabaja hace años en el mundo de la estética en Chile. Puede abrir puertas y hacer presentaciones tibias a clínicas.
- **Ignacio** (socio) — trabaja en una universidad y tiene acceso al **departamento de estética de un instituto profesional**. Eso da acceso a una base de datos de estudiantes y egresados.

**Sobre el contacto de Ignacio, una observación:** los egresados de carreras de estética son exactamente el perfil del plan base — profesionales independientes que recién empiezan, sin equipo, sin clínica, que necesitan justamente que alguien les conteste el WhatsApp y les agende. Es un calce muy bueno entre el canal y el producto de entrada. Vale la pena que la presentación lo trate como un canal propio, no como una lista de correos más.

### Canales que queremos usar

- Building in public (mostrar el desarrollo y las métricas en abierto)
- Demos en video de cómo funciona el agente
- Contenido educativo para dueñas de clínicas
- Boca a boca desde las clínicas beta

### Contexto de mercado

| Segmento en Chile | Tamaño estimado |
|---|---|
| Peluquerías y barberías formalizadas | 15.000+ |
| Clínicas y centros de estética | 3.000 – 5.000 |
| Veterinarias | 2.500+ |
| Spa y centros de bienestar | 1.500+ |

Competencia: Agenda Pro (local, caro y pesado), Fresha y Booksy (globales, sin WhatsApp con IA, cobran comisión por reserva), Mindbody (para gimnasios grandes). **Ninguno tiene un agente de IA que agende por WhatsApp en español.**

Objetivo año 1: **50 a 100 clínicas pagando**.

---

## Qué necesito que produzcas

Una **presentación de marketing y go-to-market**. Quiero que cubra:

1. **El posicionamiento.** Cómo describimos SimpliClinic en una frase. El mensaje central del agente. Qué NO decimos.
2. **El cliente.** Perfiles concretos: la profesional independiente recién egresada, la clínica de 2-3 personas, la clínica establecida. Qué le duele a cada una y qué mensaje le llega.
3. **La arquitectura de la oferta.** Cómo presentamos base + módulos de forma que se entienda en 10 segundos. Cómo se ve la página de precios.
4. **El embudo.** Cómo llega alguien desde que nos conoce hasta que paga, y después hasta que suma su primer módulo.
5. **Los canales.** Qué hacemos con Gina, qué hacemos con el instituto de Ignacio, qué contenido creamos, en qué orden.
6. **El plan de lanzamiento.** Qué pasa las primeras 4 semanas, con las 3 clínicas beta.
7. **Las métricas.** Qué medimos. Considerando lo que te dije: la métrica que importa no es solo adquisición.

### Cómo quiero que trabajes

- **Preguntame lo que te falte antes de asumir.** Prefiero que me hagas 3 preguntas buenas a que inventes contexto.
- **Sé concreto.** No quiero "crear contenido de valor", quiero "3 videos de 40 segundos mostrando al agente agendando una cita real, publicados en Instagram y TikTok".
- **Marcá los supuestos.** Si algo depende de una decisión que no tomé, decilo.
- **Desafiá lo que propuse.** Si el modelo modular tiene un problema que no vi, o si los precios están mal, decímelo. Prefiero descubrirlo ahora.

Empecemos por el posicionamiento y el mensaje central. Cuando eso esté firme, seguimos con el resto.
