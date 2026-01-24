---
name: crafting-effective-readmes
description: Úsalo al escribir o mejorar archivos README. No todos los README son iguales; proporciona plantillas y orientación adaptadas a tu audiencia y tipo de proyecto.
---

# Creación de READMEs Efectivos

## Descripción General

Los README responden a las preguntas que tendrá tu audiencia. Las distintas audiencias necesitan información diferente: un colaborador de un proyecto de Código Abierto (OSS) necesita un contexto distinto al que necesitas tú mismo cuando vuelvas a abrir una carpeta de configuración dentro de un tiempo.

**Pregunta siempre:** ¿Quién leerá esto y qué necesita saber?

## Proceso

### Paso 1: Identificar la Tarea

**Pregunta:** "¿En qué tarea de README estás trabajando?"

| Tarea             | Cuándo                                                    |
| ----------------- | --------------------------------------------------------- |
| **Creación**      | Nuevo proyecto, aún no tiene README.                      |
| **Adición**       | Necesito documentar algo nuevo.                           |
| **Actualización** | Las capacidades han cambiado, el contenido está obsoleto. |
| **Revisión**      | Comprobar si el README sigue siendo preciso.              |

### Paso 2: Preguntas Específicas de la Tarea

**Al crear el README inicial:**

1. ¿Qué tipo de proyecto es? (ver Tipos de Proyecto abajo).
2. ¿Qué problema resuelve esto en una sola frase?
3. ¿Cuál es el camino más rápido para que "funcione"?
4. ¿Hay algo notable que destacar?

**Al añadir una sección:**

1. ¿Qué necesita ser documentado?
2. ¿Dónde debería ir dentro de la estructura existente?
3. ¿Quién necesita más esta información?

**Al actualizar contenido existente:**

1. ¿Qué ha cambiado?
2. Lee el README actual e identifica las secciones obsoletas.
3. Propón ediciones específicas.

**Al revisar/refrescar:**

1. Lee el README actual.
2. Compáralo con el estado real del proyecto (package.json, archivos principales, etc.).
3. Marca las secciones desactualizadas.
4. Actualiza la fecha de "Última revisión" si está presente.

### Paso 3: Pregunta Siempre

Después de redactar el borrador, pregunta: **"¿Hay algo más que destacar o incluir que se me haya pasado por alto?"**

## Tipos de Proyecto

| Tipo                     | Audiencia                                                     | Secciones Clave                                                     | Plantilla                 |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| **Código Abierto (OSS)** | Colaboradores, usuarios de todo el mundo.                     | Instalación, Uso, Contribución, Licencia.                           | `templates/oss.md`        |
| **Personal**             | Tú mismo en el futuro, reclutadores/visonadores de portfolio. | Qué hace, Stack tecnológico, Aprendizajes.                          | `templates/personal.md`   |
| **Interno**              | Compañeros de equipo, nuevas incorporaciones.                 | Configuración (Setup), Arquitectura, Guías de operación (Runbooks). | `templates/internal.md`   |
| **Configuración**        | Tú mismo en el futuro (confundido).                           | Qué hay aquí, Por qué, Cómo extenderlo, Advertencias (Gotchas).     | `templates/xdg-config.md` |

**Pregunta al usuario** si no está claro. No asumas los valores predeterminados de OSS para todo.

## Secciones Esenciales (Todos los Tipos)

Cualquier README necesita, como mínimo:

1. **Nombre** - Un título descriptivo.
2. **Descripción** - Qué es y por qué existe, en 1 o 2 frases.
3. **Uso** - Cómo utilizarlo (los ejemplos ayudan mucho).

## Referencias

- `section-checklist.md` - Qué secciones incluir según el tipo de proyecto.
- `style-guide.md` - Errores comunes en READMEs y consejos sobre redacción.
- `using-references.md` - Guía para materiales de referencia más profundos.
