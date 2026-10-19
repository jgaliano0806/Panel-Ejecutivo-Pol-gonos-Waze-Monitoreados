# Instructivo IP-008: Gestión de usuarios y accesos

**Código:** SGC-PWY-IP-008  
**Proceso:** PRO-OP-008  
**Versión:** 1.0 | **Fecha:** Junio 2026  
**Responsable:** Administrador

---

## 1. Objetivo

Gestionar el ciclo de vida de usuarios: alta, modificación, baja y control de accesos RBAC.

## 2. Precondiciones

- [ ] Solicitud formal de alta/baja (email o ticket)
- [ ] Rol Administrador

## 3. Instructivo — Alta de usuario

### Paso 1 — Recibir solicitud

1. Verificar solicitud con nombre, email, rol solicitado y área
2. Validar con supervisor que el rol es el mínimo necesario

### Paso 2 — Crear usuario

1. `/admin` → **Usuarios y Perfiles**
2. Presionar **Nuevo usuario**
3. Completar:

| Campo | Valor |
|-------|-------|
| Email | Correo corporativo del solicitante |
| Nombre | Nombre completo |
| Rol | Según función (ver tabla abajo) |
| Estado | Activo |

### Paso 3 — Asignar rol

| Función solicitada | Rol asignar |
|--------------------|-------------|
| Sala de control operativa | Operador |
| Supervisión | Supervisor |
| Solo consulta | Visualizador |
| Gestión del sistema | Administrador |

### Paso 4 — Verificar permisos

1. Revisar vista preview de permisos del rol
2. Confirmar que tiene acceso a módulos requeridos
3. Confirmar que **no** tiene permisos excesivos

### Paso 5 — Entregar credenciales

1. Generar contraseña temporal segura (mín. 12 caracteres)
2. Entregar por **canal seguro** (presencial, teléfono, no email sin cifrar)
3. Indicar al usuario que debe cambiar contraseña en `/perfil`

## 4. Instructivo — Modificación de usuario

### Paso 1 — Localizar usuario

1. `/admin` → Usuarios → buscar por email o nombre

### Paso 2 — Modificar

1. Cambiar rol si cambió función
2. Ajustar permisos individuales solo si es excepción justificada
3. Guardar

### Paso 3 — Notificar al usuario

1. Informar cambios de acceso al usuario afectado

## 5. Instructivo — Baja de usuario

### Paso 1 — Recibir solicitud de baja

1. Verificar con RRHH o supervisor

### Paso 2 — Desactivar

1. Cambiar estado a **Inactivo**
2. Presionar **Revocar todas las sesiones**
3. Verificar que el usuario no puede iniciar sesión

### Paso 3 — Registrar

1. Anotar fecha de baja y motivo en registro administrativo

## 6. Instructivo — Cambio de contraseña (usuario)

El usuario puede cambiar su propia contraseña:

1. `/perfil` → Cambiar contraseña
2. Ingresar contraseña actual y nueva
3. Guardar

## 7. Registro

| Acción | Evidencia |
|--------|-----------|
| Alta | Solicitud + usuario creado en BD |
| Baja | Solicitud + estado inactivo |
| Cambio rol | Ticket o email de autorización |

## 8. Desviaciones

| Situación | Acción |
|-----------|--------|
| Usuario sin acceso tras alta | Verificar rol y permisos; verificar estado Activo |
| Credenciales comprometidas | Revocar sesiones + forzar cambio de contraseña |

---

**Aprobación:** _Pendiente_
