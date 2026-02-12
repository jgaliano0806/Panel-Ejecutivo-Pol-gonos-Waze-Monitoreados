# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al Panel Ejecutivo Waze! Este documento detalla los estándares y procesos para colaborar en el desarrollo.

## 🏗️ Estructura del Monorepo

Este proyecto utiliza una estructura de monorepo gestionada por NPM Workspaces.

- `apps/frontend`: Aplicación web React/Vite.
- `apps/backend`: API server Fastify/Node.
- `packages/*`: Librerías compartidas (types, config, database, shared).

## 🌿 Estrategia de Ramas

| Rama | Propósito | Base |
|--------|-----------|------|
| `main` | Producción estable | — |
| `preprod` | Pre-producción / staging | `main` |
| `feature/*` | Nuevas funcionalidades | `preprod` |
| `fix/*` | Correcciones de bugs | `preprod` |
| `hotfix/*` | Correcciones urgentes en producción | `main` |

**Flujo típico**:

```
main ─────────────────────────────────────►
  └── preprod ────────────────────────────►
        ├── feature/nueva-funcionalidad ──►  (merge a preprod)
        └── fix/correccion-bug ───────────►  (merge a preprod)
```

1. Las features y fixes se crean desde `preprod`.
2. Al completarse, se hace merge a `preprod` para pruebas de integración.
3. Cuando `preprod` está validado, se hace merge a `main` para producción.

## 💻 Flujo de Desarrollo

1.  **Fork & Clone**: Haz un fork del repositorio y clónalo localmente.
2.  **Rama**: Crea una rama desde `preprod` para tu feature o fix.
    ```bash
    git checkout preprod
    git pull origin preprod
    git checkout -b feature/mi-nueva-feature
    # o
    git checkout -b fix/mi-bug-fix
    ```
3.  **Instalación**: Instala las dependencias.
    ```bash
    npm install
    ```
4.  **Codificación**: Implementa tus cambios. Asegúrate de modificar los archivos en los `packages` compartidos si el código se usa en ambos lados (front y back).
5.  **Testing**: Corre los tests si aplica.
    ```bash
    npm test
    ```
6.  **Linting**: Asegúrate de que tu código cumpla con los estándares.
    ```bash
    npm run lint
    ```

## 📝 Convenciones de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/).

Estructura: `<tipo>[contexto opcional]: <descripción>`

Tipos comunes:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Estilos, formateo (sin cambios de lógica)
- `refactor`: Refactorización de código
- `test`: Añadir o corregir tests
- `chore`: Tareas de mantenimiento, dependencias, build

Ejemplos:
- `feat(frontend): añadir panel de filtros de tráfico`
- `fix(backend): corregir validación en endpoint de incidentes`
- `docs: actualizar instrucciones de instalación`

## 📦 Gestión de Paquetes

Si necesitas instalar una dependencia:

- Para el **Frontend**:
  ```bash
  npm install libra-ejemplo --workspace=apps/frontend
  ```
- Para el **Backend**:
  ```bash
  npm install libra-ejemplo --workspace=apps/backend
  ```
- Para la raíz (globales/dev):
  ```bash
  npm install -D herramienta-dev
  ```

## 🚀 Pull Requests

1.  Haz push de tu rama (`git push origin feature/mi-feature`).
2.  Abre un Pull Request desde GitHub.
3.  Describe tus cambios claramente.
4.  Vincula tickets relacionados si existen.

## 📄 Estándares de Código

- **TypeScript**: Todo el código nuevo debe estar tipado. Evita `any` siempre que sea posible.
- **Componentes**: Usa componentes funcionales y hooks en React.
- **Estilos**: Tailwind CSS es la preferencia para el frontend.
