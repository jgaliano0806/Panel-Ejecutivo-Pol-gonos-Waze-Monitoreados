---
name: logging-best-practices
description: Mejores prácticas de registro (logging) centradas en eventos amplios (wide events) para una depuración y análisis potentes.
license: MIT
metadata:
  author: boristane
  version: "1.0.0"
---

# Skill de Mejores Prácticas de Registro (Logging)

Versión: 1.0.0

## Propósito

Este skill proporciona pautas para implementar un registro efectivo en las aplicaciones. Se centra en los **eventos amplios** (también llamados líneas de registro canónicas), un patrón en el que se emite un único evento rico en contexto por solicitud y por servicio, lo que permite una depuración y análisis potentes.

## Cuándo Aplicar

Aplica estas pautas cuando:

- Escribas o revises código de registro.
- Añadas `console.log`, `logger.info` o similares.
- Diseñes la estrategia de registro para nuevos servicios.
- Configures la infraestructura de registro.

## Principios Fundamentales

### 1. Eventos Amplios (CRÍTICO)

Emite **un evento rico en contexto por solicitud por servicio**. En lugar de dispersar líneas de registro por todo el manejador (handler), consolida todo en un único evento estructurado emitido al completar la solicitud.

```typescript
const wideEvent: Record<string, unknown> = {
  method: "POST",
  path: "/checkout",
  requestId: c.get("requestId"),
  timestamp: new Date().toISOString(),
};

try {
  const user = await getUser(c.get("userId"));
  wideEvent.user = { id: user.id, subscription: user.subscription };

  const cart = await getCart(user.id);
  wideEvent.cart = { total_cents: cart.total, item_count: cart.items.length };

  wideEvent.status_code = 200;
  wideEvent.outcome = "success";
  return c.json({ success: true });
} catch (error) {
  wideEvent.status_code = 500;
  wideEvent.outcome = "error";
  wideEvent.error = { message: error.message, type: error.name };
  throw error;
} finally {
  wideEvent.duration_ms = Date.now() - startTime;
  logger.info(wideEvent);
}
```

### 2. Alta Cardinalidad y Dimensionalidad (CRÍTICO)

Incluye campos con alta cardinalidad (IDs de usuario, IDs de solicitud - millones de valores únicos) y alta dimensionalidad (muchos campos por evento). Esto permite realizar consultas por usuarios específicos y responder preguntas que aún no habías anticipado.

### 3. Contexto de Negocio (CRÍTICO)

Incluye siempre contexto de negocio: nivel de suscripción del usuario, valor del carrito, flags de características, antigüedad de la cuenta. El objetivo es saber que "un cliente premium no pudo completar una compra de $2,499", no solo que "falló el pago".

### 4. Características del Entorno (CRÍTICO)

Incluye información del entorno y del despliegue en cada evento: hash del commit, versión del servicio, región, ID de la instancia. Esto permite correlacionar problemas con los despliegues e identificar problemas específicos de una región.

### 5. Registrador Único (ALTO)

Usa una única instancia de registrador (logger) configurada al inicio e impórtala en todas partes. Esto asegura un formato consistente y contexto automático del entorno.

### 6. Patrón Middleware (ALTO)

Usa middleware para manejar la infraestructura de los eventos amplios (tiempos, estado, entorno, emisión). Los manejadores solo deben añadir contexto de negocio.

### 7. Estructura y Consistencia (ALTO)

- Usa el formato JSON de manera consistente.
- Mantén nombres de campos consistentes en todos los servicios.
- Simplifica a dos niveles de registro: `info` y `error`.
- Nunca registres cadenas de texto no estructuradas.

## Anti-patrones a Evitar

1. **Registros dispersos**: Múltiples llamadas a `console.log()` por solicitud.
2. **Múltiples registradores**: Diferentes instancias de registros en diferentes archivos.
3. **Falta de contexto del entorno**: Sin hash de commit o info de despliegue.
4. **Falta de contexto de negocio**: Registrar detalles técnicos sin datos del usuario/negocio.
5. **Cadenas no estructuradas**: `console.log('pasó algo')` en lugar de datos estructurados.
6. **Esquemas inconsistentes**: Diferentes nombres de campos en los servicios.

## Pautas

### Eventos Amplios (`rules/wide-events.md`)

- Emite un evento amplio por cada salto de servicio.
- Incluye todo el contexto relevante.
- Conecta los eventos con el ID de la solicitud.
- Emite al finalizar la solicitud en un bloque `finally`.

### Contexto (`rules/context.md`)

- Soporta campos de alta cardinalidad (user_id, request_id).
- Incluye alta dimensionalidad (muchos campos).
- Incluye siempre contexto de negocio.
- Incluye siempre características del entorno (commit_hash, version, region).

### Estructura (`rules/structure.md`)

- Usa un único registrador en toda la base de código.
- Usa middleware para eventos amplios consistentes.
- Usa formato JSON.
- Mantén un esquema consistente.
- Simplifica a niveles de info y error.
- Nunca registres cadenas no estructuradas.

### Errores Comunes (`rules/pitfalls.md`)

- Evita múltiples líneas de registro por solicitud.
- Diseña para las "incógnitas desconocidas" (unknown unknowns).
- Propaga siempre los IDs de solicitud entre servicios.

Referencias:

- [Logging Sucks](https://loggingsucks.com)
- [Observability Wide Events 101](https://boristane.com/blog/observability-wide-events-101/)
- [Stripe - Canonical Log Lines](https://stripe.com/blog/canonical-log-lines)
