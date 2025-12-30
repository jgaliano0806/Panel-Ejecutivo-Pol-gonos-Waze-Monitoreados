import { dbService } from '../src/database/dbService';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        console.log('🔧 Ejecutando migración: 004_create_road_accidents_tables.sql');

        const migrationPath = path.join(__dirname, '../src/database/migrations/004_create_road_accidents_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await dbService.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('✅ Tablas creadas: road_accidents, accident_media');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

runMigration();
