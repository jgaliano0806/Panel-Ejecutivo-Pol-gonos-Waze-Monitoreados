---
name: code-review-excellence
description: Domina las prácticas efectivas de revisión de código para proporcionar comentarios constructivos, detectar errores a tiempo y fomentar el intercambio de conocimientos, manteniendo la moral del equipo. Úsalo al revisar pull requests, establecer estándares de revisión o mentorizar desarrolladores.
---

# Excelencia en la Revisión de Código

Transforma las revisiones de código de una simple labor de "portero" a un intercambio de conocimientos mediante feedback constructivo, análisis sistemático y mejora colaborativa.

## Cuándo usar este Skill

- Al revisar pull requests y cambios de código.
- Al establecer estándares de revisión de código para equipos.
- Al mentorizar a desarrolladores junior a través de revisiones.
- Al realizar revisiones de arquitectura.
- Al crear listas de verificación (checklists) y guías de revisión.
- Al mejorar la colaboración del equipo.
- Al reducir el tiempo del ciclo de revisión de código.
- Al mantener los estándares de calidad del código.

## Principios Fundamentales

### 1. La Mentalidad del Revisor

**Objetivos de la Revisión de Código:**

- Detectar errores (bugs) y casos de borde.
- Asegurar la mantenibilidad del código.
- Compartir conocimientos en todo el equipo.
- Hacer cumplir los estándares de codificación.
- Mejorar el diseño y la arquitectura.
- Construir cultura de equipo.

**Lo que NO son objetivos:**

- Alardear de conocimientos.
- Criticar minucias de formato (usa linters para eso).
- Bloquear el progreso innecesariamente.
- Reescribir el código según tu preferencia personal.

### 2. Feedback Efectivo

**Un buen Feedback es:**

- Específico y accionable.
- Educativo, no crítico.
- Centrado en el código, no en la persona.
- Equilibrado (elogia también el buen trabajo).
- Priorizado (crítico vs. deseable).

```markdown
❌ Mal: "Esto está mal."
✅ Bien: "Esto podría causar una condición de carrera cuando varios usuarios
acceden simultáneamente. Considera usar un mutex aquí."

❌ Mal: "¿Por qué no usaste el patrón X?"
✅ Bien: "¿Has considerado el patrón Repository? Facilitaría las pruebas.
Aquí tienes un ejemplo: [enlace]"

❌ Mal: "Renombra esta variable."
✅ Bien: "[nit] Considera usar `userCount` en lugar de `uc` para mayor claridad.
No bloquea si prefieres mantenerlo así."
```

### 3. Alcance de la Revisión

**Qué revisar:**

- Corrección lógica y casos de borde.
- Vulnerabilidades de seguridad.
- Implicaciones de rendimiento.
- Cobertura y calidad de las pruebas.
- Manejo de errores.
- Documentación y comentarios.
- Diseño de API y nomenclatura.
- Ajuste arquitectónico.

**Qué NO revisar manualmente:**

- Formato del código (usa Prettier, Black, etc.).
- Organización de las importaciones.
- Violaciones de linting.
- Errores tipográficos simples.

## Proceso de Revisión

### Fase 1: Recopilación de Contexto (2-3 minutos)

```markdown
Antes de sumergirte en el código, asegúrate de:

1. Leer la descripción del PR y el ticket/issue vinculado.
2. Comprobar el tamaño del PR (¿más de 400 líneas? Pide dividirlo).
3. Revisar el estado de CI/CD (¿pasan las pruebas?).
4. Entender el requisito de negocio.
5. Anotar cualquier decisión arquitectónica relevante.
```

### Fase 2: Revisión de Alto Nivel (5-10 minutos)

```markdown
1. **Arquitectura y Diseño**
   - ¿Se ajusta la solución al problema?
   - ¿Existen enfoques más sencillos?
   - ¿Es coherente con los patrones existentes?
   - ¿Escalará correctamente?

2. **Organización de Archivos**
   - ¿Están los nuevos archivos en los lugares correctos?
   - ¿Está el código agrupado lógicamente?
   - ¿Hay archivos duplicados?

3. **Estrategia de Pruebas**
   - ¿Existen pruebas?
   - ¿Cubren las pruebas los casos de borde?
   - ¿Son legibles las pruebas?
```

### Fase 3: Revisión Línea por Línea (10-20 minutos)

```markdown
Para cada archivo:

1. **Lógica y Corrección**
   - ¿Se han gestionado los casos de borde?
   - ¿Hay errores de "desfase por uno" (off-by-one)?
   - ¿Se comprueban nulos/indefinidos?
   - ¿Hay condiciones de carrera?

2. **Seguridad**
   - ¿Validación de entradas?
   - ¿Riesgos de inyección SQL?
   - ¿Vulnerabilidades XSS?
   - ¿Exposición de datos sensibles?

3. **Rendimiento**
   - ¿Consultas N+1?
   - ¿Bucles innecesarios?
   - ¿Fugas de memoria?
   - ¿Operaciones bloqueantes?

4. **Mantenibilidad**
   - ¿Nombres de variables claros?
   - ¿Funciones que hacen una sola cosa?
   - ¿Código complejo comentado?
   - ¿Se han extraído los "números mágicos"?
```

### Fase 4: Resumen y Decisión (2-3 minutos)

```markdown
1. Resume las preocupaciones principales.
2. Destaca lo que te ha gustado.
3. Toma una decisión clara:
   - ✅ Aprobar (Approve)
   - 💬 Comentar (sugerencias menores)
   - 🔄 Solicitar Cambios (obligatorio abordarlos)
4. Ofrece realizar un "pair programming" si es complejo.
```

## Técnicas de Revisión

### Técnica 1: El Método de la Lista de Verificación (Checklist)

```markdown
## Lista de Seguridad

- [ ] Entradas de usuario validadas y saneadas.
- [ ] Consultas SQL parametrizadas.
- [ ] Verificación de autenticación/autorización.
- [ ] Secretos no escritos directamente en el código (hardcoded).
- [ ] Mensajes de error que no filtran información sensible.

## Lista de Rendimiento

- [ ] Sin consultas N+1.
- [ ] Consultas de base de datos indexadas.
- [ ] Listas grandes paginadas.
- [ ] Operaciones costosas cacheadas.
- [ ] No hay E/S bloqueante en rutas críticas (hot paths).

## Lista de Pruebas

- [ ] Camino principal (happy path) probado.
- [ ] Casos de borde cubiertos.
- [ ] Casos de error probados.
- [ ] Los nombres de las pruebas son descriptivos.
- [ ] Las pruebas son deterministas.
```

### Técnica 2: El Enfoque Basado en Preguntas

En lugar de señalar problemas directamente, haz preguntas para fomentar la reflexión:

```markdown
❌ "Esto fallará si la lista está vacía."
✅ "¿Qué ocurre si `items` es un array vacío?"

❌ "Necesitas manejar los errores aquí."
✅ "¿Cómo debería comportarse esto si la llamada a la API falla?"

❌ "Esto es ineficiente."
✅ "Veo que esto recorre todos los usuarios. ¿Hemos considerado el
impacto en el rendimiento con 100.000 usuarios?"
```

### Técnica 3: Sugerir, No Mandar

```markdown
## Usa un Lenguaje Colaborativo

❌ "Debes cambiar esto para usar async/await"
✅ "Sugerencia: async/await podría hacer esto más legible:
`typescript
    async function fetchUser(id: string) {
        const user = await db.query('SELECT * FROM users WHERE id = ?', id);
        return user;
    }
    `
¿Qué te parece?"

❌ "Extrae esto a una función"
✅ "Esta lógica aparece en 3 lugares. ¿Tendría sentido extraerla
a una función de utilidad compartida?"
```

### Técnica 4: Diferenciar la Severidad

```markdown
Usa etiquetas para indicar la prioridad:

🔴 [blocking] - Debe corregirse antes de fusionar.
🟡 [important] - Debería corregirse, comenta si no estás de acuerdo.
🟢 [nit] - Deseable pero no bloqueante.
💡 [suggestion] - Enfoque alternativo a considerar.
📚 [learning] - Comentario educativo, no requiere acción.
🎉 [praise] - ¡Buen trabajo, sigue así!

Ejemplo:
"🔴 [blocking] Esta consulta SQL es vulnerable a inyección.
Por favor, usa consultas parametrizadas."

"🟢 [nit] Considera renombrar `data` a `userData` para mayor claridad."

"🎉 [praise] ¡Excelente cobertura de pruebas! Esto detectará casos de borde."
```

## Patrones Específicos por Lenguaje

### Revisión de Código Python

```python
# Comprobación de problemas específicos de Python

# ❌ Argumentos predeterminados mutables
def add_item(item, items=[]):  # ¡Error! Compartido entre llamadas
    items.append(item)
    return items

# ✅ Usar None como predeterminado
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

# ❌ Captura demasiado amplia (too broad)
try:
    result = risky_operation()
except:  # ¡Captura todo, incluso KeyboardInterrupt!
    pass

# ✅ Capturar excepciones específicas
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Valor inválido: {e}")
    raise

# ❌ Atributos de clase mutables
class User:
    permissions = []  # ¡Compartido entre todas las instancias!

# ✅ Inicializar en __init__
class User:
    def __init__(self):
        self.permissions = []
```

### Revisión de Código TypeScript/JavaScript

```typescript
// Comprobación de problemas específicos de TypeScript

// ❌ Usar any anula la seguridad de tipos
function processData(data: any) {  // Evita any
    return data.value;
}

// ✅ Usar tipos adecuados
interface DataPayload {
    value: string;
}
function processData(data: DataPayload) {
    return data.value;
}

// ❌ No manejar errores asíncronos
async function fetchUser(id: string) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();  // ¿Y si la red falla?
}

// ✅ Manejar errores correctamente
async function fetchUser(id: string): Promise<User> {
    try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        throw error;
    }
}

// ❌ Mutación de props
function UserProfile({ user }: Props) {
    user.lastViewed = new Date();  // ¡Mutando una prop!
    return <div>{user.name}</div>;
}

// ✅ No mutar props
function UserProfile({ user, onView }: Props) {
    useEffect(() => {
        onView(user.id);  // Avisar al padre para que actualice
    }, [user.id]);
    return <div>{user.name}</div>;
}
```

## Patrones de Revisión Avanzados

### Patrón 1: Revisión Arquitectónica

```markdown
Al revisar cambios significativos:

1. **Documento de Diseño Primero**
   - Para características grandes, solicita un documento de diseño antes del código.
   - Revisa el diseño con el equipo antes de la implementación.
   - Acuerda un enfoque para evitar retrabajo (rework).

2. **Revisar en Etapas**
   - 1er PR: Abstracciones e interfaces principales.
   - 2do PR: Implementación.
   - 3er PR: Integración y pruebas.
   - Más fácil de revisar, más rápido para iterar.

3. **Considerar Alternativas**
   - "¿Hemos considerado usar [patrón/librería]?"
   - "¿Cuál es la compensación (tradeoff) vs. el enfoque más simple?"
   - "¿Cómo evolucionará esto a medida que cambien los requisitos?"
```

### Patrón 2: Revisión de la Calidad de las Pruebas

```typescript
// ❌ Prueba deficiente: Probando detalles de implementación
test('incrementa la variable del contador', () => {
    const component = render(<Counter />);
    const button = component.getByRole('button');
    fireEvent.click(button);
    expect(component.state.counter).toBe(1);  // Probando el estado interno
});

// ✅ Buena prueba: Probando el comportamiento
test('muestra el contador incrementado cuando se hace clic', () => {
    render(<Counter />);
    const button = screen.getByRole('button', { name: /incrementar/i });
    fireEvent.click(button);
    expect(screen.getByText('Contador: 1')).toBeInTheDocument();
});

// Preguntas de revisión para las pruebas:
// - ¿Las pruebas describen el comportamiento, no la implementación?
// - ¿Son los nombres de las pruebas claros y descriptivos?
// - ¿Cubren las pruebas los casos de borde?
// - ¿Son las pruebas independientes (sin estado compartido)?
// - ¿Pueden ejecutarse las pruebas en cualquier orden?
```

### Patrón 3: Revisión de Seguridad

```markdown
## Lista de Revisión de Seguridad

### Autenticación y Autorización

- [ ] ¿Se requiere autenticación donde es necesario?
- [ ] ¿Hay comprobaciones de autorización antes de cada acción?
- [ ] ¿Es correcta la validación de JWT (firma, expiración)?
- [ ] ¿Están las claves de API/secretos debidamente protegidos?

### Validación de Entradas

- [ ] ¿Se validan todas las entradas de usuario?
- [ ] ¿Subida de archivos restringida (tamaño, tipo)?
- [ ] ¿Consultas SQL parametrizadas?
- [ ] ¿Protección XSS (escapado de salida)?

### Protección de Datos

- [ ] ¿Contraseñas hasheadas (bcrypt/argon2)?
- [ ] ¿Datos sensibles encriptados en reposo?
- [ ] ¿HTTPS obligatorio para datos sensibles?
- [ ] ¿Gestión de PII conforme a la normativa?

### Vulnerabilidades Comunes

- [ ] ¿Nada de eval() o ejecución dinámica similar?
- [ ] ¿Sin secretos hardcoded?
- [ ] ¿Protección CSRF para operaciones que cambian el estado?
- [ ] ¿Límite de tasa (rate limiting) en endpoints públicos?
```

## Cómo Proporcionar Feedback Difícil

### Patrón: El Método Sándwich (Modificado)

```markdown
Tradicional: Elogio + Crítica + Elogio (se siente falso)

Mejor: Contexto + Problema Específico + Solución Útil

Ejemplo:
"He notado que la lógica de procesamiento de pagos está directamente en el
controlador. Esto hace que sea más difícil de probar y reutilizar.

[Problema Específico]
La función calcularTotal() mezcla el cálculo de impuestos, la lógica de
descuentos y las consultas a la base de datos, lo que dificulta las pruebas
unitarias y la comprensión del flujo.

[Solución Útil]
¿Podríamos extraer esto a una clase PaymentService? Eso permitiría probarlo
y reutilizarlo más fácilmente. Puedo acompañarte en esto si te resulta útil."
```

### Gestión de Desacuerdos

```markdown
Cuando el autor no está de acuerdo con tu feedback:

1. **Intenta Comprender**
   "Ayúdame a entender tu enfoque. ¿Qué te llevó a elegir este patrón?"

2. **Reconoce los Puntos Válidos**
   "Es un buen punto sobre X. No lo había considerado."

3. **Proporciona Datos**
   "Me preocupa el rendimiento. ¿Podemos añadir un benchmark para
   validar el enfoque?"

4. **Escala si es Necesario**
   "Pidamos la opinión de [arquitecto/desarrollador senior] sobre esto."

5. **Sabe Cuándo Ceder**
   Si el código funciona y no es un problema crítico, apruébalo.
   La perfección es enemiga del progreso.
```

## Mejores Prácticas

1. **Revisa con Prontitud**: En menos de 24 horas, idealmente el mismo día.
2. **Limita el Tamaño del PR**: Máximo de 200-400 líneas para una revisión efectiva.
3. **Revisa en Bloques de Tiempo**: Máximo 60 minutos, haz descansos.
4. **Usa Herramientas de Revisión**: GitHub, GitLab o herramientas dedicadas.
5. **Automatiza lo que Puedas**: Linters, formateadores, escaneos de seguridad.
6. **Construye Rapport**: Los emojis, los elogios y la empatía son importantes.
7. **Estate Disponible**: Ofrécete a programar en pareja (pair programming) en temas complejos.
8. **Aprende de los Demás**: Revisa los comentarios de revisión de otros compañeros.

## Errores Comunes (Pitfalls)

- **Perfeccionismo**: Bloquear PRs por preferencias menores de estilo personal.
- **Alcance Incremental (Scope Creep)**: "Ya que estás con eso, ¿podrías también...?"
- **Inconsistencia**: Aplicar estándares diferentes para personas diferentes.
- **Revisiones Retrasadas**: Dejar que los PRs se queden parados durante días.
- **Desaparecer (Ghosting)**: Solicitar cambios y luego no responder.
- **Aprobar sin Mirar (Rubber Stamping)**: Aprobar sin haber revisado realmente.
- **Debatir lo Trivial (Bike Shedding)**: Discutir detalles triviales extensamente.

## Plantillas

### Plantilla de Comentario de Revisión de PR

```markdown
## Resumen

[Breve descripción de lo que se ha revisado]

## Puntos Fuertes

- [Qué se ha hecho bien]
- [Buenos patrones o enfoques utilizados]

## Cambios Requeridos

🔴 [Asunto bloqueante 1]
🔴 [Asunto bloqueante 2]

## Sugerencias

💡 [Mejora 1]
💡 [Mejora 2]

## Preguntas

❓ [Se necesita aclaración sobre X]
❓ [Consideración de enfoque alternativo]

## Veredicto

✅ Aprobar después de abordar los cambios requeridos.
```

## Recursos

- **references/code-review-best-practices.md**: Guías completas de revisión.
- **references/common-bugs-checklist.md**: Errores comunes por lenguaje a vigilar.
- **references/security-review-guide.md**: Lista de verificación centrada en seguridad.
- **assets/pr-review-template.md**: Plantilla estándar de comentarios de revisión.
- **assets/review-checklist.md**: Lista de verificación de referencia rápida.
- **scripts/pr-analyzer.py**: Analiza la complejidad del PR y sugiere revisores.
