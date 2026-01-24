---
name: responsive-design
description: Implementa diseños responsivos modernos utilizando consultas de contenedor (container queries), tipografía fluida, CSS Grid y estrategias de puntos de interrupción mobile-first. Úsalo al construir interfaces adaptativas, implementar diseños fluidos o crear comportamientos responsivos a nivel de componente.
---

# Diseño Responsivo

Domina las técnicas modernas de diseño responsivo para crear interfaces que se adapten a la perfección en todos los tamaños de pantalla y contextos de dispositivos.

## Cuándo usar esta habilidad

- Implementar diseños responsivos mobile-first (primero móvil)
- Usar consultas de contenedor (container queries) para una responsividad basada en componentes
- Crear tipografía fluida y escalas de espaciado
- Construir diseños complejos con CSS Grid y Flexbox
- Diseñar estrategias de puntos de interrupción (breakpoints) para sistemas de diseño
- Implementar imágenes y medios responsivos
- Crear patrones de navegación adaptativos
- Construir tablas responsivas y visualizaciones de datos

## Capacidades Principales

### 1. Consultas de Contenedor (Container Queries)

- Responsividad a nivel de componente independiente del viewport (ventana gráfica)
- Unidades de consulta de contenedor (cqi, cqw, cqh)
- Consultas de estilo para estilizado condicional
- Alternativas (fallbacks) para soporte de navegadores

### 2. Tipografía y Espaciado Fluido

- CSS clamp() para escalado fluido
- Unidades relativas al viewport (vw, vh, dvh)
- Escalas de tipo fluidas con límites mínimos/máximos
- Sistemas de espaciado responsivos

### 3. Patrones de Diseño (Layout Patterns)

- CSS Grid para diseños en 2D
- Flexbox para distribución en 1D
- Diseños intrínsecos (dimensionamiento basado en el contenido)
- Subgrid para alineación de cuadrículas anidadas

### 4. Estrategia de Puntos de Interrupción (Breakpoints)

- Consultas de medios (media queries) mobile-first
- Puntos de interrupción basados en el contenido
- Integración de tokens de diseño
- Consultas de características (@supports)

## Referencia Rápida

### Escala de Puntos de Interrupción Moderna

```css
/* Puntos de interrupción mobile-first */
/* Base: Móvil (< 640px) */
@media (min-width: 640px) {
  /* sm: Teléfonos en horizontal, tablets pequeñas */
}
@media (min-width: 768px) {
  /* md: Tablets */
}
@media (min-width: 1024px) {
  /* lg: Laptops, computadoras de escritorio pequeñas */
}
@media (min-width: 1280px) {
  /* xl: Computadoras de escritorio */
}
@media (min-width: 1536px) {
  /* 2xl: Computadoras de escritorio grandes */
}

/* Equivalente en Tailwind CSS */
/* sm:  @media (min-width: 640px) */
/* md:  @media (min-width: 768px) */
/* lg:  @media (min-width: 1024px) */
/* xl:  @media (min-width: 1280px) */
/* 2xl: @media (min-width: 1536px) */
```

## Patrones Clave

### Patrón 1: Consultas de Contenedor

```css
/* Definir un contexto de contención */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Consultar el contenedor, no el viewport */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1rem;
  }

  .card-image {
    aspect-ratio: 1;
  }
}

@container card (min-width: 600px) {
  .card {
    grid-template-columns: 250px 1fr;
  }

  .card-title {
    font-size: 1.5rem;
  }
}

/* Unidades de consulta de contenedor */
.card-title {
  /* 5% del ancho del contenedor, limitado entre 1rem y 2rem */
  font-size: clamp(1rem, 5cqi, 2rem);
}
```

```tsx
// Componente React con consultas de contenedor
function ResponsiveCard({ title, image, description }) {
  return (
    <div className="@container">
      <article className="flex flex-col @md:flex-row @md:gap-4">
        <img
          src={image}
          alt=""
          className="w-full @md:w-48 @lg:w-64 aspect-video @md:aspect-square object-cover"
        />
        <div className="p-4 @md:p-0">
          <h2 className="text-lg @md:text-xl @lg:text-2xl font-semibold">
            {title}
          </h2>
          <p className="mt-2 text-muted-foreground @md:line-clamp-3">
            {description}
          </p>
        </div>
      </article>
    </div>
  );
}
```

### Patrón 2: Tipografía Fluida

```css
/* Escala de tipo fluida usando clamp() */
:root {
  /* Tamaño mín, preferido (fluido), tamaño máx */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
  --text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem);
}

/* Uso */
h1 {
  font-size: var(--text-4xl);
}
h2 {
  font-size: var(--text-3xl);
}
h3 {
  font-size: var(--text-2xl);
}
p {
  font-size: var(--text-base);
}

/* Escala de espaciado fluido */
:root {
  --space-xs: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
  --space-sm: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-md: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-lg: clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem);
  --space-xl: clamp(2rem, 1.5rem + 2.5vw, 4rem);
}
```

```tsx
// Función de utilidad para valores fluidos
function fluidValue(
  minSize: number,
  maxSize: number,
  minWidth = 320,
  maxWidth = 1280,
) {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;

  return `clamp(${minSize}rem, ${yAxisIntersection.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${maxSize}rem)`;
}

// Generar escala de tipo fluida
const fluidTypeScale = {
  sm: fluidValue(0.875, 1),
  base: fluidValue(1, 1.125),
  lg: fluidValue(1.25, 1.5),
  xl: fluidValue(1.5, 2),
  "2xl": fluidValue(2, 3),
};
```

### Patrón 3: Diseño Responsivo con CSS Grid

```css
/* Cuadrícula auto-ajustable - los elementos se envuelven automáticamente */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}

/* Cuadrícula con auto-relleno - mantiene columnas vacías */
.grid-auto-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

/* Cuadrícula responsiva con áreas con nombre */
.page-layout {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "sidebar"
    "footer";
  gap: 1rem;
}

@media (min-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr 300px;
    grid-template-areas:
      "header header"
      "main sidebar"
      "footer footer";
  }
}

@media (min-width: 1024px) {
  .page-layout {
    grid-template-columns: 250px 1fr 300px;
    grid-template-areas:
      "header header header"
      "nav main sidebar"
      "footer footer footer";
  }
}

.header {
  grid-area: header;
}
.main {
  grid-area: main;
}
.sidebar {
  grid-area: sidebar;
}
.footer {
  grid-area: footer;
}
```

```tsx
// Componente de cuadrícula responsiva
function ResponsiveGrid({ children, minItemWidth = "250px", gap = "1.5rem" }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

// Uso con Tailwind
function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Patrón 4: Navegación Responsiva

```tsx
function ResponsiveNav({ items }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="relative">
      {/* Botón de menú móvil */}
      <button
        className="lg:hidden p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="nav-menu"
      >
        <span className="sr-only">Alternar navegación</span>
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Enlaces de navegación */}
      <ul
        id="nav-menu"
        className={cn(
          // Base: oculto en móvil
          "absolute top-full left-0 right-0 bg-background border-b",
          "flex flex-col",
          // Móvil: deslizar hacia abajo
          isOpen ? "flex" : "hidden",
          // Escritorio: siempre visible, horizontal
          "lg:static lg:flex lg:flex-row lg:border-0 lg:bg-transparent",
        )}
      >
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={cn(
                "block px-4 py-3",
                "lg:px-3 lg:py-2",
                "hover:bg-muted lg:hover:bg-transparent lg:hover:text-primary",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Patrón 5: Imágenes Responsivas

```tsx
// Imagen responsiva con dirección de arte
function ResponsiveHero() {
  return (
    <picture>
      {/* Dirección de arte: diferentes recortes para diferentes pantallas */}
      <source
        media="(min-width: 1024px)"
        srcSet="/hero-wide.webp"
        type="image/webp"
      />
      <source
        media="(min-width: 768px)"
        srcSet="/hero-medium.webp"
        type="image/webp"
      />
      <source srcSet="/hero-mobile.webp" type="image/webp" />

      {/* Alternativa */}
      <img
        src="/hero-mobile.jpg"
        alt="Descripción de la imagen hero"
        className="w-full h-auto"
        loading="eager"
        fetchpriority="high"
      />
    </picture>
  );
}

// Imagen responsiva con srcset para cambio de resolución
function ProductImage({ product }) {
  return (
    <img
      src={product.image}
      srcSet={`
        ${product.image}?w=400 400w,
        ${product.image}?w=800 800w,
        ${product.image}?w=1200 1200w
      `}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      alt={product.name}
      className="w-full h-auto object-cover"
      loading="lazy"
    />
  );
}
```

### Patrón 6: Tablas Responsivas

```tsx
// Tabla responsiva con desplazamiento horizontal
function ResponsiveTable({ data, columns }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left p-3">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((col) => (
                <td key={col.key} className="p-3">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tabla basada en tarjetas para móvil
function ResponsiveDataTable({ data, columns }) {
  return (
    <>
      {/* Tabla de escritorio */}
      <table className="hidden md:table w-full">
        {/* ... tabla estándar */}
      </table>

      {/* Tarjetas móviles */}
      <div className="md:hidden space-y-4">
        {data.map((row, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between">
                <span className="font-medium text-muted-foreground">
                  {col.label}
                </span>
                <span>{row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

## Unidades del Viewport

```css
/* Unidades de viewport estándar */
.full-height {
  height: 100vh; /* Puede causar problemas en móviles */
}

/* Unidades de viewport dinámicas (recomendadas para móviles) */
.full-height-dynamic {
  height: 100dvh; /* Considera la interfaz del navegador móvil */
}

/* Viewport pequeño (mínimo) */
.min-full-height {
  min-height: 100svh;
}

/* Viewport grande (máximo) */
.max-full-height {
  max-height: 100lvh;
}

/* Dimensionamiento de fuente relativo al viewport */
.hero-title {
  /* 5vw con límites mín/máx */
  font-size: clamp(2rem, 5vw, 4rem);
}
```

## Mejores Prácticas

1. **Mobile-First**: Comienza con estilos para móviles, mejora para pantallas más grandes
2. **Breakpoints de Contenido**: Establece puntos de interrupción basados en el contenido, no en dispositivos
3. **Fluido sobre Fijo**: Usa valores fluidos para la tipografía y el espaciado
4. **Container Queries**: Úsalas para responsividad a nivel de componente
5. **Prueba en Dispositivos Reales**: Los simuladores no capturan todos los problemas
6. **Rendimiento**: Optimiza las imágenes, carga diferida (lazy load) del contenido fuera de pantalla
7. **Objetivos Táctiles**: Mantén un mínimo de 44x44px en móviles
8. **Propiedades Lógicas**: Usa inline/block para la internacionalización

## Problemas Comunes

- **Desbordamiento Horizontal**: El contenido se sale del viewport
- **Anchos Fijos**: Usar px en lugar de unidades relativas
- **Altura del Viewport**: Problemas de 100vh en navegadores móviles
- **Tamaño de Fuente**: Texto demasiado pequeño en móviles
- **Objetivos Táctiles**: Botones demasiado pequeños para tocar con precisión
- **Aspect Ratio**: Imágenes que se aplastan o se estiran
- **Apilamiento de Z-Index**: Superposiciones que se rompen en diferentes pantallas

## Recursos

- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
- [Calculadora de Tipografía Fluida Utopia](https://utopia.fyi/type/calculator/)
- [Every Layout](https://every-layout.dev/)
- [Guía de Imágenes Responsivas](https://web.dev/responsive-images/)
- [CSS Grid Garden](https://cssgridgarden.com/)
