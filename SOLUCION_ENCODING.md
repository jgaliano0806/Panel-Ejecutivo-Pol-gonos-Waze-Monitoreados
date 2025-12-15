# 🔧 Solución de Problemas de Encoding

## ✅ Cambios Aplicados

He configurado el proyecto para manejar correctamente UTF-8 y evitar problemas de encoding de caracteres.

### 1. **Archivos de Configuración Creados:**

#### `.editorconfig`
- Define UTF-8 como charset por defecto
- Configura line endings a LF
- Consistencia de espacios vs tabs

#### `.gitattributes`
- Normaliza line endings (LF para todos los archivos de texto)
- Marca archivos binarios correctamente

#### `.vscode/settings.json`
- Configura VS Code/Cursor para usar UTF-8
- Terminal PowerShell con UTF-8 (chcp 65001)
- Format on save habilitado

### 2. **Configuración de Git:**

```bash
git config core.quotepath false       # No escapar caracteres UTF-8
git config core.safecrlf false        # Permitir conversión de CRLF
git config core.autocrlf true         # Convertir automáticamente en Windows
```

### 3. **PowerShell UTF-8:**

Agregado a las terminales:
```powershell
chcp 65001  # Code Page UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 🎯 Cómo Usar

### Para Cursor/VS Code:

1. **Reinicia el editor** para que cargue las nuevas configuraciones
2. Todas las nuevas terminales usarán UTF-8 automáticamente
3. Los archivos se guardarán en UTF-8 automáticamente

### Para PowerShell Manual:

Ejecuta al inicio de cada sesión:
```powershell
chcp 65001
$OutputEncoding = [System.Text.Encoding]::UTF-8
```

O agrega a tu perfil de PowerShell:
```powershell
# Ver ubicación del perfil
$PROFILE

# Editar perfil
notepad $PROFILE

# Agregar estas líneas:
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 🔍 Verificar que Funciona

### Test 1: Git
```bash
git status
# Deberías ver caracteres correctos sin "�"
```

### Test 2: PowerShell
```powershell
Write-Host "Prueba: áéíóú ñÑ 中文 日本語 한글"
# Debería mostrar correctamente
```

### Test 3: Terminal del Editor
```bash
echo "Test: Polígonos – Waze"
# No debería mostrar "Pol��gonos"
```

---

## 📁 Archivos Afectados

Todos los archivos de código ahora están configurados para:
- ✅ UTF-8 encoding
- ✅ LF line endings (no CRLF)
- ✅ Trim trailing whitespace
- ✅ Insert final newline

---

## ⚠️ Solución de Problemas

### Si aún ves caracteres raros:

1. **Reinicia el editor completamente**
2. **Cierra todas las terminales** y abre nuevas
3. **Verifica la configuración:**
   ```powershell
   [Console]::OutputEncoding
   # Debería mostrar: UTF8
   ```

### Si Git muestra warnings sobre CRLF:

Es normal en Windows. Los archivos se normalizan automáticamente:
```bash
warning: in the working copy of 'file.ts', LF will be replaced by CRLF
```

Esto es OK - Git está haciendo su trabajo.

---

## 🚀 Beneficios

- ✅ **No más caracteres "�"** en consola
- ✅ **Nombres de archivo** con tildes y caracteres especiales funcionan
- ✅ **Consistencia** entre Windows, Mac y Linux
- ✅ **Commits limpios** sin cambios de line endings
- ✅ **Colaboración mejorada** - todos los desarrolladores ven lo mismo

---

## 📝 Notas Importantes

### El Problema Original:

- Windows usa **CRLF** (`\r\n`) para line endings
- Linux/Mac usan **LF** (`\n`)
- PowerShell por defecto usa **codepage 850** o **1252** (no UTF-8)
- Esto causaba que caracteres como "ó" se mostraran como "�"

### La Solución:

- **Git** normaliza todo a LF en el repositorio
- **EditorConfig** asegura que todos los editores usen UTF-8
- **PowerShell** configurado para UTF-8 (codepage 65001)
- **Archivos de config** previenen problemas futuros

---

## ✨ Estado Actual

| Componente | Estado | Encoding |
|------------|--------|----------|
| Git | ✅ Configurado | UTF-8 |
| EditorConfig | ✅ Creado | UTF-8 |
| VS Code/Cursor | ✅ Configurado | UTF-8 |
| PowerShell | ✅ Configurado | UTF-8 (65001) |
| Archivos TS/TSX | ✅ Normalizados | UTF-8 + LF |
| Archivos JSON | ✅ Normalizados | UTF-8 + LF |

---

**Todos los problemas de encoding deberían estar resueltos.** 🎉

Si encuentras algún problema persistente, reinicia completamente tu computadora para que todas las configuraciones se apliquen correctamente.
