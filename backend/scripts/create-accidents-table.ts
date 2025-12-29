/**
 * Script para crear la tabla road_accidents si no existe
 * Ejecutar: npx ts-node scripts/create-accidents-table.ts
 */

import { dbService } from '../src/database/dbService';
import * as fs from 'fs';
import * as path from 'path';

async function createAccidentsTable() {
    try {
        console.log('🔍 Verificando si la tabla road_accidents existe...');

        // Verificar si existe
        const checkQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'road_accidents'
            );
        `;

        const result = await dbService.query(checkQuery);
        const exists = result.rows[0].exists;

        if (exists) {
            console.log('✅ La tabla road_accidents ya existe');

            // Verificar si tiene datos
            const countResult = await dbService.query('SELECT COUNT(*) as count FROM road_accidents');
            const count = parseInt(countResult.rows[0].count);
            console.log(`📊 Registros en la tabla: ${count}`);

            return;
        }

        console.log('⚠️ La tabla road_accidents NO existe. Creándola...');

        // Leer y ejecutar la migración
        const migrationPath = path.join(__dirname, '../src/database/migrations/003_road_accidents_multimedia.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Ejecutar la migración
        await dbService.query(migrationSQL);

        console.log('✅ Tabla road_accidents creada exitosamente');

        // Verificar que se creó correctamente
        const verifyResult = await dbService.query(checkQuery);
        if (verifyResult.rows[0].exists) {
            console.log('✅ Verificación: La tabla existe correctamente');
        } else {
            console.error('❌ Error: La tabla no se creó correctamente');
        }

    } catch (error) {
        console.error('❌ Error al crear la tabla:', error);
        if (error instanceof Error) {
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    } finally {
        await dbService.close();
    }
}

// Ejecutar
createAccidentsTable()
    .then(() => {
        console.log('✅ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });

