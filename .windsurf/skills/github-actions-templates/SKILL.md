---
name: github-actions-templates
description: Crea flujos de trabajo (workflows) de GitHub Actions listos para producción para la automatización de pruebas, construcción y despliegue de aplicaciones. Úsalo al configurar CI/CD con GitHub Actions, automatizar flujos de trabajo de desarrollo o crear plantillas de flujos de trabajo reutilizables.
---

# Plantillas de GitHub Actions

Patrones de flujos de trabajo de GitHub Actions listos para producción para probar, construir y desplegar aplicaciones.

## Propósito

Crear flujos de trabajo de GitHub Actions eficientes y seguros para la integración y el despliegue continuos en diversos stacks tecnológicos.

## Cuándo usar

- Automatizar pruebas y despliegues.
- Construir imágenes de Docker y subirlas a registros.
- Desplegar en clústeres de Kubernetes.
- Ejecutar escaneos de seguridad.
- Implementar construcciones matriciales (matrix builds) para múltiples entornos.

## Patrones Comunes de Flujos de Trabajo

### Patrón 1: Flujo de Trabajo de Pruebas (Test Workflow)

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**Referencia:** Ver `assets/test-workflow.yml`

### Patrón 2: Construir y Subir Imagen Docker

```yaml
name: Build and Push

on:
  push:
    branches: [main]
    tags: ["v*"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Referencia:** Ver `assets/deploy-workflow.yml`

### Patrón 3: Desplegar en Kubernetes

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name production-cluster --region us-west-2

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/my-app -n production
          kubectl get services -n production

      - name: Verify deployment
        run: |
          kubectl get pods -n production
          kubectl describe deployment my-app -n production
```

### Patrón 4: Construcción Matricial (Matrix Build)

```yaml
name: Matrix Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        python-version: ["3.9", "3.10", "3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run tests
        run: pytest
```

**Referencia:** Ver `assets/matrix-build.yml`

## Mejores Prácticas para Flujos de Trabajo

1. **Usa versiones específicas de acciones** (@v4, no @latest).
2. **Cachea las dependencias** para acelerar las construcciones.
3. **Usa secretos** (secrets) para datos sensibles.
4. **Implementa comprobaciones de estado** (status checks) en los PRs.
5. **Usa construcciones matriciales** para pruebas multi-versión.
6. **Establece permisos apropiados**.
7. **Usa flujos de trabajo reutilizables** para patrones comunes.
8. **Implementa puertas de aprobación** (approval gates) para producción.
9. **Añade pasos de notificación** para fallos.
10. **Usa ejecutores propios (self-hosted runners)** para cargas de trabajo sensibles.

## Flujos de Trabajo Reutilizables

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test
```

**Uso de un flujo de trabajo reutilizable:**

```yaml
jobs:
  call-test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "20.x"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Escaneo de Seguridad

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Despliegue con Aprobaciones

```yaml
name: Deploy to Production

on:
  push:
    tags: ["v*"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy application
        run: |
          echo "Deploying to production..."
          # Comandos de despliegue aquí

      - name: Notify Slack
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployment to production completed successfully!"
            }
```

## Archivos de Referencia

- `assets/test-workflow.yml` - Plantilla de flujo de trabajo de pruebas.
- `assets/deploy-workflow.yml` - Plantilla de flujo de trabajo de despliegue.
- `assets/matrix-build.yml` - Plantilla de construcción matricial.
- `references/common-workflows.md` - Patrones comunes de flujos de trabajo.

## Skills Relacionados

- `gitlab-ci-patterns` - Para flujos de trabajo de GitLab CI.
- `deployment-pipeline-design` - Para diseño de arquitectura de tuberías.
- `secrets-management` - Para gestión de secretos.
