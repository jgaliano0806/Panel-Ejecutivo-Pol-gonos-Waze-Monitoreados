import { dbService } from '../dbService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ejecuta todas las migraciones SQL pendientes
 */
export async function runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');

    try {
        console.log('🔄 Ejecutando migraciones de base de datos...');

        // Migración 005: Agregar status y polygon_id a road_accidents
        const migration005Path = path.join(migrationsDir, '005_add_status_to_road_accidents.sql');

        if (fs.existsSync(migration005Path)) {
            const sql = fs.readFileSync(migration005Path, 'utf-8');
            await dbService.query(sql);
            console.log('✅ Migración 005 ejecutada: status y polygon_id agregados a road_accidents');

            // Actualizar TODOS los registros existentes con status='active'
            const updateResult = await dbService.query(`
                UPDATE road_accidents
                SET status = 'active'
                WHERE status IS NULL
            `);
            console.log(`✅ ${updateResult.rowCount || 0} registros de road_accidents actualizados con status='active'`);
        }

        console.log('✅ Migraciones completadas exitosamente');
    } catch (error: any) {
        // Si el error es por tabla/columna ya existente, es OK
        if (error.code === '42701' || error.code === '42P07' || error.message?.includes('already exists')) {
            console.log('✅ Migraciones ya aplicadas');
        } else {
            console.error('❌ Error ejecutando migraciones:', error);
            throw error;
        }
    }
}
