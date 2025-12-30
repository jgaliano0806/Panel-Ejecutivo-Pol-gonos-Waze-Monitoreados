import { dbService } from '../src/database/dbService';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración para agregar status y polygon_id...');

        const migrationPath = path.join(__dirname, '../src/database/migrations/005_add_status_to_road_accidents.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        await dbService.query(sql);

        console.log('✅ Migración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al ejecutar migración:', error);
        process.exit(1);
    }
}

runMigration();
