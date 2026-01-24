---
name: typescript-advanced-types
description: Domina el sistema de tipos avanzado de TypeScript, incluyendo genéricos, tipos condicionales, tipos mapeados, literales de plantilla y tipos utilitarios para construir aplicaciones con tipos seguros (type-safe). Úsalo al implementar lógica de tipos compleja, crear utilidades de tipos reutilizables o garantizar la seguridad de tipos en tiempo de compilación en proyectos de TypeScript.
---

# Tipos Avanzados de TypeScript

Guía completa para dominar el sistema de tipos avanzado de TypeScript, incluyendo genéricos, tipos condicionales, tipos mapeados, tipos literales de plantilla y tipos utilitarios para construir aplicaciones robustas y con tipos seguros.

## Cuándo usar este Skill

- Construcción de librerías o frameworks con tipos seguros.
- Creación de componentes genéricos reutilizables.
- Implementación de lógica compleja de inferencia de tipos.
- Diseño de clientes de API con tipos seguros.
- Construcción de sistemas de validación de formularios.
- Creación de objetos de configuración fuertemente tipados.
- Implementación de gestión de estado con tipos seguros.
- Migración de bases de código JavaScript a TypeScript.

## Conceptos Principales

### 1. Genéricos (Generics)

**Propósito:** Crear componentes reutilizables y flexibles en cuanto al tipo, manteniendo la seguridad de tipos.

**Función Genérica Básica:**

```typescript
function identidad<T>(valor: T): T {
  return valor;
}

const num = identidad<number>(42); // Tipo: number
const str = identidad<string>("hola"); // Tipo: string
const auto = identidad(true); // Tipo inferido: boolean
```

**Restricciones Genéricas (Generic Constraints):**

```typescript
interface TieneLongitud {
  length: number;
}

function registrarLongitud<T extends TieneLongitud>(item: T): T {
  console.log(item.length);
  return item;
}

registrarLongitud("hola"); // OK: string tiene longitud
registrarLongitud([1, 2, 3]); // OK: array tiene longitud
registrarLongitud({ length: 10 }); // OK: objeto tiene longitud
// registrarLongitud(42);             // Error: number no tiene longitud
```

**Múltiples Parámetros de Tipo:**

```typescript
function fusionar<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const fusionado = fusionar({ nombre: "Juan" }, { edad: 30 });
// Tipo: { nombre: string } & { edad: number }
```

### 2. Tipos Condicionales (Conditional Types)

**Propósito:** Crear tipos que dependen de condiciones, habilitando una lógica de tipos sofisticada.

**Tipo Condicional Básico:**

```typescript
type EsCadena<T> = T extends string ? true : false;

type A = EsCadena<string>; // true
type B = EsCadena<number>; // false
```

**Extracción de Tipos de Retorno:**

```typescript
type TipoRetorno<T> = T extends (...args: any[]) => infer R ? R : never;

function obtenerUsuario() {
  return { id: 1, nombre: "Juan" };
}

type Usuario = TipoRetorno<typeof obtenerUsuario>;
// Tipo: { id: number; nombre: string; }
```

**Tipos Condicionales Distributivos:**

```typescript
type EnArray<T> = T extends any ? T[] : never;

type ArrayDeCadenasONumeros = EnArray<string | number>;
// Tipo: string[] | number[]
```

**Condiciones Anidadas:**

```typescript
type NombreTipo<T> = T extends string
  ? "string"
  : T extends number
    ? "number"
    : T extends boolean
      ? "boolean"
      : T extends undefined
        ? "undefined"
        : T extends Function
          ? "function"
          : "object";

type T1 = NombreTipo<string>; // "string"
type T2 = NombreTipo<() => void>; // "function"
```

### 3. Tipos Mapeados (Mapped Types)

**Propósito:** Transformar tipos existentes iterando sobre sus propiedades.

**Tipo Mapeado Básico:**

```typescript
type SoloLectura<T> = {
  readonly [P in keyof T]: T[P];
};

interface Usuario {
  id: number;
  nombre: string;
}

type UsuarioSoloLectura = SoloLectura<Usuario>;
// Tipo: { readonly id: number; readonly nombre: string; }
```

**Propiedades Opcionales:**

```typescript
type Parcial<T> = {
  [P in keyof T]?: T[P];
};

type UsuarioParcial = Parcial<Usuario>;
// Tipo: { id?: number; nombre?: string; }
```

**Remapeo de Claves (Key Remapping):**

```typescript
type ObtenerCaptadores<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Persona {
  nombre: string;
  edad: number;
}

type CaptadoresPersona = ObtenerCaptadores<Persona>;
// Tipo: { getNombre: () => string; getEdad: () => number; }
```

**Filtrado de Propiedades:**

```typescript
type ElegirPorTipo<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mezclado {
  id: number;
  nombre: string;
  edad: number;
  activo: boolean;
}

type SoloNumeros = ElegirPorTipo<Mezclado, number>;
// Tipo: { id: number; edad: number; }
```

### 4. Tipos Literales de Plantilla (Template Literal Types)

**Propósito:** Crear tipos basados en cadenas con coincidencia de patrones y transformación.

**Literal de Plantilla Básico:**

```typescript
type NombreEvento = "click" | "focus" | "blur";
type ManejadorEvento = `on${Capitalize<NombreEvento>}`;
// Tipo: "onClick" | "onFocus" | "onBlur"
```

**Manipulación de Cadenas:**

```typescript
type SaludoMayusculas = Uppercase<"hola">; // "HOLA"
type SaludoMinusculas = Lowercase<"HOLA">; // "hola"
type NombreCapitalizado = Capitalize<"juan">; // "Juan"
type NombreDescapitalizado = Uncapitalize<"Juan">; // "juan"
```

**Construcción de Rutas:**

```typescript
type Ruta<T> = T extends object
  ? {
      [K in keyof T]: K extends string ? `${K}` | `${K}.${Ruta<T[K]>}` : never;
    }[keyof T]
  : never;

interface Config {
  servidor: {
    host: string;
    puerto: number;
  };
  baseDeDatos: {
    url: string;
  };
}

type RutaConfig = Ruta<Config>;
// Tipo: "servidor" | "baseDeDatos" | "servidor.host" | "servidor.puerto" | "baseDeDatos.url"
```

### 5. Tipos Utilitarios (Utility Types)

**Tipos Utilitarios Integrados:**

```typescript
// Partial<T> - Hace que todas las propiedades sean opcionales
type UsuarioParcial = Partial<Usuario>;

// Required<T> - Hace que todas las propiedades sean obligatorias
type UsuarioRequerido = Required<UsuarioParcial>;

// Readonly<T> - Hace que todas las propiedades sean de solo lectura
type UsuarioSoloLectura = Readonly<Usuario>;

// Pick<T, K> - Selecciona propiedades específicas
type NombreUsuario = Pick<Usuario, "nombre" | "email">;

// Omit<T, K> - Elimina propiedades específicas
type UsuarioSinPassword = Omit<Usuario, "password">;

// Exclude<T, U> - Excluye tipos de una unión
type T1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"

// Extract<T, U> - Extrae tipos de una unión
type T2 = Extract<"a" | "b" | "c", "a" | "b">; // "a" | "b"

// NonNullable<T> - Excluye null y undefined
type T3 = NonNullable<string | null | undefined>; // string

// Record<K, T> - Crea un tipo objeto con claves K y valores T
type InfoPagina = Record<"inicio" | "sobre_nosotros", { titulo: string }>;
```

## Patrones Avanzados

### Patrón 1: Emisor de Eventos con Tipos Seguros

```typescript
type MapaEventos = {
  "usuario:creado": { id: string; nombre: string };
  "usuario:actualizado": { id: string };
  "usuario:eliminado": { id: string };
};

class EmisorEventosTipado<T extends Record<string, any>> {
  private oyentes: {
    [K in keyof T]?: Array<(datos: T[K]) => void>;
  } = {};

  on<K extends keyof T>(evento: K, callback: (datos: T[K]) => void): void {
    if (!this.oyentes[evento]) {
      this.oyentes[evento] = [];
    }
    this.oyentes[evento]!.push(callback);
  }

  emit<K extends keyof T>(evento: K, datos: T[K]): void {
    const callbacks = this.oyentes[evento];
    if (callbacks) {
      callbacks.forEach((callback) => callback(datos));
    }
  }
}

const emisor = new EmisorEventosTipado<MapaEventos>();

emisor.on("usuario:creado", (datos) => {
  console.log(datos.id, datos.nombre); // ¡Seguridad de tipos!
});

emisor.emit("usuario:creado", { id: "1", nombre: "Juan" });
// emisor.emit("usuario:creado", { id: "1" });  // Error: falta 'nombre'
```

### Patrón 2: Cliente de API con Tipos Seguros

```typescript
type MetodoHTTP = "GET" | "POST" | "PUT" | "DELETE";

type ConfigEndpoints = {
  "/usuarios": {
    GET: { respuesta: Usuario[] };
    POST: { cuerpo: { nombre: string; email: string }; respuesta: Usuario };
  };
  "/usuarios/:id": {
    GET: { parametros: { id: string }; respuesta: Usuario };
    PUT: {
      parametros: { id: string };
      cuerpo: Partial<Usuario>;
      respuesta: Usuario;
    };
    DELETE: { parametros: { id: string }; respuesta: void };
  };
};

type ExtraerParametros<T> = T extends { parametros: infer P } ? P : never;
type ExtraerCuerpo<T> = T extends { cuerpo: infer B } ? B : never;
type ExtraerRespuesta<T> = T extends { respuesta: infer R } ? R : never;

class ClienteAPI<Config extends Record<string, Record<MetodoHTTP, any>>> {
  async request<Ruta extends keyof Config, Metodo extends keyof Config[Ruta]>(
    ruta: Ruta,
    metodo: Metodo,
    ...[opciones]: ExtraerParametros<Config[Ruta][Metodo]> extends never
      ? ExtraerCuerpo<Config[Ruta][Metodo]> extends never
        ? []
        : [{ cuerpo: ExtraerCuerpo<Config[Ruta][Metodo]> }]
      : [
          {
            parametros: ExtraerParametros<Config[Ruta][Metodo]>;
            cuerpo?: ExtraerCuerpo<Config[Ruta][Metodo]>;
          },
        ]
  ): Promise<ExtraerRespuesta<Config[Ruta][Metodo]>> {
    // Implementación aquí
    return {} as any;
  }
}

const api = new ClienteAPI<ConfigEndpoints>();

// Llamadas a la API con tipos seguros
const usuarios = await api.request("/usuarios", "GET");
// Tipo: Usuario[]

const nuevoUsuario = await api.request("/usuarios", "POST", {
  cuerpo: { nombre: "Juan", email: "juan@ejemplo.com" },
});
// Tipo: Usuario

const usuario = await api.request("/usuarios/:id", "GET", {
  parametros: { id: "123" },
});
// Tipo: Usuario
```

### Patrón 3: Patrón Builder con Seguridad de Tipos

```typescript
type EstadoConstructor<T> = {
  [K in keyof T]: T[K] | undefined;
};

type ClavesRequeridas<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type ClavesOpcionales<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type EstaCompleto<T, S> =
  ClavesRequeridas<T> extends keyof S
    ? S[ClavesRequeridas<T>] extends undefined
      ? false
      : true
    : false;

class ConstructorUser<T, S extends EstadoConstructor<T> = {}> {
  private estado: S = {} as S;

  set<K extends keyof T>(
    clave: K,
    valor: T[K],
  ): ConstructorUser<T, S & Record<K, T[K]>> {
    this.estado[clave] = valor;
    return this as any;
  }

  build(this: EstaCompleto<T, S> extends true ? this : never): T {
    return this.estado as T;
  }
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  edad?: number;
}

const constructor = new ConstructorUser<Usuario>();

const usuario = constructor
  .set("id", "1")
  .set("nombre", "Juan")
  .set("email", "juan@ejemplo.com")
  .build(); // OK: todos los campos requeridos establecidos

// const incompleto = constructor
//   .set("id", "1")
//   .build();  // Error: faltan campos requeridos
```

### Patrón 4: SoloLectura/Parcial Profundo (Deep Readonly/Partial)

```typescript
type SoloLecturaProfundo<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : SoloLecturaProfundo<T[P]>
    : T[P];
};

type ParcialProfundo<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<ParcialProfundo<U>>
      : ParcialProfundo<T[P]>
    : T[P];
};

interface Config {
  servidor: {
    host: string;
    puerto: number;
    ssl: {
      habilitado: boolean;
      certificado: string;
    };
  };
  baseDeDatos: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

type ConfigSoloLectura = SoloLecturaProfundo<Config>;
// Todas las propiedades anidadas son de solo lectura

type ConfigParcial = ParcialProfundo<Config>;
// Todas las propiedades anidadas son opcionales
```

### Patrón 5: Validación de Formularios con Tipos Seguros

```typescript
type ReglaValidacion<T> = {
  validar: (valor: T) => boolean;
  mensaje: string;
};

type ValidacionCampo<T> = {
  [K in keyof T]?: ReglaValidacion<T[K]>[];
};

type ErroresValidacion<T> = {
  [K in keyof T]?: string[];
};

class ValidadorFormulario<T extends Record<string, any>> {
  constructor(private reglas: ValidacionCampo<T>) {}

  validar(datos: T): ErroresValidacion<T> | null {
    const errores: ErroresValidacion<T> = {};
    let hayErrores = false;

    for (const clave in this.reglas) {
      const reglasCampo = this.reglas[clave];
      const valor = datos[clave];

      if (reglasCampo) {
        const erroresCampo: string[] = [];

        for (const regla of reglasCampo) {
          if (!regla.validar(valor)) {
            erroresCampo.push(regla.mensaje);
          }
        }

        if (erroresCampo.length > 0) {
          errores[clave] = erroresCampo;
          hayErrores = true;
        }
      }
    }

    return hayErrores ? errores : null;
  }
}

interface FormularioLogin {
  email: string;
  password: string;
}

const validador = new ValidadorFormulario<FormularioLogin>({
  email: [
    {
      validar: (v) => v.includes("@"),
      mensaje: "El email debe contener @",
    },
    {
      validar: (v) => v.length > 0,
      mensaje: "El email es obligatorio",
    },
  ],
  password: [
    {
      validar: (v) => v.length >= 8,
      mensaje: "La contraseña debe tener al menos 8 caracteres",
    },
  ],
});

const errores = validador.validar({
  email: "invalido",
  password: "corta",
});
// Tipo: { email?: string[]; password?: string[]; } | null
```

### Patrón 6: Uniones Discriminadas (Discriminated Unions)

```typescript
type Exito<T> = {
  estado: "exito";
  datos: T;
};

type ErrorAsync = {
  estado: "error";
  error: string;
};

type Cargando = {
  estado: "cargando";
};

type EstadoAsync<T> = Exito<T> | ErrorAsync | Cargando;

function manejarEstado<T>(estado: EstadoAsync<T>): void {
  switch (estado.estado) {
    case "exito":
      console.log(estado.datos); // Tipo: T
      break;
    case "error":
      console.log(estado.error); // Tipo: string
      break;
    case "cargando":
      console.log("Cargando...");
      break;
  }
}

// Máquina de estados con tipos seguros
type EstadoUI =
  | { tipo: "ocioso" }
  | { tipo: "obteniendo"; requestId: string }
  | { tipo: "exito"; datos: any }
  | { tipo: "error"; error: Error };

type EventoUI =
  | { tipo: "OBTENER"; requestId: string }
  | { tipo: "EXITO"; datos: any }
  | { tipo: "ERROR"; error: Error }
  | { tipo: "REINICIAR" };

function reductor(estado: EstadoUI, evento: EventoUI): EstadoUI {
  switch (estado.tipo) {
    case "ocioso":
      return evento.tipo === "OBTENER"
        ? { tipo: "obteniendo", requestId: evento.requestId }
        : estado;
    case "obteniendo":
      if (evento.tipo === "EXITO") {
        return { tipo: "exito", datos: evento.datos };
      }
      if (evento.tipo === "ERROR") {
        return { tipo: "error", error: evento.error };
      }
      return estado;
    case "exito":
    case "error":
      return evento.tipo === "REINICIAR" ? { tipo: "ocioso" } : estado;
  }
}
```

## Técnicas de Inferencia de Tipos

### 1. Palabra clave Infer

```typescript
// Extraer el tipo de elemento de un array
type TipoElemento<T> = T extends (infer U)[] ? U : never;

type ArrayNumeros = number[];
type Numero = TipoElemento<ArrayNumeros>; // number

// Extraer el tipo de una promesa
type TipoPromesa<T> = T extends Promise<infer U> ? U : never;

type NumeroAsync = TipoPromesa<Promise<number>>; // number

// Extraer parámetros de una función
type ParametrosFunc<T> = T extends (...args: infer P) => any ? P : never;

function foo(a: string, b: number) {}
type ParametrosFoo = ParametrosFunc<typeof foo>; // [string, number]
```

### 2. Guardas de Tipo (Type Guards)

```typescript
function esCadena(valor: unknown): valor is string {
  return typeof valor === "string";
}

function esArrayDe<T>(
  valor: unknown,
  guarda: (item: unknown) => item is T,
): valor is T[] {
  return Array.isArray(valor) && valor.every(guarda);
}

const datos: unknown = ["a", "b", "c"];

if (esArrayDe(datos, esCadena)) {
  datos.forEach((s) => s.toUpperCase()); // Tipo: string[]
}
```

### 3. Funciones de Aserción (Assertion Functions)

```typescript
function asegurarEsCadena(valor: unknown): asserts valor is string {
  if (typeof valor !== "string") {
    throw new Error("No es una cadena");
  }
}

function procesarValor(valor: unknown) {
  asegurarEsCadena(valor);
  // valor ahora está tipado como string
  console.log(valor.toUpperCase());
}
```

## Mejores Prácticas

1. **Usa `unknown` en lugar de `any`**: Obliga a realizar la comprobación de tipos.
2. **Prefiere `interface` para formas de objetos**: Mejores mensajes de error.
3. **Usa `type` para uniones y tipos complejos**: Es más flexible.
4. **Aprovecha la inferencia de tipos**: Deja que TypeScript infiera cuando sea posible.
5. **Crea tipos auxiliares**: Construye utilidades de tipos reutilizables.
6. **Usa aserciones const**: Preserva los tipos literales.
7. **Evita las aserciones de tipo (`as`)**: Usa guardas de tipo en su lugar.
8. **Documenta tipos complejos**: Añade comentarios JSDoc.
9. **Usa el modo estricto**: Habilita todas las opciones de compilación estrictas.
10. **Prueba tus tipos**: Usa pruebas de tipos para verificar el comportamiento de los tipos.

## Pruebas de Tipos (Type Testing)

```typescript
// Pruebas de aserción de tipos
type AsercionIgualdad<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type Prueba1 = AsercionIgualdad<string, string>; // true
type Prueba2 = AsercionIgualdad<string, number>; // false
type Prueba3 = AsercionIgualdad<string | number, string>; // false

// Ayudante para esperar error
type EsperarError<T extends never> = T;

// Ejemplo de uso
type DeberiaDarError = EsperarError<AsercionIgualdad<string, number>>;
```

## Errores Comunes (Pitfalls)

1. **Abuso de `any`**: Anula el propósito de TypeScript.
2. **Ignorar las comprobaciones de nulos estrictas**: Puede llevar a errores en tiempo de ejecución.
3. **Tipos demasiado complejos**: Pueden ralentizar la compilación.
4. **No usar uniones discriminadas**: Se pierden oportunidades de reducción (narrowing) de tipos.
5. **Olvidar los modificadores readonly**: Permite mutaciones no deseadas.
6. **Referencias de tipo circulares**: Pueden causar errores del compilador.
7. **No manejar casos borde**: Como arrays vacíos o valores nulos.

## Consideraciones de Rendimiento

- Evita tipos condicionales profundamente anidados.
- Usa tipos simples cuando sea posible.
- Cachea cálculos de tipos complejos.
- Limita la profundidad de la recursividad en tipos recursivos.
- Usa herramientas de construcción para omitir la comprobación de tipos en producción.

## Recursos

- **Manual de TypeScript**: https://www.typescriptlang.org/docs/handbook/
- **Type Challenges**: https://github.com/type-challenges/type-challenges
- **TypeScript Deep Dive**: https://basarat.gitbook.io/typescript/
- **Effective TypeScript**: Libro de Dan Vanderkam
