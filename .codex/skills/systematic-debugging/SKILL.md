---
name: systematic-debugging
description: Úsalo cuando encuentres cualquier error (bug), fallo en las pruebas o comportamiento inesperado, antes de proponer soluciones.
---

# Depuración Sistemática

## Descripción General

Las soluciones aleatorias desperdician tiempo y crean nuevos errores. Los parches rápidos ocultan problemas subyacentes.

**Principio fundamental:** SIEMPRE encuentra la causa raíz antes de intentar solucionar nada. Arreglar solo los síntomas es un fracaso.

**Violar la letra de este proceso es violar el espíritu de la depuración.**

## La Ley de Hierro

```
NO HAY ARREGLOS SIN UNA INVESTIGACIÓN PREVIA DE LA CAUSA RAÍZ
```

Si no has completado la Fase 1, no puedes proponer soluciones.

## Cuándo usar

Úsalo para CUALQUIER problema técnico:

- Fallos en las pruebas.
- Errores en producción.
- Comportamientos inesperados.
- Problemas de rendimiento.
- Fallos en la compilación (build).
- Problemas de integración.

**Úsalo ESPECIALMENTE cuando:**

- Estés bajo presión de tiempo (las emergencias hacen que adivinar sea tentador).
- "Solo un arreglo rápido" parezca obvio.
- Ya hayas intentado múltiples soluciones.
- El arreglo anterior no funcionó.
- No entiendas completamente el problema.

**No te lo saltes cuando:**

- El problema parezca simple (los errores simples también tienen causas raíz).
- Tengas prisa (las prisas garantizan tener que repetir el trabajo).
- El responsable quiera que se arregle ¡YA! (lo sistemático es más rápido que dar palos de ciego).

## Las Cuatro Fases

DEBES completar cada fase antes de pasar a la siguiente.

### Fase 1: Investigación de la Causa Raíz

**ANTES de intentar CUALQUIER arreglo:**

1. **Lee los mensajes de error cuidadosamente**
   - No ignores los errores o advertencias.
   - A menudo contienen la solución exacta.
   - Lee las trazas de la pila (stack traces) completamente.
   - Anota números de línea, rutas de archivos y códigos de error.

2. **Reproduce el error de forma consistente**
   - ¿Puedes provocarlo de manera fiable?
   - ¿Cuáles son los pasos exactos?
   - ¿Sucede siempre?
   - Si no es reproducible → reúne más datos, no adivines.

3. **Revisa los cambios recientes**
   - ¿Qué ha cambiado que pueda causar esto?
   - Git diff, commits recientes.
   - Nuevas dependencias, cambios de configuración.
   - Diferencias ambientales (entorno).

4. **Reune evidencias en sistemas multicomponente**

   **CUANDO el sistema tiene múltiples componentes (CI → build → firma, API → servicio → base de datos):**

   **ANTES de proponer arreglos, añade instrumentación de diagnóstico:**

   ```
   Para CADA límite de componente:
     - Registra (log) qué datos entran al componente.
     - Registra (log) qué datos salen del componente.
     - Verifica la propagación del entorno/configuración.
     - Comprueba el estado en cada capa.

   Ejecuta una vez para reunir evidencias que muestren DÓNDE se rompe.
   LUEGO analiza las evidencias para identificar el componente que falla.
   LUEGO investiga ese componente específico.
   ```

   **Ejemplo (sistema multicapa):**

   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **Esto revela:** Qué capa falla (secretos → workflow ✓, workflow → build ✗).

5. **Rastrea el flujo de datos**

   **CUANDO el error está profundo en la pila de llamadas:**

   Consulta `root-cause-tracing.md` en este directorio para ver la técnica completa de rastreo hacia atrás.

   **Versión rápida:**
   - ¿Dónde se origina el valor incorrecto?
   - ¿Qué llamó a esto con ese valor incorrecto?
   - Sigue rastreando hacia arriba hasta encontrar el origen.
   - Arregla el origen, no el síntoma.

### Fase 2: Análisis de Patrones

**Encuentra el patrón antes de arreglar nada:**

1. **Busca ejemplos que funcionen**
   - Localiza código similar que funcione en la misma base de código.
   - ¿Qué es lo que sí funciona y es similar a lo que está roto?

2. **Compara con las referencias**
   - Si estás implementando un patrón, lee la implementación de referencia COMPLETAMENTE.
   - No leas por encima: lee cada línea.
   - Entiende el patrón totalmente antes de aplicarlo.

3. **Identifica las diferencias**
   - ¿Qué hay de diferente entre lo que funciona y lo que está roto?
   - Haz una lista de cada diferencia, por pequeña que sea.
   - No asumas que "eso no puede importar".

4. **Entiende las dependencias**
   - ¿Qué otros componentes necesita esto?
   - ¿Qué ajustes, configuración o entorno?
   - ¿Qué suposiciones hace?

### Fase 3: Hipótesis y Pruebas

**Método científico:**

1. **Formular una única hipótesis**
   - Declárala con claridad: "Creo que X es la causa raíz debido a Y".
   - Escríbela.
   - Sé específico, no vago.

2. **Probar de forma mínima**
   - Realiza el cambio MÁS PEQUEÑO posible para probar la hipótesis.
   - Una variable a la vez.
   - No arregles varias cosas a la vez.

3. **Verificar antes de continuar**
   - ¿Funcionó? Sí → Pasar a la Fase 4.
   - ¿No funcionó? Formula una NUEVA hipótesis.
   - NO añadas más arreglos encima.

4. **Cuando no lo sepas**
   - Di: "No entiendo X".
   - No pretendas saberlo.
   - Pide ayuda.
   - Investiga más.

### Fase 4: Implementación

**Arregla la causa raíz, no el síntoma:**

1. **Crea un caso de prueba que falle**
   - La reproducción más simple posible.
   - Prueba automatizada si se puede.
   - Script de prueba único si no hay un framework.
   - DEBES tenerla antes de arreglar nada.
   - Usa el skill `superpowers:test-driven-development` para escribir pruebas que fallen correctamente.

2. **Implementa un único arreglo**
   - Ataca la causa raíz identificada.
   - UN solo cambio a la vez.
   - Nada de mejoras de "ya que estoy aquí".
   - Nada de refactorizaciones combinadas.

3. **Verifica el arreglo**
   - ¿Pasa la prueba ahora?
   - ¿Se han roto otras pruebas?
   - ¿Se ha resuelto realmente el problema?

4. **Si el arreglo no funciona**
   - DETENTE.
   - Cuenta: ¿Cuántos arreglos has intentado ya?
   - Si son < 3: Vuelve a la Fase 1, reanaliza con la nueva información.
   - **Si son ≥ 3: DETENTE y cuestiona la arquitectura (paso 5 abajo).**
   - NO intentes el arreglo nº 4 sin una discusión arquitectónica.

5. **Si han fallado más de 3 arreglos: Cuestiona la arquitectura**

   **Patrones que indican un problema arquitectónico:**
   - Cada arreglo revela un nuevo estado compartido/acoplamiento/problema en un lugar diferente.
   - Los arreglos requieren una "refactorización masiva" para implementarse.
   - Cada arreglo crea nuevos síntomas en otros lugares.

   **DETENTE y cuestiona lo fundamental:**
   - ¿Es este patrón fundamentalmente sólido?
   - ¿Estamos "siguiendo con él por pura inercia"?
   - ¿Deberíamos refactorizar la arquitectura en lugar de seguir arreglando síntomas?

   **Habla con tu compañero humano antes de intentar más arreglos.**

   Esto NO es una hipótesis fallida: es una arquitectura incorrecta.

## Banderas Rojas - DETENTE y sigue el proceso

Si te descubres pensando:

- "Arreglo rápido por ahora, investigaré luego".
- "Solo probaré a cambiar X y veré si funciona".
- "Añadiré varios cambios y ejecutaré las pruebas".
- "Saltarse la prueba, lo verificaré manualmente".
- "Probablemente es X, déjame arreglarlo".
- "No lo entiendo del todo, pero esto podría funcionar".
- "El patrón dice X, pero lo adaptaré de otra forma".
- "Aquí están los problemas principales: [lista de arreglos sin investigación]".
- Proponer soluciones antes de rastrear el flujo de datos.
- **"Un intento de arreglo más" (cuando ya has probado 2 o más).**
- **Cada arreglo revela un nuevo problema en un lugar diferente.**

**TODO esto significa: DETENTE. Vuelve a la Fase 1.**

**Si han fallado más de 3 arreglos:** Cuestiona la arquitectura (ver Fase 4.5).

## Señales de tu compañero humano de que lo estás haciendo mal

**Atento a estas redirecciones:**

- "¿No está pasando eso?" - Has asumido algo sin verificarlo.
- "¿Nos mostrará...?" - Deberías haber añadido obtención de evidencias.
- "Deja de adivinar" - Estás proponiendo arreglos sin entender.
- "Piénsalo a fondo" - Cuestiona lo fundamental, no solo los síntomas.
- "¿Estamos atascados?" (con frustración) - Tu enfoque no está funcionando.

**Cuando veas esto:** DETENTE. Vuelve a la Fase 1.

## Racionalizaciones Comunes

| Excusa                                                       | Realidad                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| "El problema es simple, no necesito el proceso"              | Los problemas simples también tienen causas raíz. El proceso es rápido para errores sencillos. |
| "Es una emergencia, no hay tiempo para el proceso"           | La depuración sistemática es MÁS RÁPIDA que el "adivinar y probar".                            |
| "Solo probaré esto primero y luego investigaré"              | El primer arreglo establece el patrón. Hazlo bien desde el principio.                          |
| "Escribiré la prueba tras confirmar que el arreglo funciona" | Los arreglos sin pruebas no duran. La prueba primero lo demuestra.                             |
| "Varios arreglos a la vez ahorran tiempo"                    | No podrás aislar qué funcionó. Causa nuevos errores.                                           |
| "La referencia es muy larga, adaptaré el patrón"             | Un entendimiento parcial garantiza errores. Léela completamente.                               |
| "Veo el problema, déjame arreglarlo"                         | Ver los síntomas ≠ entender la causa raíz.                                                     |
| "Un intento de arreglo más" (tras 2+ fallos)                 | 3+ fallos = problema arquitectónico. Cuestiona el patrón, no vuelvas a arreglar.               |

## Referencia Rápida

| Fase                  | Actividades Clave                                            | Criterio de Éxito             |
| --------------------- | ------------------------------------------------------------ | ----------------------------- |
| **1. Causa Raíz**     | Leer errores, reproducir, revisar cambios, reunir evidencias | Entender QUÉ y POR QUÉ        |
| **2. Patrón**         | Buscar ejemplos que funcionen, comparar                      | Identificar diferencias       |
| **3. Hipótesis**      | Formular teoría, probar mínimamente                          | Hipótesis confirmada o nueva  |
| **4. Implementación** | Crear prueba, arreglar, verificar                            | Error resuelto, pruebas pasan |

## Cuando el proceso revela que "no hay causa raíz"

Si la investigación sistemática revela que el problema es puramente ambiental, dependiente del tiempo (timing) o externo:

1. Has completado el proceso.
2. Documenta lo que has investigado.
3. Implementa el manejo adecuado (reintento, tiempo de espera, mensaje de error).
4. Añade monitoreo/registro (logs) para futuras investigaciones.

**Pero:** El 95% de los casos de "no hay causa raíz" son en realidad investigaciones incompletas.

## Técnicas de apoyo

Estas técnicas forman parte de la depuración sistemática y están disponibles en este directorio:

- **`root-cause-tracing.md`** - Rastrea los errores hacia atrás en la pila de llamadas para encontrar el activador original.
- **`defense-in-depth.md`** - Añade validación en múltiples capas tras encontrar la causa raíz.
- **`condition-based-waiting.md`** - Reemplaza tiempos de espera arbitrarios por sondeos de condiciones.

**Skills relacionados:**

- **superpowers:test-driven-development** - Para crear un caso de prueba que falle (Fase 4, Paso 1).
- **superpowers:verification-before-completion** - Verificar que el arreglo funcionó antes de reclamar el éxito.

## Impacto en el Mundo Real

A partir de sesiones de depuración:

- Enfoque sistemático: 15-30 minutos para arreglar.
- Enfoque de arreglos aleatorios: 2-3 horas de dar palos de ciego.
- Tasa de acierto al primer arreglo: 95% frente al 40%.
- Nuevos errores introducidos: Cercano a cero frente a lo habitual.
