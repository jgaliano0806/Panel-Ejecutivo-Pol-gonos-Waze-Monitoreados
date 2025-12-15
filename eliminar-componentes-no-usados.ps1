# Script para eliminar componentes no utilizados
# Panel Ejecutivo - Optimización de Código
# Fecha: 15 de Diciembre de 2025

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ELIMINACIÓN DE COMPONENTES NO USADOS  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener el directorio del script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$componentsDir = Join-Path $scriptDir "src\components"

Write-Host "Directorio de componentes: $componentsDir" -ForegroundColor Yellow
Write-Host ""

# Lista de archivos a eliminar
$filesToDelete = @(
    "ExecutiveSummary.backup.tsx",
    "KPICard.tsx",
    "KPICards.tsx",
    "FluidityIndexCard.tsx",
    "GroupStats.tsx",
    "RoadTypeStats.tsx",
    "StrategicAlerts.tsx",
    "AlertsPanel.tsx",
    "MapFilters.tsx",
    "SpeedHeatmap.tsx",
    "TrendIndicators.tsx",
    "TopCritical.tsx"
)

$deletedCount = 0
$notFoundCount = 0
$errorCount = 0

foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $componentsDir $file

    if (Test-Path $fullPath) {
        try {
            Remove-Item $fullPath -Force
            Write-Host "[✓] Eliminado: $file" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "[✗] Error al eliminar: $file" -ForegroundColor Red
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    else {
        Write-Host "[−] No encontrado: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Archivos eliminados: $deletedCount" -ForegroundColor Green
Write-Host "  Archivos no encontrados: $notFoundCount" -ForegroundColor Gray
Write-Host "  Errores: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Gray" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($deletedCount -gt 0) {
    Write-Host "✅ Optimización completada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos recomendados:" -ForegroundColor Yellow
    Write-Host "  1. Verificar que la aplicación funciona correctamente" -ForegroundColor White
    Write-Host "  2. Ejecutar: npm run dev (frontend) y npm run dev (backend)" -ForegroundColor White
    Write-Host "  3. Hacer commit de los cambios: git add . && git commit -m 'Optimiza código eliminando componentes no usados'" -ForegroundColor White
}
else {
    Write-Host "ℹ️ No se eliminaron archivos. Es posible que ya hayan sido eliminados." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
