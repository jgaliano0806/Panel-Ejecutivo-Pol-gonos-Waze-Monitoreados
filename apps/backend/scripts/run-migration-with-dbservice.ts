import { dbService } from '../src/database/dbService';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrationAndUpdate() {
    try {
        console.log('🔄 Ejecutando migración 005...');

        const migrationPath = path.join(__dirname, '../src/database/migrations/005_add_status_to_road_accidents.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        await dbService.query(sql);
        console.log('✅ Migración 005 completada');

        // Actualizar TODOS los registros existentes con status='active'
        console.log('🔄 Actualizando registros existentes...');
        const updateResult = await dbService.query(`
            UPDATE road_accidents
            SET status = 'active'
            WHERE status IS NULL
        `);
        console.log(`✅ ${updateResult.rowCount || 0} registros actualizados con status='active'`);

        console.log('✅ Proceso completado exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

runMigrationAndUpdate();
