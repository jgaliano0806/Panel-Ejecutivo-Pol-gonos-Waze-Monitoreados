---
name: monorepo-management
description: Domina la gestión de monorepos con Turborepo, Nx y workspaces de pnpm para construir repositorios multi-paquete eficientes y escalables con compilaciones optimizadas y gestión de dependencias. Úsalo al configurar monorepos, optimizar compilaciones o gestionar dependencias compartidas.
---

# Gestión de Monorepos

Construye monorepos eficientes y escalables que permitan compartir código, herramientas consistentes y cambios atómicos en múltiples paquetes y aplicaciones.

## Cuándo usar este Skill

- Configuración de nuevos proyectos de monorepo.
- Migración de multi-repo a monorepo.
- Optimización del rendimiento de compilación (build) y pruebas.
- Gestión de dependencias compartidas.
- Implementación de estrategias para compartir código.
- Configuración de CI/CD para monorepos.
- Versionado y publicación de paquetes.
- Depuración de problemas específicos de monorepos.

## Conceptos Principales

### 1. ¿Por qué Monorepos?

**Ventajas:**

- Código y dependencias compartidas.
- Commits atómicos en todos los proyectos.
- Herramientas y estándares consistentes.
- Refactorización más sencilla.
- Gestión de dependencias simplificada.
- Mejor visibilidad del código.

**Desafíos:**

- Rendimiento de la compilación a escala.
- Complejidad de CI/CD.
- Control de acceso.
- Repositorio Git de gran tamaño.

### 2. Herramientas de Monorepo

**Gestores de Paquetes:**

- workspaces de pnpm (recomendado)
- workspaces de npm
- workspaces de Yarn

**Sistemas de Compilación (Build Systems):**

- Turborepo (recomendado para la mayoría)
- Nx (rico en características, complejo)
- Lerna (antiguo, en modo mantenimiento)

## Configuración de Turborepo

### Configuración Inicial

```bash
# Crear nuevo monorepo
npx create-turbo@latest my-monorepo
cd my-monorepo

# Estructura:
# apps/
#   web/          - Aplicación Next.js
#   docs/         - Sitio de documentación
# packages/
#   ui/           - Componentes de UI compartidos
#   config/       - Configuraciones compartidas
#   tsconfig/     - Configs de TypeScript compartidas
# turbo.json      - Configuración de Turborepo
# package.json    - package.json de la raíz
```

### Configuración

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

```json
// package.json (raíz)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

### Estructura de Paquetes

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/button.js",
      "types": "./dist/button.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "tsup": "^7.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "react": "^18.2.0"
  }
}
```

## workspaces de pnpm

### Configuración

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tools/*"
```

```json
// .npmrc
# Elevar dependencias compartidas
shamefully-hoist=true

# Dependencias de pares estrictas
auto-install-peers=true
strict-peer-dependencies=true

# Rendimiento
store-dir=~/.pnpm-store
```

### Gestión de Dependencias

```bash
# Instalar dependencia en un paquete específico
pnpm add react --filter @repo/ui
pnpm add -D typescript --filter @repo/ui

# Instalar dependencia del workspace
pnpm add @repo/ui --filter web

# Instalar en todos los paquetes
pnpm add -D eslint -w

# Actualizar todas las dependencias
pnpm update -r

# Eliminar dependencia
pnpm remove react --filter @repo/ui
```

### Scripts

```bash
# Ejecutar script en un paquete específico
pnpm --filter web dev
pnpm --filter @repo/ui build

# Ejecutar en todos los paquetes
pnpm -r build
pnpm -r test

# Ejecutar en paralelo
pnpm -r --parallel dev

# Filtrar por patrón
pnpm --filter "@repo/*" build
pnpm --filter "...web" build  # Construir web y sus dependencias
```

## Monorepo Nx

### Configuración

```bash
# Crear monorepo Nx
npx create-nx-workspace@latest my-org

# Generar aplicaciones
nx generate @nx/react:app my-app
nx generate @nx/next:app my-next-app

# Generar librerías
nx generate @nx/react:lib ui-components
nx generate @nx/js:lib utils
```

### Configuración

```json
// nx.json
{
  "extends": "nx/presets/npm.json",
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json"
    ],
    "sharedGlobals": []
  }
}
```

### Ejecución de Tareas

```bash
# Ejecutar tarea para un proyecto específico
nx build my-app
nx test ui-components
nx lint utils

# Ejecutar para proyectos afectados
nx affected:build
nx affected:test --base=main

# Visualizar dependencias
nx graph

# Ejecutar en paralelo
nx run-many --target=build --all --parallel=3
```

## Configuraciones Compartidas

### Configuración de TypeScript

```json
// packages/tsconfig/base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true
  },
  "exclude": ["node_modules"]
}

// packages/tsconfig/react.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}

// apps/web/tsconfig.json
{
  "extends": "@repo/tsconfig/react.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Configuración de ESLint

```javascript
// packages/config/eslint-preset.js
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "react/react-in-jsx-scope": "off",
  },
};

// apps/web/.eslintrc.js
module.exports = {
  extends: ["@repo/config/eslint-preset"],
  rules: {
    // Reglas específicas de la aplicación
  },
};
```

## Patrones para Compartir Código

### Patrón 1: Componentes de UI Compartidos

```typescript
// packages/ui/src/button.tsx
import * as React from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// packages/ui/src/index.ts
export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';

// apps/web/src/app.tsx
import { Button } from '@repo/ui';

export function App() {
  return <Button variant="primary">Click me</Button>;
}
```

### Patrón 2: Utilidades Compartidas

```typescript
// packages/utils/src/string.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

// packages/utils/src/index.ts
export * from "./string";
export * from "./array";
export * from "./date";

// Uso en aplicaciones
import { capitalize, truncate } from "@repo/utils";
```

### Patrón 3: Tipos Compartidos

```typescript
// packages/types/src/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

// Utilizado tanto en frontend como en backend
import type { User, CreateUserInput } from "@repo/types";
```

## Optimización de la Compilación (Build)

### Caché de Turborepo

```json
// turbo.json
{
  "pipeline": {
    "build": {
      // La compilación depende de que las dependencias se compilen primero
      "dependsOn": ["^build"],

      // Cachear estas salidas
      "outputs": ["dist/**", ".next/**"],

      // Cachear basado en estas entradas (por defecto: todos los archivos)
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "package.json"]
    },
    "test": {
      // Ejecutar pruebas en paralelo, no depende de la compilación
      "cache": true,
      "outputs": ["coverage/**"]
    }
  }
}
```

### Caché Remoto

```bash
# Caché Remoto de Turborepo (Vercel)
npx turbo login
npx turbo link

# Caché remoto personalizado
# turbo.json
{
  "remoteCache": {
    "signature": true,
    "enabled": true
  }
}
```

## CI/CD para Monorepos

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Para comandos affected de Nx

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build

      - name: Test
        run: pnpm turbo run test

      - name: Lint
        run: pnpm turbo run lint

      - name: Type check
        run: pnpm turbo run type-check
```

### Desplegar solo lo afectado (Affected)

```yaml
# Desplegar solo las aplicaciones que han cambiado
- name: Deploy affected apps
  run: |
    if pnpm nx affected:apps --base=origin/main --head=HEAD | grep -q "web"; then
      echo "Desplegando aplicación web"
      pnpm --filter web deploy
    fi
```

## Mejores Prácticas

1.  **Versionado Consistente**: Bloquea las versiones de las dependencias en todo el workspace.
2.  **Configs Compartidas**: Centraliza las configuraciones de ESLint, TypeScript y Prettier.
3.  **Grafo de Dependencias**: Mantenlo acíclico, evita las dependencias circulares.
4.  **Cacheo Efectivo**: Configura correctamente las entradas (`inputs`) y salidas (`outputs`).
5.  **Seguridad de Tipos**: Comparte tipos entre frontend y backend.
6.  **Estrategia de Pruebas**: Pruebas unitarias en paquetes, E2E en aplicaciones.
7.  **Documentación**: Incluye un README en cada paquete.
8.  **Estrategia de Lanzamiento**: Usa `changesets` para el versionado.

## Errores Comunes (Pitfalls)

- **Dependencias Circulares**: A depende de B, B depende de A.
- **Dependencias Fantasma**: Usar dependencias que no están en el `package.json`.
- **Entradas de Caché Incorrectas**: Archivos faltantes en los `inputs` de Turborepo.
- **Exceso de Compartido**: Compartir código que debería estar separado.
- **Falta de Compartido**: Duplicar código entre paquetes.
- **Monorepos Grandes**: Sin las herramientas adecuadas, las compilaciones se ralentizan.

## Publicación de Paquetes

```bash
# Usando Changesets
pnpm add -Dw @changesets/cli
pnpm changeset init

# Crear un changeset
pnpm changeset

# Versionar paquetes
pnpm changeset version

# Publicar
pnpm changeset publish
```

```yaml
# .github/workflows/release.yml
- name: Create Release Pull Request or Publish
  uses: changesets/action@v1
  with:
    publish: pnpm release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Recursos

- **references/turborepo-guide.md**: Documentación completa de Turborepo.
- **references/nx-guide.md**: Patrones de monorepo con Nx.
- **references/pnpm-workspaces.md**: Características de los workspaces de pnpm.
- **assets/monorepo-checklist.md**: Lista de verificación para la configuración.
- **assets/migration-guide.md**: Guía de migración de multi-repo a monorepo.
- **scripts/dependency-graph.ts**: Visualizar las dependencias entre paquetes.
