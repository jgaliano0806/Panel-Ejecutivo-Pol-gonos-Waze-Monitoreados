# Documentación ISO 9001:2015 – Panel Ejecutivo Waze

Sistema de Gestión de la Calidad (SGC) del proyecto **Panel Ejecutivo Waze**, alineado con la norma **ISO 9001:2015**.

**Organización:** CASISA – Caminos de las Sierras  
**Área responsable:** GED (Gestión y Desarrollo)  
**Versión del paquete:** 1.5  
**Fecha de emisión:** Junio 2026

---

## Objetivo

Este paquete documenta los procesos del ciclo de vida del software — desarrollo, pruebas, despliegue, mantenimiento y mejora continua — conforme a los requisitos de ISO 9001:2015, cláusulas 4 a 10.

---

## Cadena documental

La operación en sala de control sigue esta secuencia:

```
PRO-OP-00X  →  IP-00X  →  RP-00X
 (proceso)     (instructivo)   (registro / evidencia)
```

| Nivel | Ubicación | Rol |
|-------|-----------|-----|
| Proceso | [MANUAL_PROCESOS.md](./MANUAL_PROCESOS.md) | Define qué se hace, quién lo hace y qué registros genera |
| Instructivo | [instructivos/](./instructivos/README.md) | Describe cómo ejecutar cada paso en el panel |
| Registro | [registros/](./registros/README.md) | Plantilla para documentar la evidencia auditable |

El paquete incluye **31 documentos** controlados en el PDF consolidado (`npm run docs:iso-pdf`).

---

## Índice de documentos

| Código | Documento | Cláusula ISO | Archivo |
|--------|-----------|--------------|---------|
| SGC-PWY-001 | Manual del SGC del Proyecto | 4–10 | [MANUAL_SGC_ISO9001.md](./MANUAL_SGC_ISO9001.md) |
| SGC-PWY-MU-001 | Manual de Usuario | 7.2, 7.3, 8.5 | [MANUAL_USUARIO.md](./MANUAL_USUARIO.md) |
| SGC-PWY-MP-001 | Manual de Procesos Operativos | 8.1, 8.5 | [MANUAL_PROCESOS.md](./MANUAL_PROCESOS.md) |
| SGC-PWY-IP-001…010 | Instructivos de Procesos Operativos | 8.5.1 | [instructivos/](./instructivos/README.md) |
| SGC-PWY-RP-001…010 | Registros de Procesos Operativos | 7.5.2, 8.5.1 | [registros/](./registros/README.md) |
| SGC-PWY-PROC-001 | Control de documentos y registros | 7.5 | [PROC-001_Control_Documentos.md](./PROC-001_Control_Documentos.md) |
| SGC-PWY-PROC-002 | Desarrollo de software | 8.3 | [PROC-002_Desarrollo_Software.md](./PROC-002_Desarrollo_Software.md) |
| SGC-PWY-PROC-003 | Gestión de cambios | 8.5.6 | [PROC-003_Gestion_Cambios.md](./PROC-003_Gestion_Cambios.md) |
| SGC-PWY-PROC-004 | Pruebas y verificación | 8.3.4, 8.6 | [PROC-004_Pruebas_Verificacion.md](./PROC-004_Pruebas_Verificacion.md) |
| SGC-PWY-PROC-005 | Despliegue y mantenimiento | 8.5.1, 8.5.5 | [PROC-005_Despliegue_Mantenimiento.md](./PROC-005_Despliegue_Mantenimiento.md) |
| SGC-PWY-PROC-006 | No conformidades y mejora continua | 10.2, 10.3 | [PROC-006_No_Conformidades_Mejora.md](./PROC-006_No_Conformidades_Mejora.md) |
| SGC-PWY-REG-001 | Registro maestro de documentación | 7.5.3 | [REG-001_Registro_Documentos.md](./REG-001_Registro_Documentos.md) |
| SGC-PWY-REG-002 | Registro de riesgos y oportunidades | 6.1 | [REG-002_Registro_Riesgos.md](./REG-002_Registro_Riesgos.md) |

---

## Documentación técnica vinculada

| Documento | Ubicación | Relación con el SGC |
|-----------|-----------|---------------------|
| Arquitectura del sistema | [../ARCHITECTURE.md](../ARCHITECTURE.md) | Entrada de diseño (8.3.3) |
| API REST y WebSocket | [../API.md](../API.md) | Especificación de interfaces (8.3.4) |
| Requisitos del sistema | [../REQUISITOS_SISTEMA.md](../REQUISITOS_SISTEMA.md) | Requisitos de producto (8.3.3) |
| Instructivo de despliegue | [../INSTRUCTIVO_DESPLIEGUE.md](../INSTRUCTIVO_DESPLIEGUE.md) | Procedimiento operativo (8.5.1) |
| Despliegue Windows (nginx/NSSM) | [../../deploy/INSTRUCCIONES-DESPLIEGUE.md](../../deploy/INSTRUCCIONES-DESPLIEGUE.md) | Referencia operativa producción |
| Guía de contribución | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Flujo de desarrollo (8.3) |
| Auditorías de código | `apps/*/docs/CODE_AUDIT_REPORT.md` | Evidencia de evaluación (9.1) |

---

## Generación de PDF

```powershell
# PDF consolidado del SGC (incluye manual usuario y procesos)
npm run docs:iso-pdf

# PDFs individuales
npm run docs:iso-pdf-usuario    # Solo Manual de Usuario
npm run docs:iso-pdf-procesos   # Solo Manual de Procesos
npm run docs:iso-pdf-instructivos  # Solo Instructivos IP-001 a IP-010
npm run docs:iso-pdf-registros     # Solo Registros RP-001 a RP-010

# Todos los PDFs del proyecto
npm run docs:all-pdf

# Publicar PDFs en carpeta G.E.D (Z:\G.E.D\Panel Waze\iso9001)
npm run docs:iso-publish
```

**Salidas:**

| Archivo | Contenido |
|---------|-----------|
| `MANUAL_SGC_ISO9001.pdf` | Paquete completo ISO 9001 (31 documentos) |
| `MANUAL_USUARIO.pdf` | Manual de Usuario (operadores, supervisores) |
| `MANUAL_PROCESOS.pdf` | Manual de Procesos Operativos (10 procesos) |
| `INSTRUCTIVOS_PROCESOS.pdf` | Instructivos IP-001 a IP-010 (paso a paso) |
| `REGISTROS_PROCESOS.pdf` | Registros RP-001 a RP-010 (plantillas de evidencia) |
| `MANUAL_DESPLIEGUE_SERVIDOR.pdf` | Manual de despliegue técnico (`npm run docs:pdf`) |

**Copia publicada (GED):** `Z:\G.E.D\Panel Waze\iso9001\` — ver `npm run docs:iso-publish`.

El inventario completo está en [REG-001_Registro_Documentos.md](./REG-001_Registro_Documentos.md).

---

## Control de versiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-06-08 | GED – CASISA | Emisión inicial del paquete SGC ISO 9001:2015 |
| 1.1 | 2026-06-08 | GED – CASISA | Alineación con mejoras: nginx, CI/CD, RAC, zonas peligrosas, auth JWT |
| 1.2 | 2026-06-08 | GED – CASISA | Manual de Usuario (MU-001) y Manual de Procesos (MP-001) |
| 1.3 | 2026-06-08 | GED – CASISA | Instructivos de Procesos IP-001 a IP-010 |
| 1.4 | 2026-06-08 | GED – CASISA | Registros de Procesos RP-001 a RP-010 |
| 1.5 | 2026-06-08 | GED – CASISA | Revisión final: redacción, generador PDF, publicación G.E.D, índices y cadena documental |

---

## Aprobaciones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Responsable del Proyecto | _Pendiente_ | | |
| Responsable de Calidad | _Pendiente_ | | |
| Aprobación Gerencia | _Pendiente_ | | |
