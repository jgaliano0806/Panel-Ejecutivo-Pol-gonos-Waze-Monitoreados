---
name: tanstack-query
description: |
  Gestiona el estado del servidor en React con TanStack Query v5. Cubre useMutationState, actualizaciones optimistas simplificadas, throwOnError, modo de red (offline/PWA) e infiniteQueryOptions.

  Úsalo al configurar la obtención de datos, corregir errores de migración de v4 a v5 (sintaxis de objeto, gcTime, isPending, keepPreviousData) o depurar problemas de SSR/hidratación con componentes de servidor de streaming.
user-invocable: true
---

# TanStack Query (React Query) v5

**Última actualización**: 20/01/2026
**Versiones**: @tanstack/react-query@5.90.19, @tanstack/react-query-devtools@5.91.2
**Requisitos**: React 18.0+ (useSyncExternalStore), TypeScript 4.7+ (recomendado)

---

## Nuevas características de la v5

### useMutationState - Seguimiento de mutaciones entre componentes

Accede al estado de la mutación desde cualquier lugar sin pasar props (prop drilling):

```tsx
import { useMutationState } from "@tanstack/react-query";

function GlobalLoadingIndicator() {
  // Obtener todas las mutaciones pendientes
  const pendingMutations = useMutationState({
    filters: { status: "pending" },
    select: (mutation) => mutation.state.variables,
  });

  if (pendingMutations.length === 0) return null;
  return <div>Guardando {pendingMutations.length} elementos...</div>;
}

// Filtrar por clave de mutación
const todoMutations = useMutationState({
  filters: { mutationKey: ["addTodo"] },
});
```

### Actualizaciones optimistas simplificadas

Nuevo patrón usando `variables`: sin manipulación de caché, sin necesidad de reversión (rollback):

```tsx
function TodoList() {
  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  const addTodo = useMutation({
    mutationKey: ["addTodo"],
    mutationFn: (newTodo) => api.addTodo(newTodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  // Mostrar interfaz de usuario optimista usando variables de mutaciones pendientes
  const pendingTodos = useMutationState({
    filters: { mutationKey: ["addTodo"], status: "pending" },
    select: (mutation) => mutation.state.variables,
  });

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
      {/* Mostrar elementos pendientes con indicador visual */}
      {pendingTodos.map((todo, i) => (
        <li key={`pending-${i}`} style={{ opacity: 0.5 }}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

### throwOnError - Límites de error (Error Boundaries)

Renombrado de `useErrorBoundary` (cambio que rompe la compatibilidad):

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallbackRender={({ resetErrorBoundary }) => (
          <div>
            ¡Error! <button onClick={resetErrorBoundary}>Reintentar</button>
          </div>
        )}>
          <Todos />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

function Todos() {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    throwOnError: true, // ✅ v5 (era useErrorBoundary en v4)
  })
  return <div>{data.map(...)}</div>
}
```

### Modo de red (Soporte Offline/PWA)

Controla el comportamiento cuando no hay conexión:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst", // Usar caché cuando esté offline
    },
  },
});

// Sobrescribir por consulta
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  networkMode: "always", // Intentar siempre, incluso offline (para APIs locales)
});
```

| Modo                      | Comportamiento                                           |
| ------------------------- | -------------------------------------------------------- |
| `online` (predeterminado) | Solo buscar cuando esté online                           |
| `always`                  | Intentar siempre (útil para APIs locales/service worker) |
| `offlineFirst`            | Usar caché primero, buscar cuando esté online            |

**Detectar estado pausado:**

```tsx
const { isPending, fetchStatus } = useQuery(...)
// isPending + fetchStatus === 'paused' = offline, esperando red
```

### useQueries con Combine

Combina resultados de consultas paralelas:

```tsx
const results = useQueries({
  queries: userIds.map((id) => ({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  })),
  combine: (results) => ({
    data: results.map((r) => r.data),
    pending: results.some((r) => r.isPending),
    error: results.find((r) => r.error)?.error,
  }),
});

// Acceder al resultado combinado
if (results.pending) return <Loading />;
console.log(results.data); // [user1, user2, user3]
```

### Ayudante infiniteQueryOptions

Fábrica con tipos seguros para consultas infinitas (paralelo a `queryOptions`):

```tsx
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  prefetchInfiniteQuery,
} from "@tanstack/react-query";

const todosInfiniteOptions = infiniteQueryOptions({
  queryKey: ["todos", "infinite"],
  queryFn: ({ pageParam }) => fetchTodosPage(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

// Reutilizar en diferentes hooks
useInfiniteQuery(todosInfiniteOptions);
useSuspenseInfiniteQuery(todosInfiniteOptions);
prefetchInfiniteQuery(queryClient, todosInfiniteOptions);
```

### maxPages - Optimización de memoria

Limita las páginas almacenadas en caché para consultas infinitas:

```tsx
useInfiniteQuery({
  queryKey: ["posts"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor, // Requerido con maxPages
  maxPages: 3, // Solo mantener 3 páginas en memoria
});
```

**Nota:** `maxPages` requiere paginación bidireccional (`getNextPageParam` Y `getPreviousPageParam`).

---

## Configuración Rápida

```bash
npm install @tanstack/react-query@latest
npm install -D @tanstack/react-query-devtools@latest
```

### Paso 2: Proveedor + Configuración

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 60, // 1 hora (v5: renombrado de cacheTime)
      refetchOnWindowFocus: false,
    },
  },
})

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Paso 3: Hooks de Consulta y Mutación

```tsx
// src/hooks/useTodos.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";

// Fábrica de opciones de consulta (patrón v5)
export const todosQueryOptions = queryOptions({
  queryKey: ["todos"],
  queryFn: async () => {
    const res = await fetch("/api/todos");
    if (!res.ok) throw new Error("Error al obtener datos");
    return res.json();
  },
});

export function useTodos() {
  return useQuery(todosQueryOptions);
}

export function useAddTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTodo) => {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodo),
      });
      if (!res.ok) throw new Error("Error al agregar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

// Uso:
function TodoList() {
  const { data, isPending, isError, error } = useTodos();
  const { mutate } = useAddTodo();

  if (isPending) return <div>Cargando...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

---

## Reglas Críticas

### Qué hacer siempre

✅ **Usar la sintaxis de objeto para todos los hooks**

```tsx
// v5 SOLO soporta esto:
useQuery({ queryKey, queryFn, ...options });
useMutation({ mutationFn, ...options });
```

✅ **Usar matrices (arrays) para las claves de consulta (query keys)**

```tsx
queryKey: ["todos"]; // Lista
queryKey: ["todos", id]; // Detalle
queryKey: ["todos", { filter }]; // Filtrado
```

✅ **Configurar staleTime de forma apropiada**

```tsx
staleTime: 1000 * 60 * 5; // 5 min - evita re-obtenciones excesivas
```

✅ **Usar isPending para el estado de carga inicial**

```tsx
if (isPending) return <Loading />;
// isPending = aún no hay datos Y se está obteniendo datos
```

✅ **Lanzar (throw) errores en queryFn**

```tsx
if (!response.ok) throw new Error("Falló");
```

✅ **Invalidar consultas después de las mutaciones**

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["todos"] });
};
```

✅ **Usar la fábrica queryOptions para patrones reutilizables**

```tsx
const opts = queryOptions({ queryKey, queryFn });
useQuery(opts);
useSuspenseQuery(opts);
prefetchQuery(opts);
```

✅ **Usar gcTime (no cacheTime)**

```tsx
gcTime: 1000 * 60 * 60; // 1 hora
```

### Qué NO hacer nunca

❌ **Nunca usar la matriz de v4 o la sintaxis de función**

```tsx
// v4 (eliminado en v5):
useQuery(["todos"], fetchTodos, options); // ❌

// v5 (correcto):
useQuery({ queryKey: ["todos"], queryFn: fetchTodos }); // ✅
```

❌ **Nunca usar callbacks de consulta (onSuccess, onError, onSettled en consultas)**

```tsx
// v5 eliminó estos de las consultas:
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  onSuccess: (data) => {}, // ❌ Eliminado en v5
});

// Usar useEffect en su lugar:
const { data } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
useEffect(() => {
  if (data) {
    // Hacer algo
  }
}, [data]);

// O usar callbacks de mutación (aún soportados):
useMutation({
  mutationFn: addTodo,
  onSuccess: () => {}, // ✅ Sigue funcionando para mutaciones
});
```

❌ **Nunca usar opciones obsoletas (deprecated)**

```tsx
// Obsoletas en v5:
cacheTime: 1000; // ❌ Usa gcTime en su lugar
isLoading: true; // ❌ El significado cambió, usa isPending
keepPreviousData: true; // ❌ Usa placeholderData en su lugar
onSuccess: () => {}; // ❌ Eliminado de las consultas
useErrorBoundary: true; // ❌ Usa throwOnError en su lugar
```

❌ **Nunca asumir que isLoading significa "aún no hay datos"**

```tsx
// v5 cambió esto:
isLoading = isPending && isFetching // ❌ Ahora significa "pendiente Y obteniendo datos"
isPending = aún no hay datos // ✅ Usa esto para la carga inicial
```

❌ **Nunca olvidar initialPageParam para consultas infinitas**

```tsx
// v5 requiere esto:
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0, // ✅ Requerido en v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

❌ **Nunca usar enabled con useSuspenseQuery**

```tsx
// No permitido:
useSuspenseQuery({
  queryKey: ["todo", id],
  queryFn: () => fetchTodo(id),
  enabled: !!id, // ❌ No disponible con suspense
});

// Usar renderizado condicional en su lugar:
{
  id && <TodoComponent id={id} />;
}
```

❌ **Nunca confiar en refetchOnMount: false para consultas con error**

```tsx
// No funciona - los errores siempre se consideran obsoletos (stale)
useQuery({
  queryKey: ["data"],
  queryFn: failingFetch,
  refetchOnMount: false, // ❌ Se ignora cuando la consulta tiene error
});

// Usar retryOnMount en su lugar
useQuery({
  queryKey: ["data"],
  queryFn: failingFetch,
  refetchOnMount: false,
  retryOnMount: false, // ✅ Evita la re-obtención para consultas con error
  retry: 0,
});
```

## Prevención de problemas conocidos

Esta habilidad evita **16 problemas documentados** de la migración a la v5, errores de SSR/hidratación y errores comunes:

### Problema #1: Se requiere la sintaxis de objeto

**Error**: `useQuery is not a function` o errores de tipo
**Fuente**: [Guía de migración a la v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#removed-overloads-in-favor-of-object-syntax)
**Por qué sucede**: La v5 eliminó todas las sobrecargas de funciones; solo funciona la sintaxis de objeto.
**Prevención**: Usa siempre `useQuery({ queryKey, queryFn, ...options })`

**Antes (v4):**

```tsx
useQuery(["todos"], fetchTodos, { staleTime: 5000 });
```

**Después (v5):**

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  staleTime: 5000,
});
```

### Problema #2: Callbacks de consulta eliminados

**Error**: Los callbacks no se ejecutan, errores de TypeScript
**Fuente**: [Cambios que rompen en la v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#callbacks-on-usequery-and-queryobserver-have-been-removed)
**Por qué sucede**: onSuccess, onError, onSettled eliminados de las consultas (siguen funcionando en las mutaciones).
**Prevención**: Usa `useEffect` para los efectos secundarios o mueve la lógica a los callbacks de mutación.

**Antes (v4):**

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  onSuccess: (data) => {
    console.log("Tareas cargadas:", data);
  },
});
```

**Después (v5):**

```tsx
const { data } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
useEffect(() => {
  if (data) {
    console.log("Tareas cargadas:", data);
  }
}, [data]);
```

### Problema #3: Estado Loading → Pending

**Error**: La interfaz muestra un estado de carga incorrecto
**Fuente**: [Migración v5: isLoading renombrado](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#isloading-and-isfetching-flags)
**Por qué sucede**: `status: 'loading'` renombrado a `status: 'pending'`, el significado de `isLoading` cambió.
**Prevención**: Usa `isPending` para la carga inicial, `isLoading` para "pendiente Y obteniendo datos".

**Antes (v4):**

```tsx
const { data, isLoading } = useQuery(...)
if (isLoading) return <div>Cargando...</div>
```

**Después (v5):**

```tsx
const { data, isPending, isLoading } = useQuery(...)
if (isPending) return <div>Cargando...</div>
// isLoading = isPending && isFetching (obteniendo datos por primera vez)
```

### Problema #4: cacheTime → gcTime

**Error**: `cacheTime is not a valid option`
**Fuente**: [Migración v5: gcTime](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#cachetime-has-been-replaced-by-gctime)
**Por qué sucede**: Renombrado para reflejar mejor "tiempo de recolección de basura" (garbage collection time).
**Prevención**: Usa `gcTime` en lugar de `cacheTime`.

**Antes (v4):**

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  cacheTime: 1000 * 60 * 60,
});
```

**Después (v5):**

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  gcTime: 1000 * 60 * 60,
});
```

### Problema #5: useSuspenseQuery + enabled

**Error**: Error de tipo, la opción `enabled` no está disponible
**Fuente**: [Discusión en GitHub #6206](https://github.com/TanStack/query/discussions/6206)
**Por qué sucede**: Suspense garantiza que los datos estén disponibles, no se puede deshabilitar condicionalmente.
**Prevención**: Usa el renderizado condicional en lugar de la opción `enabled`.

**Antes (v4/incorrecto):**

```tsx
useSuspenseQuery({
  queryKey: ["todo", id],
  queryFn: () => fetchTodo(id),
  enabled: !!id, // ❌ No permitido
});
```

**Después (v5/correcto):**

```tsx
// Renderizado condicional:
{
  id ? <TodoComponent id={id} /> : <div>No hay ID seleccionado</div>;
}

// Dentro de TodoComponent:
function TodoComponent({ id }: { id: number }) {
  const { data } = useSuspenseQuery({
    queryKey: ["todo", id],
    queryFn: () => fetchTodo(id),
    // No se necesita la opción enabled
  });
  return <div>{data.title}</div>;
}
```

### Problema #6: Se requiere initialPageParam

**Error**: Error de tipo `initialPageParam is required`
**Fuente**: [Migración v5: Consultas infinitas](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#new-required-initialPageParam-option)
**Por qué sucede**: v4 pasaba `undefined` como el primer pageParam, v5 requiere un valor explícito.
**Prevención**: Especifica siempre `initialPageParam` para consultas infinitas.

**Antes (v4):**

```tsx
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**Después (v5):**

```tsx
useInfiniteQuery({
  queryKey: ["projects"],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0, // ✅ Requerido
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Problema #7: keepPreviousData eliminado

**Error**: `keepPreviousData is not a valid option`
**Fuente**: [Migración v5: placeholderData](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#removed-keeppreviousdata-in-favor-of-placeholderdata-identity-function)
**Por qué sucede**: Reemplazado por la función más flexible `placeholderData`.
**Prevención**: Usa el ayudante `placeholderData: keepPreviousData`.

**Antes (v4):**

```tsx
useQuery({
  queryKey: ["todos", page],
  queryFn: () => fetchTodos(page),
  keepPreviousData: true,
});
```

**Después (v5):**

```tsx
import { keepPreviousData } from "@tanstack/react-query";

useQuery({
  queryKey: ["todos", page],
  queryFn: () => fetchTodos(page),
  placeholderData: keepPreviousData,
});
```

### Problema #8: Predeterminado del tipo de error de TypeScript

**Error**: Errores de tipo con el manejo de errores
**Fuente**: [Migración v5: Tipos de error](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#typeerror-is-now-the-default-error)
**Por qué sucede**: v4 usaba `unknown`, v5 usa de forma predeterminada el tipo `Error`.
**Prevención**: Si lanzas tipos que no son Error, especifica el tipo de error explícitamente.

**Antes (v4 - el error era unknown):**

```tsx
const { error } = useQuery({
  queryKey: ["data"],
  queryFn: async () => {
    if (Math.random() > 0.5) throw "cadena de error personalizada";
    return data;
  },
});
// error: unknown
```

**Después (v5 - especificar tipo de error personalizado):**

```tsx
const { error } = useQuery<DataType, string>({
  queryKey: ["data"],
  queryFn: async () => {
    if (Math.random() > 0.5) throw "cadena de error personalizada";
    return data;
  },
});
// error: string | null

// O mejor: lanzar siempre objetos Error
const { error } = useQuery({
  queryKey: ["data"],
  queryFn: async () => {
    if (Math.random() > 0.5) throw new Error("error personalizado");
    return data;
  },
});
// error: Error | null (predeterminado)
```

### Problema #9: Error de hidratación de componentes de servidor de streaming

**Error**: `Hydration failed because the initial UI does not match what was rendered on the server`
**Fuente**: [GitHub Issue #9642](https://github.com/TanStack/query/issues/9642)
**Afecta a**: v5.82.0+ con SSR de streaming (patrón void prefetch)
**Por qué sucede**: Condición de carrera donde `hydrate()` se resuelve sincrónicamente pero `query.fetch()` crea un reintentador asíncrono, causando un desajuste de isFetching/isStale entre el servidor y el cliente.
**Prevención**: No realices renderizado condicional basado en `fetchStatus` con `useSuspenseQuery` y pre-obtención de streaming, O espera (await) la pre-obtención en lugar del patrón void.

**Antes (causa error de hidratación):**

```tsx
// Servidor: void prefetch
streamingQueryClient.prefetchQuery({ queryKey: ["data"], queryFn: getData });

// Cliente: renderizado condicional en fetchStatus
const { data, isFetching } = useSuspenseQuery({
  queryKey: ["data"],
  queryFn: getData,
});
return (
  <>
    {data && <div>{data}</div>} {isFetching && <Loading />}
  </>
);
```

**Después (solución alternativa):**

```tsx
// Opción 1: Esperar la pre-obtención (Await prefetch)
await streamingQueryClient.prefetchQuery({
  queryKey: ["data"],
  queryFn: getData,
});

// Opción 2: No renderizar basándose en fetchStatus con Suspense
const { data } = useSuspenseQuery({ queryKey: ["data"], queryFn: getData });
return <div>{data}</div>; // Sin condicional en isFetching
```

**Estado**: Problema conocido, bajo investigación por los mantenedores. Requiere la implementación de `getServerSnapshot` en useSyncExternalStore.

### Problema #10: Error de hidratación de useQuery con pre-obtención

**Error**: Desajuste del contenido del texto durante la hidratación
**Fuente**: [GitHub Issue #9399](https://github.com/TanStack/query/issues/9399)
**Afecta a**: v5.x con pre-obtención en el lado del servidor
**Por qué sucede**: `tryResolveSync` detecta promesas resueltas en la carga útil de RSC y extrae datos sincrónicamente durante la hidratación, omitiendo el estado pendiente normal.
**Prevención**: Usa `useSuspenseQuery` en lugar de `useQuery` para SSR, o evita el renderizado condicional basado en `isLoading`.

**Antes (causa error de hidratación):**

```tsx
// Componente de servidor
const queryClient = getServerQueryClient();
await queryClient.prefetchQuery({ queryKey: ["todos"], queryFn: fetchTodos });

// Componente de cliente
function Todos() {
  const { data, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
  if (isLoading) return <div>Cargando...</div>; // El servidor renderiza esto
  return <div>{data.length} tareas</div>; // El cliente hidrata con esto
}
```

**Después (solución alternativa):**

```tsx
// Usar useSuspenseQuery en su lugar
function Todos() {
  const { data } = useSuspenseQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
  return <div>{data.length} tareas</div>;
}
```

**Estado**: "En la parte superior de mi lista de cosas OSS para arreglar" - mantenedor Ephem (noviembre de 2025). Requiere implementar `getServerSnapshot` en useSyncExternalStore.

### Problema #11: refetchOnMount no se respeta para consultas con error

**Error**: Las consultas se vuelven a obtener al montar a pesar de `refetchOnMount: false`
**Fuente**: [GitHub Issue #10018](https://github.com/TanStack/query/issues/10018)
**Afecta a**: v5.90.16+
**Por qué sucede**: Las consultas con error y sin datos siempre se tratan como obsoletas. Esto es intencional para evitar mostrar permanentemente estados de error.
**Prevención**: Usa `retryOnMount: false` en lugar (o además) de `refetchOnMount: false`.

**Antes (re-obtiene a pesar de la configuración):**

```tsx
const { data, error } = useQuery({
  queryKey: ["data"],
  queryFn: () => {
    throw new Error("Falla");
  },
  refetchOnMount: false, // Ignorado cuando la consulta está en estado de error
  retry: 0,
});
// La consulta se vuelve a obtener cada vez que el componente se monta
```

**Después (correcto):**

```tsx
const { data, error } = useQuery({
  queryKey: ["data"],
  queryFn: failingFetch,
  refetchOnMount: false,
  retryOnMount: false, // ✅ Evita la re-obtención al montar para consultas con error
  retry: 0,
});
```

**Estado**: Comportamiento documentado (intencional). El nombre `retryOnMount` es ligeramente engañoso: controla si las consultas con error activan una nueva obtención al montar, no los reintentos automáticos.

### Problema #12: Cambio que rompe en la firma del callback de mutación (v5.89.0)

**Error**: Errores de TypeScript en los callbacks de mutación
**Fuente**: [GitHub Issue #9660](https://github.com/TanStack/query/issues/9660)
**Afecta a**: v5.89.0+
**Por qué sucede**: Parámetro `onMutateResult` agregado entre `variables` y `context`, cambiando las firmas de los callbacks de 3 parámetros a 4.
**Prevención**: Actualiza todos los callbacks de mutación para aceptar 4 parámetros en lugar de 3.

**Antes (v5.88 y anteriores):**

```tsx
useMutation({
  mutationFn: addTodo,
  onError: (error, variables, context) => {
    // context es ahora onMutateResult, falta el parámetro final context
  },
  onSuccess: (data, variables, context) => {
    // Mismo problema
  },
});
```

**Después (v5.89.0+):**

```tsx
useMutation({
  mutationFn: addTodo,
  onError: (error, variables, onMutateResult, context) => {
    // onMutateResult = valor de retorno de onMutate
    // context = contexto de la función de mutación
  },
  onSuccess: (data, variables, onMutateResult, context) => {
    // Firma correcta con 4 parámetros
  },
});
```

**Nota**: Si no usas `onMutate`, el parámetro `onMutateResult` será undefined. Este cambio que rompe fue introducido en una versión de parche.

### Problema #13: Las claves de consulta de solo lectura rompen la coincidencia parcial (v5.90.8)

**Error**: `Type 'readonly ["todos", string]' is not assignable to type '["todos", string]'`
**Fuente**: [GitHub Issue #9871](https://github.com/TanStack/query/issues/9871) | Arreglado en [PR #9872](https://github.com/TanStack/query/pull/9872)
**Afecta a**: Solo v5.90.8 (arreglado en v5.90.9)
**Por qué sucede**: La coincidencia parcial de consultas rompió los tipos de TypeScript para las claves de consulta de solo lectura (usando `as const`).
**Prevención**: Actualiza a v5.90.9+ o usa aserciones de tipo si estás atrapado en v5.90.8.

**Antes (v5.90.8 - error de TypeScript):**

```tsx
export function todoQueryKey(id?: string) {
  return id ? (["todos", id] as const) : (["todos"] as const);
}
// Tipo: readonly ['todos', string] | readonly ['todos']

useMutation({
  mutationFn: addTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: todoQueryKey("123"),
      // Error: readonly ['todos', string] no asignable a ['todos', string]
    });
  },
});
```

**Después (v5.90.9+):**

```tsx
// Funciona correctamente con tipos readonly
queryClient.invalidateQueries({
  queryKey: todoQueryKey("123"), // ✅ Sin error de tipo
});
```

**Estado**: Arreglado en v5.90.9. Afectó particularmente a usuarios de generadores de código como `openapi-react-query` que producen claves de consulta de solo lectura.

### Problema #14: Pérdida de inferencia de tipo en useMutationState

**Error**: `mutation.state.variables` tipado como `unknown` en lugar del tipo real
**Fuente**: [GitHub Issue #9825](https://github.com/TanStack/query/issues/9825)
**Afecta a**: Todas las versiones v5.x
**Por qué sucede**: La coincidencia difusa de la clave de mutación impide la inferencia de tipo garantizada (mismo problema que `queryClient.getQueryCache().find()`).
**Prevención**: Realiza aserciones de tipo explícitas en el callback `select`.

**Antes (la inferencia de tipos no funciona):**

```tsx
const addTodo = useMutation({
  mutationKey: ["addTodo"],
  mutationFn: (todo: Todo) => api.addTodo(todo),
});

const pendingTodos = useMutationState({
  filters: { mutationKey: ["addTodo"], status: "pending" },
  select: (mutation) => {
    return mutation.state.variables; // Tipo: unknown
  },
});
```

**Después (con aserción explícita):**

```tsx
const pendingTodos = useMutationState({
  filters: { mutationKey: ["addTodo"], status: "pending" },
  select: (mutation) => mutation.state.variables as Todo,
});
// O tipar todo el estado:
select: (mutation) =>
  mutation.state as MutationState<Todo, Error, Todo, unknown>;
```

**Estado**: Limitación conocida de la coincidencia difusa. No hay una solución planeada.

### Problema #15: Cancelación de consultas en StrictMode con fetchQuery

**Error**: `CancelledError` al usar `fetchQuery()` con `useQuery`
**Fuente**: [GitHub Issue #9798](https://github.com/TanStack/query/issues/9798)
**Afecta a**: Solo desarrollo (StrictMode de React)
**Por qué sucede**: StrictMode causa un doble montaje/desmontaje. Cuando `useQuery` se desmonta y es el último observador, cancela la consulta incluso si `fetchQuery()` también se está ejecutando.
**Prevención**: Este es un comportamiento esperado solo en desarrollo. No afecta a producción.

**Ejemplo:**

```tsx
async function loadData() {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["data"],
      queryFn: fetchData,
    });
    console.log("Cargado:", data); // Nunca registra en StrictMode
  } catch (error) {
    console.error("Falló:", error); // CancelledError
  }
}

function Component() {
  const { data } = useQuery({ queryKey: ["data"], queryFn: fetchData });
  // En StrictMode, el componente se desmonta/remonta, cancelando fetchQuery
}
```

**Solución alternativa:**

```tsx
// Mantener la consulta observada con staleTime
const { data } = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  staleTime: Infinity, // Mantiene la consulta activa
});
```

**Estado**: Comportamiento esperado de StrictMode, no es un error. Las compilaciones de producción no se ven afectadas.

### Problema #16: invalidateQueries solo vuelve a obtener consultas activas

**Error**: Las consultas inactivas no se vuelven a obtener a pesar de la llamada a `invalidateQueries()`
**Fuente**: [GitHub Issue #9531](https://github.com/TanStack/query/issues/9531)
**Afecta a**: Todas las versiones v5.x
**Por qué sucede**: La documentación era engañosa: `invalidateQueries()` solo vuelve a obtener las consultas "activas" de forma predeterminada, no "todas" las consultas.
**Prevención**: Usa `refetchType: 'all'` para forzar la re-obtención de consultas inactivas.

**Comportamiento predeterminado:**

```tsx
// Solo las consultas activas (actualmente siendo observadas) se volverán a obtener
queryClient.invalidateQueries({ queryKey: ["todos"] });
```

**Para volver a obtener consultas inactivas:**

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
  refetchType: "all", // Re-obtener activas E inactivas
});
```

**Estado**: Documentación corregida para aclarar consultas "activas". Este es el comportamiento previsto.

---

## Consejos de la comunidad

> **Nota**: Estos consejos provienen de expertos de la comunidad y blogs de mantenedores. Verifícalos con tu versión.

### Consejo: Opciones de consulta con múltiples oyentes

**Fuente**: [Blog de TkDodo - Lecciones de diseño de API](https://tkdodo.eu/blog/react-query-api-design-lessons-learned) | **Confianza**: ALTA
**Aplica a**: v5.27.3+

Cuando varios componentes usan la misma consulta con diferentes opciones (como `staleTime`), se aplica la regla de "la última escritura gana" para futuras obtenciones, pero la consulta actual en curso usa sus opciones originales. Esto puede causar un comportamiento inesperado cuando los componentes se montan en diferentes momentos.

**Ejemplo de comportamiento inesperado:**

```tsx
// Componente A se monta primero
function ComponentA() {
  const { data } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    staleTime: 5000, // Aplicado inicialmente
  });
}

// Componente B se monta mientras la consulta de A está en curso
function ComponentB() {
  const { data } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    staleTime: 60000, // No afectará a la obtención actual, solo a las futuras
  });
}
```

**Enfoque recomendado:**

```tsx
// Escribir opciones como funciones que hagan referencia a los últimos valores
const getStaleTime = () => (shouldUseLongCache ? 60000 : 5000);

useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
  staleTime: getStaleTime(), // Evaluado en cada renderizado
});
```

### Consejo: refetch() NO es para parámetros cambiados

**Fuente**: [Evitando errores comunes con TanStack Query](https://www.buncolak.com/posts/avoiding-common-mistakes-with-tanstack-query-part-1/) | **Confianza**: ALTA

La función `refetch()` SOLO debe usarse para refrescar con los mismos parámetros (como un botón de "recarga" manual). Para nuevos parámetros (filtros, números de página, términos de búsqueda, etc.), inclúyelos en la clave de consulta en su lugar.

**Antipatrón:**

```tsx
// ❌ Incorrecto - usar refetch() para diferentes parámetros
const [page, setPage] = useState(1);
const { data, refetch } = useQuery({
  queryKey: ["todos"], // Misma clave para todas las páginas
  queryFn: () => fetchTodos(page),
});

// Esto vuelve a obtener con el valor de página ANTIGUO, no con el nuevo
<button
  onClick={() => {
    setPage(2);
    refetch();
  }}
>
  Siguiente
</button>;
```

**Patrón correcto:**

```tsx
// ✅ Correcto - incluir parámetros en la clave de consulta
const [page, setPage] = useState(1);
const { data } = useQuery({
  queryKey: ["todos", page], // La clave cambia con la página
  queryFn: () => fetchTodos(page),
  // La consulta se vuelve a obtener automáticamente cuando la página cambia
});

<button onClick={() => setPage(2)}>Siguiente</button>; // Solo actualiza el estado
```

**Cuándo usar refetch():**

```tsx
// ✅ Actualización manual de los mismos datos (botón de actualización)
const { data, refetch } = useQuery({
  queryKey: ["todos"],
  queryFn: fetchTodos,
});

<button onClick={() => refetch()}>Refrescar</button>; // Mismos parámetros
```

---

## Patrones clave

**Consultas dependientes** (la consulta B espera a la consulta A):

```tsx
const { data: posts } = useQuery({
  queryKey: ["users", userId, "posts"],
  queryFn: () => fetchUserPosts(userId),
  enabled: !!user, // Esperar al usuario
});
```

**Consultas paralelas** (obtener varias a la vez):

```tsx
const results = useQueries({
  queries: ids.map((id) => ({
    queryKey: ["todos", id],
    queryFn: () => fetchTodo(id),
  })),
});
```

**Pre-obtención** (precarga al pasar el ratón):

```tsx
queryClient.prefetchQuery({
  queryKey: ["todo", id],
  queryFn: () => fetchTodo(id),
});
```

**Desplazamiento infinito** (useInfiniteQuery):

```tsx
useInfiniteQuery({
  queryKey: ["todos", "infinite"],
  queryFn: ({ pageParam }) => fetchTodosPage(pageParam),
  initialPageParam: 0, // Requerido en v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**Cancelación de consultas** (cancelación automática al cambiar queryKey):

```tsx
queryFn: async ({ signal }) => {
  const res = await fetch(`/api/todos?q=${search}`, { signal });
  return res.json();
};
```

**Data Transformation** (select):

```tsx
select: (data) => data.filter((todo) => todo.completed);
```

**Evitar cascadas de solicitudes (request waterfalls)**: Obtén datos en paralelo cuando sea posible (no encadenes consultas a menos que sean verdaderamente dependientes).

---

**Documentación oficial**: https://tanstack.com/query/latest | **Migración v5**: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5 | **GitHub**: https://github.com/TanStack/query
