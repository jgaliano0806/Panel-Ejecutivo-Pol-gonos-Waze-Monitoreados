---
name: api-design-principles
description: Domina los principios de diseño de APIs REST y GraphQL para construir APIs intuitivas, escalables y mantenibles que encanten a los desarrolladores. Úsalo al diseñar nuevas APIs, revisar especificaciones de API o establecer estándares de diseño de API.
---

# Principios de Diseño de API

Domina los principios de diseño de APIs REST y GraphQL para construir APIs intuitivas, escalables y mantenibles que encanten a los desarrolladores y resistan el paso del tiempo.

## Cuándo usar este Skill

- Diseño de nuevas APIs REST o GraphQL.
- Refactorización de APIs existentes para una mejor usabilidad.
- Establecimiento de estándares de diseño de API para tu equipo.
- Revisión de especificaciones de API antes de la implementación.
- Migración entre paradigmas de API (de REST a GraphQL, etc.).
- Creación de documentación de API amigable para desarrolladores.
- Optimización de APIs para casos de uso específicos (móviles, integraciones de terceros).

## Conceptos Principales

### 1. Principios de Diseño RESTful

**Arquitectura Orientada a Recursos**

- Los recursos son sustantivos (usuarios, pedidos, productos), no verbos.
- Usa métodos HTTP para las acciones (GET, POST, PUT, PATCH, DELETE).
- Las URLs representan jerarquías de recursos.
- Convenciones de nomenclatura consistentes.

**Semántica de los Métodos HTTP:**

- `GET`: Recuperar recursos (idempotente, seguro).
- `POST`: Crear nuevos recursos.
- `PUT`: Reemplazar el recurso completo (idempotente).
- `PATCH`: Actualizaciones parciales del recurso.
- `DELETE`: Eliminar recursos (idempotente).

### 2. Principios de Diseño GraphQL

**Desarrollo Primero en el Esquema (Schema-First)**

- Los tipos definen tu modelo de dominio.
- Consultas (Queries) para leer datos.
- Mutaciones (Mutations) para modificar datos.
- Suscripciones (Subscriptions) para actualizaciones en tiempo real.

**Estructura de la Consulta:**

- Los clientes solicitan exactamente lo que necesitan.
- Punto de acceso (endpoint) único, múltiples operaciones.
- Esquema fuertemente tipado.
- Introspección integrada.

### 3. Estrategias de Versionado de API

**Versionado en la URL:**

```
/api/v1/users
/api/v2/users
```

**Versionado en la Cabecera (Header):**

```
Accept: application/vnd.api+json; version=1
```

**Versionado en Parámetros de Consulta (Query Parameter):**

```
/api/users?version=1
```

## Patrones de Diseño de API REST

### Patrón 1: Diseño de Colecciones de Recursos

```python
# Bien: Endpoints orientados a recursos
GET    /api/users              # Listar usuarios (con paginación)
POST   /api/users              # Crear usuario
GET    /api/users/{id}         # Obtener un usuario específico
PUT    /api/users/{id}         # Reemplazar usuario
PATCH  /api/users/{id}         # Actualizar campos del usuario
DELETE /api/users/{id}         # Eliminar usuario

# Recursos anidados
GET    /api/users/{id}/orders  # Obtener pedidos del usuario
POST   /api/users/{id}/orders  # Crear pedido para el usuario

# Mal: Endpoints orientados a acciones (evitar)
POST   /api/createUser
POST   /api/getUserById
POST   /api/deleteUser
```

### Patrón 2: Paginación y Filtrado

```python
from typing import List, Optional
from pydantic import BaseModel, Field

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")

class FilterParams(BaseModel):
    status: Optional[str] = None
    created_after: Optional[str] = None
    search: Optional[str] = None

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    page_size: int
    pages: int

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1

# Ejemplo de endpoint en FastAPI
from fastapi import FastAPI, Query, Depends

app = FastAPI()

@app.get("/api/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    # Aplicar filtros
    query = build_query(status=status, search=search)

    # Contar total
    total = await count_users(query)

    # Recuperar página
    offset = (page - 1) * page_size
    users = await fetch_users(query, limit=page_size, offset=offset)

    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )
```

### Patrón 3: Manejo de Errores y Códigos de Estado

```python
from fastapi import HTTPException, status
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None
    timestamp: str
    path: str

class ValidationErrorDetail(BaseModel):
    field: str
    message: str
    value: Any

# Códigos de estado consistentes
STATUS_CODES = {
    "success": 200,
    "created": 201,
    "no_content": 204,
    "bad_request": 400,
    "unauthorized": 401,
    "forbidden": 403,
    "not_found": 404,
    "conflict": 409,
    "unprocessable": 422,
    "internal_error": 500
}

def raise_not_found(resource: str, id: str):
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error": "NotFound",
            "message": f"{resource} not found",
            "details": {"id": id}
        }
    )

def raise_validation_error(errors: List[ValidationErrorDetail]):
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": "ValidationError",
            "message": "Request validation failed",
            "details": {"errors": [e.dict() for e in errors]}
        }
    )

# Ejemplo de uso
@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    user = await fetch_user(user_id)
    if not user:
        raise_not_found("User", user_id)
    return user
```

### Patrón 4: HATEOAS (Hypermedia as the Engine of Application State)

```python
class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    _links: dict

    @classmethod
    def from_user(cls, user: User, base_url: str):
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            _links={
                "self": {"href": f"{base_url}/api/users/{user.id}"},
                "orders": {"href": f"{base_url}/api/users/{user.id}/orders"},
                "update": {
                    "href": f"{base_url}/api/users/{user.id}",
                    "method": "PATCH"
                },
                "delete": {
                    "href": f"{base_url}/api/users/{user.id}",
                    "method": "DELETE"
                }
            }
        )
```

## Patrones de Diseño de GraphQL

### Patrón 1: Diseño del Esquema

```graphql
# schema.graphql

# Definiciones de tipo claras
type User {
  id: ID!
  email: String!
  name: String!
  createdAt: DateTime!

  # Relaciones
  orders(first: Int = 20, after: String, status: OrderStatus): OrderConnection!

  profile: UserProfile
}

type Order {
  id: ID!
  status: OrderStatus!
  total: Money!
  items: [OrderItem!]!
  createdAt: DateTime!

  # Referencia inversa
  user: User!
}

# Patrón de paginación (Estilo Relay)
type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge {
  node: Order!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Enums para seguridad de tipos
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

# Escalares personalizados
scalar DateTime
scalar Money

# Raíz de consulta (Query root)
type Query {
  user(id: ID!): User
  users(first: Int = 20, after: String, search: String): UserConnection!

  order(id: ID!): Order
}

# Raíz de mutación (Mutation root)
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!

  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}

# Tipos de entrada para mutaciones
input CreateUserInput {
  email: String!
  name: String!
  password: String!
}

# Tipos de carga útil (Payload) para mutaciones
type CreateUserPayload {
  user: User
  errors: [Error!]
}

type Error {
  field: String
  message: String!
}
```

### Patrón 2: Diseño de Resolvers

```python
from typing import Optional, List
from ariadne import QueryType, MutationType, ObjectType
from dataclasses import dataclass

query = QueryType()
mutation = MutationType()
user_type = ObjectType("User")

@query.field("user")
async def resolve_user(obj, info, id: str) -> Optional[dict]:
    """Resolver un único usuario por ID."""
    return await fetch_user_by_id(id)

@query.field("users")
async def resolve_users(
    obj,
    info,
    first: int = 20,
    after: Optional[str] = None,
    search: Optional[str] = None
) -> dict:
    """Resolver lista de usuarios paginada."""
    # Decodificar cursor
    offset = decode_cursor(after) if after else 0

    # Recuperar usuarios
    users = await fetch_users(
        limit=first + 1,  # Recuperar uno extra para verificar hasNextPage
        offset=offset,
        search=search
    )

    # Paginación
    has_next = len(users) > first
    if has_next:
        users = users[:first]

    edges = [
        {
            "node": user,
            "cursor": encode_cursor(offset + i)
        }
        for i, user in enumerate(users)
    ]

    return {
        "edges": edges,
        "pageInfo": {
            "hasNextPage": has_next,
            "hasPreviousPage": offset > 0,
            "startCursor": edges[0]["cursor"] if edges else None,
            "endCursor": edges[-1]["cursor"] if edges else None
        },
        "totalCount": await count_users(search=search)
    }

@user_type.field("orders")
async def resolve_user_orders(user: dict, info, first: int = 20) -> dict:
    """Resolver pedidos del usuario (Prevención de N+1 con DataLoader)."""
    # Usar DataLoader para agrupar solicitudes
    loader = info.context["loaders"]["orders_by_user"]
    orders = await loader.load(user["id"])

    return paginate_orders(orders, first)

@mutation.field("createUser")
async def resolve_create_user(obj, info, input: dict) -> dict:
    """Crear un nuevo usuario."""
    try:
        # Validar entrada
        validate_user_input(input)

        # Crear usuario
        user = await create_user(
            email=input["email"],
            name=input["name"],
            password=hash_password(input["password"])
        )

        return {
            "user": user,
            "errors": []
        }
    except ValidationError as e:
        return {
            "user": None,
            "errors": [{"field": e.field, "message": e.message}]
        }
```

### Patrón 3: DataLoader (Prevención del Problema N+1)

```python
from aiodataloader import DataLoader
from typing import List, Optional

class UserLoader(DataLoader):
    """Carga por lotes de usuarios por ID."""

    async def batch_load_fn(self, user_ids: List[str]) -> List[Optional[dict]]:
        """Cargar múltiples usuarios en una sola consulta."""
        users = await fetch_users_by_ids(user_ids)

        # Mapear resultados de vuelta al orden de entrada
        user_map = {user["id"]: user for user in users}
        return [user_map.get(user_id) for user_id in user_ids]

class OrdersByUserLoader(DataLoader):
    """Carga por lotes de pedidos por ID de usuario."""

    async def batch_load_fn(self, user_ids: List[str]) -> List[List[dict]]:
        """Cargar pedidos para múltiples usuarios en una sola consulta."""
        orders = await fetch_orders_by_user_ids(user_ids)

        # Agrupar pedidos por user_id
        orders_by_user = {}
        for order in orders:
            user_id = order["user_id"]
            if user_id not in orders_by_user:
                orders_by_user[user_id] = []
            orders_by_user[user_id].append(order)

        # Retornar en el orden de entrada
        return [orders_by_user.get(user_id, []) for user_id in user_ids]

# Configuración del contexto
def create_context():
    return {
        "loaders": {
            "user": UserLoader(),
            "orders_by_user": OrdersByUserLoader()
        }
    }
```

## Mejores Prácticas

### APIs REST

1.  **Nomenclatura Consistente**: Usa sustantivos en plural para las colecciones (`/users`, no `/user`).
2.  **Sin Estado (Stateless)**: Cada solicitud contiene toda la información necesaria.
3.  **Usa Correctamente los Códigos de Estado HTTP**: 2xx éxito, 4xx errores del cliente, 5xx errores del servidor.
4.  **Versiona tu API**: Planifica los cambios que rompen la compatibilidad desde el primer día.
5.  **Paginación**: Siempre pagina las colecciones grandes.
6.  **Limitación de Tasa (Rate Limiting)**: Protege tu API con límites de tasa.
7.  **Documentación**: Usa OpenAPI/Swagger para documentos interactivos.

### APIs GraphQL

1.  **Primero el Esquema (Schema First)**: Diseña el esquema antes de escribir los resolvers.
2.  **Evita el N+1**: Usa DataLoaders para una recuperación de datos eficiente.
3.  **Validación de Entrada**: Valida a nivel de esquema y de resolver.
4.  **Manejo de Errores**: Retorna errores estructurados en los payloads de las mutaciones.
5.  **Paginación**: Usa paginación basada en cursores (especificación Relay).
6.  **Depreciación**: Usa la directiva `@deprecated` para una migración gradual.
7.  **Monitoreo**: Rastrea la complejidad de las consultas y el tiempo de ejecución.

## Errores Comunes (Pitfalls)

- **Exceso o escasez de datos (REST)**: Solucionado en GraphQL pero requiere DataLoaders.
- **Cambios que Rompen la Compatibilidad**: Versiona las APIs o usa estrategias de depreciación.
- **Formatos de Error Inconsistentes**: Estandariza las respuestas de error.
- **Falta de Límites de Tasa**: Las APIs sin límites son vulnerables al abuso.
- **Documentación Pobre**: Las APIs no documentadas frustran a los desarrolladores.
- **Ignorar la Semántica HTTP**: El uso de POST para operaciones idempotentes rompe las expectativas.
- **Acoplamiento Estrecho**: La estructura de la API no debe reflejar el esquema de la base de datos.

## Recursos

- **references/rest-best-practices.md**: Guía completa de diseño de APIs REST.
- **references/graphql-schema-design.md**: Patrones y anti-patrones de esquemas GraphQL.
- **references/api-versioning-strategies.md**: Enfoques de versionado y rutas de migración.
- **assets/rest-api-template.py**: Plantilla de API REST con FastAPI.
- **assets/graphql-schema-template.graphql**: Ejemplo de esquema GraphQL completo.
- **assets/api-design-checklist.md**: Lista de verificación previa a la implementación.
- **scripts/openapi-generator.py**: Generar especificaciones OpenAPI desde el código.
