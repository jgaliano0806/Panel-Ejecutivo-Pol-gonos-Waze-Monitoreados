/**
 * Script para ejecutar la migración 004_waze_tables.sql
 * Uso: npx ts-node scripts/run-waze-migration.ts
 */
import { dbService } from '../apps/backend/src/database/dbService';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('🔧 Ejecutando migración 004_waze_tables.sql...');

    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../apps/backend/src/database/migrations/004_waze_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Ejecutar migración
        await dbService.query(sql);

        console.log('✅ Migración ejecutada exitosamente');

        // Verificar tablas creadas
        const result = await dbService.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'waze_%'
        `);

        console.log('📊 Tablas Waze creadas:');
        result.rows.forEach((row: any) => console.log(`   - ${row.table_name}`));

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    } finally {
        await dbService.close();
    }
}

runMigration();
