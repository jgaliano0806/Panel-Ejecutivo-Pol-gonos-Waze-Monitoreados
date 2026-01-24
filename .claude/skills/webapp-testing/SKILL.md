---
name: webapp-testing
description: Conjunto de herramientas para interactuar y probar aplicaciones web locales usando Playwright. Permite verificar la funcionalidad del frontend, depurar el comportamiento de la UI, capturar capturas de pantalla del navegador y ver los registros (logs) del navegador.
license: Términos completos en LICENSE.txt
---

# Pruebas de Aplicaciones Web

Para probar aplicaciones web locales, escribe scripts nativos de Playwright en Python.

**Scripts de Ayuda Disponibles**:

- `scripts/with_server.py` - Gestiona el ciclo de vida del servidor (admite múltiples servidores).

**Ejecuta siempre los scripts con `--help` primero** para ver su uso. NO leas el código fuente hasta que hayas intentado ejecutar el script primero y descubras que una solución personalizada es absolutamente necesaria. Estos scripts pueden ser muy grandes y, por lo tanto, contaminar tu ventana de contexto. Existen para ser llamados directamente como scripts de "caja negra" en lugar de ser ingeridos en tu ventana de contexto.

## Árbol de Decisión: Eligiendo tu Enfoque

```
Tarea del usuario → ¿Es HTML estático?
    ├─ Sí → Lee el archivo HTML directamente para identificar selectores
    │         ├─ Éxito → Escribe el script de Playwright usando los selectores
    │         └─ Fallo/Incompleto → Trátalo como dinámico (ver abajo)
    │
    └─ No (webapp dinámica) → ¿Está el servidor ya en ejecución?
        ├─ No → Ejecuta: python scripts/with_server.py --help
        │        Luego usa el ayudante + escribe un script de Playwright simplificado
        │
        └─ Sí → Reconocimiento-y-acción:
            1. Navega y espera a 'networkidle'
            2. Toma una captura de pantalla o inspecciona el DOM
            3. Identifica selectores a partir del estado renderizado
            4. Ejecuta acciones con los selectores descubiertos
```

## Ejemplo: Usando with_server.py

Para iniciar un servidor, ejecuta `--help` primero, luego usa el ayudante:

**Un solo servidor:**

```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python tu_automatizacion.py
```

**Múltiples servidores (ej., backend + frontend):**

```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python tu_automatizacion.py
```

Para crear un script de automatización, incluye solo la lógica de Playwright (los servidores se gestionan automáticamente):

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True) # Lanza siempre chromium en modo headless
    page = browser.new_page()
    page.goto('http://localhost:5173') # El servidor ya está en ejecución y listo
    page.wait_for_load_state('networkidle') # CRÍTICO: Espera a que el JS se ejecute
    # ... tu lógica de automatización
    browser.close()
```

## Patrón Reconocimiento-y-Acción

1. **Inspeccionar el DOM renderizado**:

   ```python
   page.screenshot(path='/tmp/inspeccion.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identificar selectores** a partir de los resultados de la inspección.

3. **Ejecutar acciones** usando los selectores descubiertos.

## Error Común

❌ **No** inspecciones el DOM antes de esperar a que ocurra `networkidle` en aplicaciones dinámicas.
✅ **Sí** espera a `page.wait_for_load_state('networkidle')` antes de la inspección.

## Mejores Prácticas

- **Usa los scripts incluidos como cajas negras** - Para llevar a cabo una tarea, considera si alguno de los scripts disponibles en `scripts/` puede ayudarte. Estos scripts manejan flujos de trabajo comunes y complejos de manera confiable sin saturar la ventana de contexto. Usa `--help` para ver su uso y luego invócalos directamente.
- Usa `sync_playwright()` para scripts síncronos.
- Cierra siempre el navegador al terminar.
- Usa selectores descriptivos: `text=`, `role=`, selectores CSS o IDs.
- Añade las esperas adecuadas: `page.wait_for_selector()` o `page.wait_for_timeout()`.

## Archivos de Referencia

- **examples/** - Ejemplos que muestran patrones comunes:
  - `element_discovery.py` - Descubrimiento de botones, enlaces y entradas en una página.
  - `static_html_automation.py` - Uso de URLs file:// para HTML local.
  - `console_logging.py` - Captura de registros de consola durante la automatización.
