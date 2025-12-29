import { catalogSyncService } from '../src/services/catalogSyncService';

async function syncCatalogs() {
  try {
    console.log('🚀 Iniciando sincronización inicial de catálogos...');

    const result = await catalogSyncService.syncFromWazeFeeds();

    console.log('✅ Sincronización completada exitosamente!');
    console.log(`📊 Resultados:`);
    console.log(`   - Nuevos tipos: ${result.newTypes}`);
    console.log(`   - Tipos actualizados: ${result.updatedTypes}`);
    console.log(`   - Nuevos subtipos: ${result.newSubtypes}`);
    console.log(`   - Subtipos actualizados: ${result.updatedSubtypes}`);
    console.log(`   - Total incidentes procesados: ${result.totalIncidents}`);
    console.log(`   - Polígonos procesados: ${result.processedPolygons.join(', ')}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar sincronización
syncCatalogs();
