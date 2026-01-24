---
name: architecture-patterns
description: Implementa patrones de arquitectura backend probados, incluyendo Arquitectura Limpia (Clean Architecture), Arquitectura Hexagonal y Diseño Orientado al Dominio (DDD). Úsalo al diseñar sistemas backend complejos o refactorizar aplicaciones existentes para una mejor mantenibilidad.
---

# Patrones de Arquitectura

Domina los patrones de arquitectura backend probados, incluyendo Arquitectura Limpia, Arquitectura Hexagonal y Diseño Orientado al Dominio (DDD), para construir sistemas mantenibles, testeables y escalables.

## Cuándo usar este Skill

- Diseño de nuevos sistemas backend desde cero.
- Refactorización de aplicaciones monolíticas para una mejor mantenibilidad.
- Establecimiento de estándares de arquitectura para tu equipo.
- Migración de arquitecturas estrechamente acopladas a arquitecturas débilmente acopladas.
- Implementación de principios de diseño orientado al dominio (DDD).
- Creación de bases de código testeables y mockeables.
- Planificación de la descomposición de microservicios.

## Conceptos Principales

### 1. Arquitectura Limpia (Uncle Bob)

**Capas (el flujo de dependencias va hacia adentro):**

- **Entidades (Entities)**: Modelos de negocio centrales.
- **Casos de Uso (Use Cases)**: Reglas de negocio de la aplicación.
- **Adaptadores de Interfaz (Interface Adapters)**: Controladores, presentadores, puertas de enlace (gateways).
- **Frameworks y Controladores (Drivers)**: UI, base de datos, servicios externos.

**Principios Clave:**

- Las dependencias apuntan hacia adentro.
- Las capas internas no saben nada de las capas externas.
- La lógica de negocio es independiente de los frameworks.
- Testeable sin UI, base de datos o servicios externos.

### 2. Arquitectura Hexagonal (Puertos y Adaptadores)

**Componentes:**

- **Núcleo del Dominio (Domain Core)**: Lógica de negocio.
- **Puertos (Ports)**: Interfaces que definen las interacciones.
- **Adaptadores (Adapters)**: Implementaciones de los puertos (base de datos, REST, colas de mensajes).

**Beneficios:**

- Intercambio de implementaciones fácil (mocks para pruebas).
- Núcleo agnóstico de la tecnología.
- Clara separación de preocupaciones (concerns).

### 3. Diseño Orientado al Dominio (DDD)

**Patrones Estratégicos:**

- **Contextos Acotados (Bounded Contexts)**: Modelos separados para diferentes dominios.
- **Mapeo de Contextos (Context Mapping)**: Cómo se relacionan los contextos.
- **Lenguaje Ubicuo (Ubiquitous Language)**: Terminología compartida.

**Patrones Tácticos:**

- **Entidades (Entities)**: Objetos con identidad.
- **Objetos de Valor (Value Objects)**: Objetos inmutables definidos por sus atributos.
- **Agregados (Aggregates)**: Límites de consistencia.
- **Repositorios (Repositories)**: Abstracción del acceso a datos.
- **Eventos de Dominio (Domain Events)**: Cosas que han sucedido.

## Patrón de Arquitectura Limpia

### Estructura de Directorios

```
app/
├── domain/           # Entidades y reglas de negocio
├── domain/           # Entities & business rules
│   ├── entities/
│   │   ├── user.py
│   │   └── order.py
│   ├── value_objects/
│   │   ├── email.py
│   │   └── money.py
│   └── interfaces/   # Interfaces abstractas
│       ├── user_repository.py
│       └── payment_gateway.py
├── use_cases/        # Reglas de negocio de la aplicación
│   ├── create_user.py
│   ├── process_order.py
│   └── send_notification.py
├── adapters/         # Implementaciones de interfaces
│   ├── repositories/
│   │   ├── postgres_user_repository.py
│   │   └── redis_cache_repository.py
│   ├── controllers/
│   │   └── user_controller.py
│   └── gateways/
│       ├── stripe_payment_gateway.py
│       └── sendgrid_email_gateway.py
└── infrastructure/   # Framework y preocupaciones externas
    ├── database.py
    ├── config.py
    └── logging.py
```

### Ejemplo de Implementación

```python
# domain/entities/user.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    """Entidad de usuario central - sin dependencias de framework."""
    id: str
    email: str
    name: str
    created_at: datetime
    is_active: bool = True

    def deactivate(self):
        """Regla de negocio: desactivar usuario."""
        self.is_active = False

    def can_place_order(self) -> bool:
        """Regla de negocio: los usuarios activos pueden pedir."""
        return self.is_active

# domain/interfaces/user_repository.py
from abc import ABC, abstractmethod
from typing import Optional, List
from domain.entities.user import User

class IUserRepository(ABC):
    """Puerto: define el contrato, sin implementación."""

    @abstractmethod
    async def find_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def find_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        pass

    @abstractmethod
    async def delete(self, user_id: str) -> bool:
        pass

# use_cases/create_user.py
from domain.entities.user import User
from domain.interfaces.user_repository import IUserRepository
from dataclasses import dataclass
from datetime import datetime
import uuid

@dataclass
class CreateUserRequest:
    email: str
    name: str

@dataclass
class CreateUserResponse:
    user: User
    success: bool
    error: Optional[str] = None

class CreateUserUseCase:
    """Caso de uso: orquestación de la lógica de negocio."""

    def __init__(self, user_repository: IUserRepository):
        self.user_repository = user_repository

    async def execute(self, request: CreateUserRequest) -> CreateUserResponse:
        # Validación de negocio
        existing = await self.user_repository.find_by_email(request.email)
        if existing:
            return CreateUserResponse(
                user=None,
                success=False,
                error="Email already exists"
            )

        # Crear entidad
        user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            name=request.name,
            created_at=datetime.now(),
            is_active=True
        )

        # Persistir
        saved_user = await self.user_repository.save(user)

        return CreateUserResponse(
            user=saved_user,
            success=True
        )

# adapters/repositories/postgres_user_repository.py
from domain.interfaces.user_repository import IUserRepository
from domain.entities.user import User
from typing import Optional
import asyncpg

class PostgresUserRepository(IUserRepository):
    """Adaptador: implementación PostgreSQL."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def find_by_id(self, user_id: str) -> Optional[User]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1", user_id
            )
            return self._to_entity(row) if row else None

    async def find_by_email(self, email: str) -> Optional[User]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1", email
            )
            return self._to_entity(row) if row else None

    async def save(self, user: User) -> User:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, email, name, created_at, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE
                SET email = $2, name = $3, is_active = $5
                """,
                user.id, user.email, user.name, user.created_at, user.is_active
            )
            return user

    async def delete(self, user_id: str) -> bool:
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM users WHERE id = $1", user_id
            )
            return result == "DELETE 1"

    def _to_entity(self, row) -> User:
        """Mapear fila de BD a entidad."""
        return User(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            created_at=row["created_at"],
            is_active=row["is_active"]
        )

# adapters/controllers/user_controller.py
from fastapi import APIRouter, Depends, HTTPException
from use_cases.create_user import CreateUserUseCase, CreateUserRequest
from pydantic import BaseModel

router = APIRouter()

class CreateUserDTO(BaseModel):
    email: str
    name: str

@router.post("/users")
async def create_user(
    dto: CreateUserDTO,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case)
):
    """Controlador: maneja solo asuntos HTTP."""
    request = CreateUserRequest(email=dto.email, name=dto.name)
    response = await use_case.execute(request)

    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)

    return {"user": response.user}
```

## Patrón de Arquitectura Hexagonal

```python
# Dominio central (centro del hexágono)
class OrderService:
    """Servicio de dominio - sin dependencias de infraestructura."""

    def __init__(
        self,
        order_repository: OrderRepositoryPort,
        payment_gateway: PaymentGatewayPort,
        notification_service: NotificationPort
    ):
        self.orders = order_repository
        self.payments = payment_gateway
        self.notifications = notification_service

    async def place_order(self, order: Order) -> OrderResult:
        # Lógica de negocio
        if not order.is_valid():
            return OrderResult(success=False, error="Invalid order")

        # Usar puertos (interfaces)
        payment = await self.payments.charge(
            amount=order.total,
            customer=order.customer_id
        )

        if not payment.success:
            return OrderResult(success=False, error="Payment failed")

        order.mark_as_paid()
        saved_order = await self.orders.save(order)

        await self.notifications.send(
            to=order.customer_email,
            subject="Order confirmed",
            body=f"Order {order.id} confirmed"
        )

        return OrderResult(success=True, order=saved_order)

# Puertos (interfaces)
class OrderRepositoryPort(ABC):
    @abstractmethod
    async def save(self, order: Order) -> Order:
        pass

class PaymentGatewayPort(ABC):
    @abstractmethod
    async def charge(self, amount: Money, customer: str) -> PaymentResult:
        pass

class NotificationPort(ABC):
    @abstractmethod
    async def send(self, to: str, subject: str, body: str):
        pass

# Adaptadores (implementaciones)
class StripePaymentAdapter(PaymentGatewayPort):
    """Adaptador primario: conecta con la API de Stripe."""

    def __init__(self, api_key: str):
        self.stripe = stripe
        self.stripe.api_key = api_key

    async def charge(self, amount: Money, customer: str) -> PaymentResult:
        try:
            charge = self.stripe.Charge.create(
                amount=amount.cents,
                currency=amount.currency,
                customer=customer
            )
            return PaymentResult(success=True, transaction_id=charge.id)
        except stripe.error.CardError as e:
            return PaymentResult(success=False, error=str(e))

class MockPaymentAdapter(PaymentGatewayPort):
    """Adaptador de prueba: sin dependencias externas."""

    async def charge(self, amount: Money, customer: str) -> PaymentResult:
        return PaymentResult(success=True, transaction_id="mock-123")
```

## Patrón de Diseño Orientado al Dominio (DDD)

```python
# Objetos de Valor (inmutables)
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class Email:
    """Objeto de valor: correo validado."""
    value: str

    def __post_init__(self):
        if "@" not in self.value:
            raise ValueError("Invalid email")

@dataclass(frozen=True)
class Money:
    """Objeto de valor: cantidad con moneda."""
    amount: int  # céntimos
    currency: str

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

# Entidades (con identidad)
class Order:
    """Entidad: tiene identidad, estado mutable."""

    def __init__(self, id: str, customer: Customer):
        self.id = id
        self.customer = customer
        self.items: List[OrderItem] = []
        self.status = OrderStatus.PENDING
        self._events: List[DomainEvent] = []

    def add_item(self, product: Product, quantity: int):
        """Lógica de negocio en la entidad."""
        item = OrderItem(product, quantity)
        self.items.append(item)
        self._events.append(ItemAddedEvent(self.id, item))

    def total(self) -> Money:
        """Propiedad calculada."""
        return sum(item.subtotal() for item in self.items)

    def submit(self):
        """Transición de estado con reglas de negocio."""
        if not self.items:
            raise ValueError("Cannot submit empty order")
        if self.status != OrderStatus.PENDING:
            raise ValueError("Order already submitted")

        self.status = OrderStatus.SUBMITTED
        self._events.append(OrderSubmittedEvent(self.id))

# Agregados (límite de consistencia)
class Customer:
    """Raíz del agregado: controla el acceso a las entidades."""

    def __init__(self, id: str, email: Email):
        self.id = id
        self.email = email
        self._addresses: List[Address] = []
        self._orders: List[str] = []  # IDs de pedido, no objetos completos

    def add_address(self, address: Address):
        """El agregado impone invariantes."""
        if len(self._addresses) >= 5:
            raise ValueError("Maximum 5 addresses allowed")
        self._addresses.append(address)

    @property
    def primary_address(self) -> Optional[Address]:
        return next((a for a in self._addresses if a.is_primary), None)

# Eventos de Dominio
@dataclass
class OrderSubmittedEvent:
    order_id: str
    occurred_at: datetime = field(default_factory=datetime.now)

# Repositorio (persistencia del agregado)
class OrderRepository:
    """Repositorio: persistir/recuperar agregados."""

    async def find_by_id(self, order_id: str) -> Optional[Order]:
        """Reconstituir el agregado desde el almacenamiento."""
        pass

    async def save(self, order: Order):
        """Persistir el agregado y publicar eventos."""
        await self._persist(order)
        await self._publish_events(order._events)
        order._events.clear()
```

## Recursos

- **references/clean-architecture-guide.md**: Desglose detallado de capas.
- **references/hexagonal-architecture-guide.md**: Patrones de puertos y adaptadores.
- **references/ddd-tactical-patterns.md**: Entidades, objetos de valor, agregados.
- **assets/clean-architecture-template/**: Estructura completa del proyecto.
- **assets/ddd-examples/**: Ejemplos de modelado de dominio.

## Mejores Prácticas

1.  **Regla de Dependencia**: Las dependencias siempre apuntan hacia adentro.
2.  **Segregación de Interfaces**: Interfaces pequeñas y enfocadas.
3.  **Lógica de Negocio en el Dominio**: Mantén los frameworks fuera del núcleo.
4.  **Independencia de Pruebas**: El núcleo debe ser testeable sin infraestructura.
5.  **Contextos Acotados**: Límites de dominio claros.
6.  **Lenguaje Ubicuo**: Terminología consistente.
7.  **Controladores Delgados**: Delegan a los casos de uso.
8.  **Modelos de Dominio Ricos**: Comportamiento junto con los datos.

## Errores Comunes (Pitfalls)

- **Dominio Anémico**: Entidades que solo tienen datos, sin comportamiento.
- **Acoplamiento de Framework**: La lógica de negocio depende de los frameworks.
- **Controladores Gordos**: Lógica de negocio en los controladores.
- **Fuga del Repositorio**: Exponer objetos de ORM.
- **Falta de Abstracciones**: Dependencias concretas en el núcleo.
- **Sobre-ingeniería**: Aplicar Arquitectura Limpia para CRUDs simples.
