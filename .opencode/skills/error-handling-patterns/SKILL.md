---
name: error-handling-patterns
description: Domina los patrones de manejo de errores en diversos lenguajes, incluyendo excepciones, tipos Result, propagación de errores y degradación elegante para construir aplicaciones resilientes. Úsalo al implementar el manejo de errores, diseñar APIs o mejorar la confiabilidad de las aplicaciones.
---

# Patrones de Manejo de Errores

Construye aplicaciones resilientes con estrategias de manejo de errores robustas que gestionen los fallos de forma elegante y proporcionen experiencias de depuración excelentes.

## Cuándo usar este Skill

- Implementación del manejo de errores en nuevas características
- Diseño de APIs resilientes a errores
- Depuración de problemas en producción
- Mejora de la confiabilidad de la aplicación
- Creación de mejores mensajes de error para usuarios y desarrolladores
- Implementación de patrones de reintento (retry) y disyuntor (circuit breaker)
- Manejo de errores asíncronos/concurrentes
- Construcción de sistemas distribuidos tolerantes a fallos

## Conceptos Principales

### 1. Filosofías de Manejo de Errores

**Excepciones vs Tipos Result:**

- **Excepciones**: try-catch tradicional, interrumpe el flujo de control.
- **Tipos Result**: Éxito/fallo explícito, enfoque funcional.
- **Códigos de Error**: Estilo C, requiere disciplina.
- **Tipos Option/Maybe**: Para valores que pueden ser nulos (nullable).

**Cuándo usar cada uno:**

- Excepciones: Errores inesperados, condiciones excepcionales.
- Tipos Result: Errores esperados, fallos de validación.
- Pánicos/Crashes: Errores irrecuperables, errores de programación.

### 2. Categorías de Error

**Errores Recuperables:**

- Tiempos de espera de red (timeouts)
- Archivos faltantes
- Entrada de usuario inválida
- Límites de tasa de API (rate limits)

**Errores Irrecuperables:**

- Memoria agotada (out of memory)
- Desbordamiento de pila (stack overflow)
- Errores de programación (punteros nulos, etc.)

## Patrones Específicos por Lenguaje

### Manejo de Errores en Python

**Jerarquía de Excepciones Personalizada:**

```python
class ApplicationError(Exception):
    """Excepción base para todos los errores de la aplicación."""
    def __init__(self, message: str, code: str = None, details: dict = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}
        self.timestamp = datetime.utcnow()

class ValidationError(ApplicationError):
    """Lanzada cuando la validación falla."""
    pass

class NotFoundError(ApplicationError):
    """Lanzada cuando no se encuentra el recurso."""
    pass

class ExternalServiceError(ApplicationError):
    """Lanzada cuando un servicio externo falla."""
    def __init__(self, message: str, service: str, **kwargs):
        super().__init__(message, **kwargs)
        self.service = service

# Uso
def get_user(user_id: str) -> User:
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise NotFoundError(
            f"User not found",
            code="USER_NOT_FOUND",
            details={"user_id": user_id}
        )
    return user
```

**Administradores de Contexto para Limpieza:**

```python
from contextlib import contextmanager

@contextmanager
def database_transaction(session):
    """Asegura que la transacción se complete o se revierta."""
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()

# Uso
with database_transaction(db.session) as session:
    user = User(name="Alice")
    session.add(user)
    # Commit o rollback automático
```

**Reintento con Retroceso Exponencial (Exponential Backoff):**

```python
import time
from functools import wraps
from typing import TypeVar, Callable

T = TypeVar('T')

def retry(
    max_attempts: int = 3,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """Decorador de reintento con retroceso exponencial."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        sleep_time = backoff_factor ** attempt
                        time.sleep(sleep_time)
                        continue
                    raise
            raise last_exception
        return wrapper
    return decorator

# Uso
@retry(max_attempts=3, exceptions=(NetworkError,))
def fetch_data(url: str) -> dict:
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

### Manejo de Errores en TypeScript/JavaScript

**Clases de Error Personalizadas:**

```typescript
// Clases de error personalizadas
class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, { resource, id });
  }
}

// Uso
function getUser(id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new NotFoundError("User", id);
  }
  return user;
}
```

**Patrón de Tipo Result:**

```typescript
// Tipo Result para manejo explícito de errores
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Funciones de ayuda
function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Uso
function parseJSON<T>(json: string): Result<T, SyntaxError> {
  try {
    const value = JSON.parse(json) as T;
    return Ok(value);
  } catch (error) {
    return Err(error as SyntaxError);
  }
}

// Consumiendo Result
const result = parseJSON<User>(userJson);
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error("Parse failed:", result.error.message);
}

// Encadenando Results
function chain<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}
```

**Manejo de Errores Asíncronos:**

```typescript
// Async/await con manejo de errores adecuado
async function fetchUserOrders(userId: string): Promise<Order[]> {
  try {
    const user = await getUser(userId);
    const orders = await getOrders(user.id);
    return orders;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return []; // Devolver array vacío si no se encuentra
    }
    if (error instanceof NetworkError) {
      // Lógica de reintento
      return retryFetchOrders(userId);
    }
    // Volver a lanzar errores inesperados
    throw error;
  }
}

// Manejo de errores en Promesas
function fetchData(url: string): Promise<Data> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new NetworkError(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Fetch failed:", error);
      throw error;
    });
}
```

### Manejo de Errores en Rust

**Tipos Result y Option:**

```rust
use std::fs::File;
use std::io::{self, Read};

// Tipo Result para operaciones que pueden fallar
fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;  // El operador ? propaga errores
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// Tipos de error personalizados
#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(std::num::ParseIntError),
    NotFound(String),
    Validation(String),
}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::Io(error)
    }
}

// Usando tipo de error personalizado
fn read_number_from_file(path: &str) -> Result<i32, AppError> {
    let contents = read_file(path)?;  // Auto-convierte io::Error
    let number = contents.trim().parse()
        .map_err(AppError::Parse)?;   // Convierte explícitamente ParseIntError
    Ok(number)
}

// Option para valores que pueden ser nulos
fn find_user(id: &str) -> Option<User> {
    users.iter().find(|u| u.id == id).cloned()
}

// Combinando Option y Result
fn get_user_age(id: &str) -> Result<u32, AppError> {
    find_user(id)
        .ok_or_else(|| AppError::NotFound(id.to_string()))
        .map(|user| user.age)
}
```

### Manejo de Errores en Go

**Retornos de Error Explícitos:**

```go
// Manejo de errores básico
func getUser(id string) (*User, error) {
    user, err := db.QueryUser(id)
    if err != nil {
        return nil, fmt.Errorf("failed to query user: %w", err)
    }
    if user == nil {
        return nil, errors.New("user not found")
    }
    return user, nil
}

// Tipos de error personalizados
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for %s: %s", e.Field, e.Message)
}

// Errores centinela para comparación
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)

// Verificación de errores
user, err := getUser("123")
if err != nil {
    if errors.Is(err, ErrNotFound) {
        // Manejar no encontrado
    } else {
        // Manejar otros errores
    }
}

// Envoltorio de errores (Error wrapping) y desenvuelto (unwrapping)
func processUser(id string) error {
    user, err := getUser(id)
    if err != nil {
        return fmt.Errorf("process user failed: %w", err)
    }
    // Procesar usuario
    return nil
}

// Desenvolver errores
err := processUser("123")
if err != nil {
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("Validation error: %s\n", valErr.Field)
    }
}
```

## Patrones Universales

### Patrón 1: Disyuntor (Circuit Breaker)

Previene fallos en cascada en sistemas distribuidos.

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Callable, TypeVar

T = TypeVar('T')

class CircuitState(Enum):
    CLOSED = "closed"       # Operación normal
    OPEN = "open"          # Fallando, rechazar solicitudes
    HALF_OPEN = "half_open"  # Probando si se recuperó

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: timedelta = timedelta(seconds=60),
        success_threshold: int = 2
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        self.failure_count = 0
        self.success_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = None

    def call(self, func: Callable[[], T]) -> T:
        if self.state == CircuitState.OPEN:
            if datetime.now() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = func()
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise

    def on_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0

    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Uso
circuit_breaker = CircuitBreaker()

def fetch_data():
    return circuit_breaker.call(lambda: external_api.get_data())
```

### Patrón 2: Agregación de Errores

Recopila múltiples errores en lugar de fallar en el primero.

```typescript
class ErrorCollector {
  private errors: Error[] = [];

  add(error: Error): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): Error[] {
    return [...this.errors];
  }

  throw(): never {
    if (this.errors.length === 1) {
      throw this.errors[0];
    }
    throw new AggregateError(
      this.errors,
      `${this.errors.length} errors occurred`,
    );
  }
}

// Uso: Validar múltiples campos
function validateUser(data: any): User {
  const errors = new ErrorCollector();

  if (!data.email) {
    errors.add(new ValidationError("Email is required"));
  } else if (!isValidEmail(data.email)) {
    errors.add(new ValidationError("Email is invalid"));
  }

  if (!data.name || data.name.length < 2) {
    errors.add(new ValidationError("Name must be at least 2 characters"));
  }

  if (!data.age || data.age < 18) {
    errors.add(new ValidationError("Age must be 18 or older"));
  }

  if (errors.hasErrors()) {
    errors.throw();
  }

  return data as User;
}
```

### Patrón 3: Degradación Elegante (Graceful Degradation)

Proporciona funcionalidad de respaldo cuando ocurren errores.

```python
from typing import Optional, Callable, TypeVar

T = TypeVar('T')

def with_fallback(
    primary: Callable[[], T],
    fallback: Callable[[], T],
    log_error: bool = True
) -> T:
    """Intenta la función principal, recurre al respaldo en caso de error."""
    try:
        return primary()
    except Exception as e:
        if log_error:
            logger.error(f"Primary function failed: {e}")
        return fallback()

# Uso
def get_user_profile(user_id: str) -> UserProfile:
    return with_fallback(
        primary=lambda: fetch_from_cache(user_id),
        fallback=lambda: fetch_from_database(user_id)
    )

# Múltiples respaldos
def get_exchange_rate(currency: str) -> float:
    return (
        try_function(lambda: api_provider_1.get_rate(currency))
        or try_function(lambda: api_provider_2.get_rate(currency))
        or try_function(lambda: cache.get_rate(currency))
        or DEFAULT_RATE
    )

def try_function(func: Callable[[], Optional[T]]) -> Optional[T]:
    try:
        return func()
    except Exception:
        return None
```

## Mejores Prácticas

1.  **Falla Rápido (Fail Fast)**: Valida la entrada pronto, falla rápido.
2.  **Preserva el Contexto**: Incluye stack traces, metadatos, marcas de tiempo.
3.  **Mensajes Significativos**: Explica qué pasó y cómo solucionarlo.
4.  **Registra (Log) Apropiadamente**: Error = registro, fallo esperado = no satures los logs.
5.  **Maneja en el Nivel Adecuado**: Captura donde puedas manejar el error significativamente.
6.  **Limpia Recursos**: Usa try-finally, administradores de contexto, defer.
7.  **No te Tragues los Errores**: Registra o vuelve a lanzar, no ignores silenciosamente.
8.  **Errores Tipados Seguros**: Usa errores tipados cuando sea posible.

```python
# Ejemplo de buen manejo de errores
def process_order(order_id: str) -> Order:
    """Procesa el pedido con un manejo de errores exhaustivo."""
    try:
        # Validar entrada
        if not order_id:
            raise ValidationError("Order ID is required")

        # Obtener pedido
        order = db.get_order(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        # Procesar pago
        try:
            payment_result = payment_service.charge(order.total)
        except PaymentServiceError as e:
            # Registrar y envolver error de servicio externo
            logger.error(f"Payment failed for order {order_id}: {e}")
            raise ExternalServiceError(
                f"Payment processing failed",
                service="payment_service",
                details={"order_id": order_id, "amount": order.total}
            ) from e

        # Actualizar pedido
        order.status = "completed"
        order.payment_id = payment_result.id
        db.save(order)

        return order

    except ApplicationError:
        # Volver a lanzar errores conocidos de la aplicación
        raise
    except Exception as e:
        # Registrar errores inesperados
        logger.exception(f"Unexpected error processing order {order_id}")
        raise ApplicationError(
            "Order processing failed",
            code="INTERNAL_ERROR"
        ) from e
```

## Errores Comunes (Pitfalls)

- **Capturar de Forma Demasiado Amplia**: `except Exception` oculta bugs.
- **Bloques Catch Vacíos**: Tragarse errores silenciosamente.
- **Registrar y Volver a Lanzar**: Crea entradas de log duplicadas.
- **No Limpiar Recursos**: Olvidar cerrar archivos o conexiones.
- **Mensajes de Error Pobres**: "Error occurred" no es útil.
- **Retornar Códigos de Error**: Usa excepciones o tipos Result.
- **Ignorar Errores Asíncronos**: Promesas rechazadas no manejadas.

## Recursos

- **references/exception-hierarchy-design.md**: Diseño de jerarquías de clases de error.
- **references/error-recovery-strategies.md**: Patrones de recuperación para diferentes escenarios.
- **references/async-error-handling.md**: Manejo de errores en código concurrente.
- **assets/error-handling-checklist.md**: Lista de verificación para el manejo de errores.
- **assets/error-message-guide.md**: Escritura de mensajes de error útiles.
- **scripts/error-analyzer.py**: Analiza patrones de error en los registros.
