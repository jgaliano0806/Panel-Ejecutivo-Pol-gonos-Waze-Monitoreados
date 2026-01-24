---
name: async-python-patterns
description: Domina Python asyncio, programación concurrente y patrones de async/await para aplicaciones de alto rendimiento. Úsalo al construir APIs asincrónicas, sistemas concurrentes o aplicaciones orientadas a E/S que requieren operaciones no bloqueantes.
---

# Patrones de Python Asincrónico (Async Python Patterns)

Guía completa para implementar aplicaciones de Python asincrónicas utilizando asyncio, patrones de programación concurrente y async/await para construir sistemas de alto rendimiento y no bloqueantes.

## Cuándo usar este Skill

- Construcción de APIs web asincrónicas (FastAPI, aiohttp, Sanic).
- Implementación de operaciones de E/S concurrentes (base de datos, archivos, red).
- Creación de scrapers web con solicitudes concurrentes.
- Desarrollo de aplicaciones en tiempo real (servidores WebSocket, sistemas de chat).
- Procesamiento de múltiples tareas independientes simultáneamente.
- Construcción de microservicios con comunicación asincrónica.
- Optimización de cargas de trabajo orientadas a E/S (I/O-bound).
- Implementación de tareas de fondo y colas asincrónicas.

## Conceptos Principales

### 1. Bucle de Eventos (Event Loop)

El bucle de eventos es el corazón de asyncio, encargado de gestionar y programar las tareas asincrónicas.

**Características clave:**

- Multitarea cooperativa en un solo hilo (single-threaded).
- Programa corrutinas para su ejecución.
- Maneja operaciones de E/S sin bloquear.
- Gestiona callbacks y futures.

### 2. Corrutinas (Coroutines)

Funciones definidas con `async def` que pueden pausarse y reanudarse.

**Sintaxis:**

```python
async def mi_corrutina():
    resultado = await alguna_operacion_asincronica()
    return resultado
```

### 3. Tareas (Tasks)

Corrutinas programadas que se ejecutan de forma concurrente en el bucle de eventos.

### 4. Futures

Objetos de bajo nivel que representan resultados eventuales de operaciones asincrónicas.

### 5. Gestores de Contexto Asincrónicos (Async Context Managers)

Recursos que soportan `async with` para una limpieza adecuada.

### 6. Iteradores Asincrónicos (Async Iterators)

Objetos que soportan `async for` para iterar sobre fuentes de datos asincrónicas.

## Inicio Rápido

```python
import asyncio

async def main():
    print("Hola")
    await asyncio.sleep(1)
    print("Mundo")

# Python 3.7+
asyncio.run(main())
```

## Patrones Fundamentales

### Patrón 1: Async/Await Básico

```python
import asyncio

async def obtener_datos(url: str) -> dict:
    """Obtener datos de una URL de forma asincrónica."""
    await asyncio.sleep(1)  # Simular E/S
    return {"url": url, "data": "resultado"}

async def main():
    resultado = await obtener_datos("https://api.ejemplo.com")
    print(resultado)

asyncio.run(main())
```

### Patrón 2: Ejecución Concurrente con gather()

```python
import asyncio
from typing import List

async def obtener_usuario(user_id: int) -> dict:
    """Obtener datos de usuario."""
    await asyncio.sleep(0.5)
    return {"id": user_id, "nombre": f"Usuario {user_id}"}

async def obtener_todos_los_usuarios(user_ids: List[int]) -> List[dict]:
    """Obtener múltiples usuarios de forma concurrente."""
    tareas = [obtener_usuario(uid) for uid in user_ids]
    resultados = await asyncio.gather(*tareas)
    return resultados

async def main():
    user_ids = [1, 2, 3, 4, 5]
    usuarios = await obtener_todos_los_usuarios(user_ids)
    print(f"Obtenidos {len(usuarios)} usuarios")

asyncio.run(main())
```

### Patrón 3: Creación y Gestión de Tareas

```python
import asyncio

async def tarea_en_segundo_plano(nombre: str, retraso: int):
    """Tarea de larga duración en segundo plano."""
    print(f"{nombre} iniciada")
    await asyncio.sleep(retraso)
    print(f"{nombre} completada")
    return f"Resultado de {nombre}"

async def main():
    # Crear tareas
    tarea1 = asyncio.create_task(tarea_en_segundo_plano("Tarea 1", 2))
    tarea2 = asyncio.create_task(tarea_en_segundo_plano("Tarea 2", 1))

    # Realizar otro trabajo
    print("Main: realizando otro trabajo")
    await asyncio.sleep(0.5)

    # Esperar a las tareas
    resultado1 = await tarea1
    resultado2 = await tarea2

    print(f"Resultados: {resultado1}, {resultado2}")

asyncio.run(main())
```

### Patrón 4: Manejo de Errores en Código Asincrónico

```python
import asyncio
from typing import List, Optional

async def operacion_arriesgada(item_id: int) -> dict:
    """Operación que podría fallar."""
    await asyncio.sleep(0.1)
    if item_id % 3 == 0:
        raise ValueError(f"El elemento {item_id} falló")
    return {"id": item_id, "status": "éxito"}

async def operacion_segura(item_id: int) -> Optional[dict]:
    """Envoltura (wrapper) con manejo de errores."""
    try:
        return await operacion_arriesgada(item_id)
    except ValueError as e:
        print(f"Error: {e}")
        return None

async def procesar_elementos(item_ids: List[int]):
    """Procesar múltiples elementos con manejo de errores."""
    tareas = [operacion_segura(iid) for iid in item_ids]
    resultados = await asyncio.gather(*tareas, return_exceptions=True)

    # Filtrar fallos
    exitosos = [r for r in resultados if r is not None and not isinstance(r, Exception)]
    fallidos = [r for r in resultados if isinstance(r, Exception)]

    print(f"Éxito: {len(exitosos)}, Fallidos: {len(fallidos)}")
    return exitosos

asyncio.run(procesar_elementos([1, 2, 3, 4, 5, 6]))
```

### Patrón 5: Manejo de Tiempos de Espera (Timeouts)

```python
import asyncio

async def operacion_lenta(retraso: int) -> str:
    """Operación que toma tiempo."""
    await asyncio.sleep(retraso)
    return f"Completada después de {retraso}s"

async def con_timeout():
    """Ejecutar operación con tiempo de espera."""
    try:
        resultado = await asyncio.wait_for(operacion_lenta(5), timeout=2.0)
        print(resultado)
    except asyncio.TimeoutError:
        print("La operación excedió el tiempo de espera")

asyncio.run(con_timeout())
```

## Patrones Avanzados

### Patrón 6: Gestores de Contexto Asincrónicos

```python
import asyncio
from typing import Optional

class ConexionBaseDatosAsync:
    """Gestor de contexto de conexión a base de datos asincrónica."""

    def __init__(self, dsn: str):
        self.dsn = dsn
        self.conexion: Optional[object] = None

    async def __aenter__(self):
        print("Abriendo conexión")
        await asyncio.sleep(0.1)  # Simular conexión
        self.conexion = {"dsn": self.dsn, "conectado": True}
        return self.conexion

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Cerrando conexión")
        await asyncio.sleep(0.1)  # Simular limpieza
        self.conexion = None

async def consultar_db():
    """Uso del gestor de contexto asincrónico."""
    async with ConexionBaseDatosAsync("postgresql://localhost") as conn:
        print(f"Usando conexión: {conn}")
        await asyncio.sleep(0.2)  # Simular consulta
        return {"filas": 10}

asyncio.run(consultar_db())
```

### Patrón 7: Iteradores y Generadores Asincrónicos

```python
import asyncio
from typing import AsyncIterator

async def rango_async(inicio: int, fin: int, retraso: float = 0.1) -> AsyncIterator[int]:
    """Generador asincrónico que emite números con un retraso."""
    for i in range(inicio, fin):
        await asyncio.sleep(retraso)
        yield i

async def obtener_paginas(url: str, max_paginas: int) -> AsyncIterator[dict]:
    """Obtener datos paginados de forma asincrónica."""
    for pagina in range(1, max_paginas + 1):
        await asyncio.sleep(0.2)  # Simular llamada a la API
        yield {
            "pagina": pagina,
            "url": f"{url}?page={pagina}",
            "datos": [f"item_{pagina}_{i}" for i in range(5)]
        }

async def consumir_iterador_async():
    """Consumir iterador asincrónico."""
    async for numero in rango_async(1, 5):
        print(f"Número: {numero}")

    print("\nObteniendo páginas:")
    async for datos_pagina in obtener_paginas("https://api.ejemplo.com/items", 3):
        print(f"Página {datos_pagina['pagina']}: {len(datos_pagina['datos'])} elementos")

asyncio.run(consumir_iterador_async())
```

### Patrón 8: Patrón Productor-Consumidor (Producer-Consumer)

```python
import asyncio
from asyncio import Queue
from typing import Optional

async def productor(cola: Queue, productor_id: int, num_elementos: int):
    """Produce elementos y los coloca en la cola."""
    for i in range(num_elementos):
        elemento = f"Elemento-{productor_id}-{i}"
        await cola.put(elemento)
        print(f"Productor {productor_id} produjo: {elemento}")
        await asyncio.sleep(0.1)
    await cola.put(None)  # Señalar finalización

async def consumidor(cola: Queue, consumidor_id: int):
    """Consume elementos de la cola."""
    while True:
        elemento = await cola.get()
        if elemento is None:
            cola.task_done()
            break

        print(f"Consumidor {consumidor_id} procesando: {elemento}")
        await asyncio.sleep(0.2)  # Simular trabajo
        cola.task_done()

async def ejemplo_productor_consumidor():
    """Ejecutar patrón productor-consumidor."""
    cola = Queue(maxsize=10)

    # Crear tareas
    productores = [
        asyncio.create_task(productor(cola, i, 5))
        for i in range(2)
    ]

    consumidores = [
        asyncio.create_task(consumidor(cola, i))
        for i in range(3)
    ]

    # Esperar a los productores
    await asyncio.gather(*productores)

    # Esperar a que la cola esté vacía
    await cola.join()

    # Cancelar los consumidores
    for c in consumidores:
        c.cancel()

asyncio.run(ejemplo_productor_consumidor())
```

### Patrón 9: Semáforos para Limitación de Tasa (Rate Limiting)

```python
import asyncio
from typing import List

async def llamada_api(url: str, semaforo: asyncio.Semaphore) -> dict:
    """Realizar llamada a la API con limitación de tasa."""
    async with semaforo:
        print(f"Llamando a {url}")
        await asyncio.sleep(0.5)  # Simular llamada a la API
        return {"url": url, "status": 200}

async def solicitudes_limitadas(urls: List[str], max_concurrentes: int = 5):
    """Realizar múltiples solicitudes con limitación de tasa."""
    semaforo = asyncio.Semaphore(max_concurrentes)
    tareas = [llamada_api(url, semaforo) for url in urls]
    resultados = await asyncio.gather(*tareas)
    return resultados

async def main():
    urls = [f"https://api.ejemplo.com/item/{i}" for i in range(20)]
    resultados = await solicitudes_limitadas(urls, max_concurrentes=3)
    print(f"Completadas {len(resultados)} solicitudes")

asyncio.run(main())
```

### Patrón 10: Bloqueos (Locks) y Sincronización Asincrónica

```python
import asyncio

class ContadorAsync:
    """Contador asincrónico seguro para hilos."""

    def __init__(self):
        self.valor = 0
        self.bloqueo = asyncio.Lock()

    async def incrementar(self):
        """Incrementar contador de forma segura."""
        async with self.bloqueo:
            actual = self.valor
            await asyncio.sleep(0.01)  # Simular trabajo
            self.valor = actual + 1

    async def obtener_valor(self) -> int:
        """Obtener valor actual."""
        async with self.bloqueo:
            return self.valor

async def trabajador(contador: ContadorAsync, trabajador_id: int):
    """Trabajador que incrementa el contador."""
    for _ in range(10):
        await contador.incrementar()
        print(f"Trabajador {trabajador_id} incrementó")

async def probar_contador():
    """Probar contador concurrente."""
    contador = ContadorAsync()

    trabajadores = [asyncio.create_task(trabajador(contador, i)) for i in range(5)]
    await asyncio.gather(*trabajadores)

    valor_final = await contador.obtener_valor()
    print(f"Valor final del contador: {valor_final}")

asyncio.run(test_counter())
```

## Aplicaciones del Mundo Real

### Scraping Web con aiohttp

```python
import asyncio
import aiohttp
from typing import List, Dict

async def obtener_url(session: aiohttp.ClientSession, url: str) -> Dict:
    """Obtener una sola URL."""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as respuesta:
            texto = await respuesta.text()
            return {
                "url": url,
                "status": respuesta.status,
                "length": len(texto)
            }
    except Exception as e:
        return {"url": url, "error": str(e)}

async def scrapear_urls(urls: List[str]) -> List[Dict]:
    """Scrapear múltiples URLs de forma concurrente."""
    async with aiohttp.ClientSession() as session:
        tareas = [obtener_url(session, url) for url in urls]
        resultados = await asyncio.gather(*tareas)
        return resultados

async def main():
    urls = [
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/2",
        "https://httpbin.org/status/404",
    ]

    resultados = await scrapear_urls(urls)
    for resultado in resultados:
        print(resultado)

asyncio.run(main())
```

### Operaciones de Base de Datos Asincrónicas

```python
import asyncio
from typing import List, Optional

# Simulación de cliente de base de datos asincrónico
class DBAsync:
    """Base de datos asincrónica simulada."""

    async def ejecutar(self, query: str) -> List[dict]:
        """Ejecutar consulta."""
        await asyncio.sleep(0.1)
        return [{"id": 1, "nombre": "Ejemplo"}]

    async def obtener_uno(self, query: str) -> Optional[dict]:
        """Obtener una sola fila."""
        await asyncio.sleep(0.1)
        return {"id": 1, "nombre": "Ejemplo"}

async def obtener_datos_usuario(db: DBAsync, user_id: int) -> dict:
    """Obtener usuario y datos relacionados de forma concurrente."""
    tarea_usuario = db.obtener_uno(f"SELECT * FROM usuarios WHERE id = {user_id}")
    tarea_pedidos = db.ejecutar(f"SELECT * FROM pedidos WHERE usuario_id = {user_id}")
    tarea_perfil = db.obtener_uno(f"SELECT * FROM perfiles WHERE usuario_id = {user_id}")

    usuario, pedidos, perfil = await asyncio.gather(tarea_usuario, tarea_pedidos, tarea_perfil)

    return {
        "usuario": usuario,
        "pedidos": pedidos,
        "perfil": perfil
    }

async def main():
    db = DBAsync()
    datos_usuario = await obtener_datos_usuario(db, 1)
    print(datos_usuario)

asyncio.run(main())
```

### Servidor WebSocket

```python
import asyncio
from typing import Set

# WebSocket simulado
class WebSocket:
    """WebSocket simulado."""

    def __init__(self, client_id: str):
        self.client_id = client_id

    async def enviar(self, mensaje: str):
        """Enviar mensaje."""
        print(f"Enviando a {self.client_id}: {mensaje}")
        await asyncio.sleep(0.01)

    async def recibir(self) -> str:
        """Recibir mensaje."""
        await asyncio.sleep(1)
        return f"Mensaje de {self.client_id}"

class ServidorWebSocket:
    """Servidor WebSocket simple."""

    def __init__(self):
        self.clientes: Set[WebSocket] = set()

    async def registrar(self, websocket: WebSocket):
        """Registrar nuevo cliente."""
        self.clientes.add(websocket)
        print(f"Cliente {websocket.client_id} conectado")

    async def desregistrar(self, websocket: WebSocket):
        """Eliminar registro de cliente."""
        self.clientes.remove(websocket)
        print(f"Cliente {websocket.client_id} desconectado")

    async def emitir(self, mensaje: str):
        """Emitir mensaje a todos los clientes."""
        if self.clientes:
            tareas = [cliente.enviar(mensaje) for cliente in self.clientes]
            await asyncio.gather(*tareas)

    async def manejar_cliente(self, websocket: WebSocket):
        """Manejar la conexión de un cliente individual."""
        await self.registrar(websocket)
        try:
            async for mensaje in self.iterador_mensajes(websocket):
                await self.emitir(f"{websocket.client_id}: {mensaje}")
        finally:
            await self.desregistrar(websocket)

    async def iterador_mensajes(self, websocket: WebSocket):
        """Iterar sobre los mensajes de un cliente."""
        for _ in range(3):  # Simular 3 mensajes
            yield await websocket.recibir()
```

## Mejores Prácticas de Rendimiento

### 1. Usar Pools de Conexión

```python
import asyncio
import aiohttp

async def con_pool_de_conexiones():
    """Usar un pool de conexiones para mayor eficiencia."""
    conector = aiohttp.TCPConnector(limit=100, limit_per_host=10)

    async with aiohttp.ClientSession(connector=conector) as session:
        tareas = [session.get(f"https://api.ejemplo.com/item/{i}") for i in range(50)]
        respuestas = await asyncio.gather(*tareas)
        return respuestas
```

### 2. Operaciones en Lote (Batch Operations)

```python
async def procesar_en_lotes(elementos: List[str], tamano_lote: int = 10):
    """Procesar elementos en lotes."""
    for i in range(0, len(elementos), tamano_lote):
        lote = elementos[i:i + tamano_lote]
        tareas = [procesar_elemento(item) for item in lote]
        await asyncio.gather(*tareas)
        print(f"Procesado lote {i // tamano_lote + 1}")

async def procesar_elemento(item: str):
    """Procesar un solo elemento."""
    await asyncio.sleep(0.1)
    return f"Procesado: {item}"
```

### 3. Evitar Operaciones Bloqueantes

```python
import asyncio
import concurrent.futures
from typing import Any

def operacion_bloqueante(datos: Any) -> Any:
    """Operación bloqueante intensiva en CPU."""
    import time
    time.sleep(1)
    return datos * 2

async def ejecutar_en_executor(datos: Any) -> Any:
    """Ejecutar operación bloqueante en un pool de hilos."""
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        resultado = await loop.run_in_executor(pool, operacion_bloqueante, datos)
        return resultado

async def main():
    resultados = await asyncio.gather(*[ejecutar_en_executor(i) for i in range(5)])
    print(resultados)

asyncio.run(main())
```

## Errores Comunes (Pitfalls)

### 1. Olvidar el await

```python
# Mal - devuelve el objeto corrutina, no lo ejecuta
resultado = funcion_asincronica()

# Bien
resultado = await funcion_asincronica()
```

### 2. Bloquear el Bucle de Eventos

```python
# Mal - bloquea el bucle de eventos
import time
async def mal():
    time.sleep(1)  # ¡Bloquea!

# Bien
async def bien():
    await asyncio.sleep(1)  # No bloqueante
```

### 3. No manejar la Cancelación

```python
async def tarea_cancelable():
    """Tarea que maneja la cancelación."""
    try:
        while True:
            await asyncio.sleep(1)
            print("Trabajando...")
    except asyncio.CancelledError:
        print("Tarea cancelada, limpiando...")
        # Realizar limpieza
        raise  # Volver a lanzar para propagar la cancelación
```

### 4. Mezclar Código Sincrónico y Asincrónico

```python
# Mal - no se puede llamar a una función async desde una sync directamente
def funcion_sync():
    resultado = await funcion_asincronica()  # ¡SyntaxError!

# Bien
def funcion_sync():
    resultado = asyncio.run(funcion_asincronica())
```

## Pruebas de Código Asincrónico

```python
import asyncio
import pytest

# Usando pytest-asyncio
@pytest.mark.asyncio
async def test_funcion_asincronica():
    """Probar función asincrónica."""
    resultado = await obtener_datos("https://api.ejemplo.com")
    assert resultado is not None

@pytest.mark.asyncio
async def test_con_timeout():
    """Probar con tiempo de espera."""
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(operacion_lenta(5), timeout=1.0)
```

## Recursos

- **Documentación de Python asyncio**: https://docs.python.org/3/library/asyncio.html
- **aiohttp**: Cliente/servidor HTTP asincrónico.
- **FastAPI**: Framework web moderno y asincrónico.
- **asyncpg**: Controlador PostgreSQL asincrónico.
- **motor**: Controlador MongoDB asincrónico.

## Resumen de Mejores Prácticas

1. **Usa asyncio.run()** para el punto de entrada (Python 3.7+).
2. **Usa siempre await** con las corrutinas para ejecutarlas.
3. **Usa gather() para la ejecución concurrente** de múltiples tareas.
4. **Implementa un manejo de errores adecuado** con try/except.
5. **Usa timeouts** para evitar operaciones colgadas.
6. **Usa pools de conexiones** para un mejor rendimiento.
7. **Evita operaciones bloqueantes** en código asincrónico.
8. **Usa semáforos** para la limitación de tasa (rate limiting).
9. **Maneja la cancelación de tareas** correctamente.
10. **Prueba el código asincrónico** con pytest-asyncio.
