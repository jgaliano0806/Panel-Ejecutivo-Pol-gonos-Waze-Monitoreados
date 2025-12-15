# Script para corregir problemas de encoding en el proyecto
# Ejecutar como: .\fix-encoding.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CORRECCIÓN DE ENCODING UTF-8" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configurar PowerShell para UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$scriptDir = $PSScriptRoot
$totalFixed = 0
$errors = 0

Write-Host "📂 Directorio de trabajo: $scriptDir`n" -ForegroundColor Yellow

# Configurar Git
Write-Host "🔧 Configurando Git..." -ForegroundColor Cyan
try {
    git config core.quotepath false
    git config core.safecrlf false
    git config core.autocrlf true
    git config core.filemode false
    Write-Host "✅ Git configurado correctamente`n" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Error configurando Git: $($_.Exception.Message)`n" -ForegroundColor Yellow
}

# Función para convertir archivos a UTF-8
function Convert-ToUTF8 {
    param([string]$Path)

    try {
        $content = Get-Content -Path $Path -Raw -Encoding UTF8
        Set-Content -Path $Path -Value $content -Encoding UTF8 -NoNewline
        return $true
    }
    catch {
        return $false
    }
}

# Extensiones de archivo a procesar
$extensions = @('*.ts', '*.tsx', '*.js', '*.jsx', '*.json', '*.md', '*.css', '*.html')

Write-Host "📝 Convirtiendo archivos a UTF-8..." -ForegroundColor Cyan

foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $scriptDir -Filter $ext -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist|build' }

    foreach ($file in $files) {
        if (Convert-ToUTF8 -Path $file.FullName) {
            $totalFixed++
            Write-Host "  ✓ $($file.Name)" -ForegroundColor Gray
        }
        else {
            $errors++
            Write-Host "  ✗ $($file.Name)" -ForegroundColor Red
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Archivos convertidos: $totalFixed" -ForegroundColor Green
Write-Host "  Errores: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Gray" })
Write-Host "========================================`n" -ForegroundColor Cyan

# Normalizar line endings
Write-Host "🔄 Normalizando line endings..." -ForegroundColor Cyan
try {
    git add --renormalize .
    Write-Host "✅ Line endings normalizados`n" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ No se pudieron normalizar line endings (ejecuta 'git add --renormalize .' manualmente)`n" -ForegroundColor Yellow
}

Write-Host "✨ Proceso completado!" -ForegroundColor Green
Write-Host "`nRecomendaciones:" -ForegroundColor Yellow
Write-Host "  1. Reinicia tu editor de código (VS Code, Cursor, etc.)" -ForegroundColor White
Write-Host "  2. Reinicia los servicios: npm run dev" -ForegroundColor White
Write-Host "  3. Si usas VS Code, instala la extensión 'EditorConfig'" -ForegroundColor White

Write-Host "`nPresiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
