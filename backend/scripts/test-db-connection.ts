/**
 * Script de prueba de conexión a PostgreSQL
 * Ejecutar con: npx ts-node scripts/test-db-connection.ts
 */

import { dbService } from '../src/database/dbService';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
    console.log('🔍 Probando conexión a PostgreSQL...\n');

    // Mostrar configuración
    console.log('📋 Configuración:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'panel_waze'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'no configurada'}\n`);

    try {
        // 1. Probar conexión básica
        console.log('1️⃣ Probando conexión básica...');
        const connected = await dbService.testConnection();

        if (!connected) {
            console.error('❌ No se pudo conectar a PostgreSQL');
            process.exit(1);
        }
        console.log('✅ Conexión exitosa\n');

        // 2. Verificar tablas
        console.log('2️⃣ Verificando tablas...');
        const tablesResult = await dbService.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        const tables = tablesResult.rows.map((row: any) => row.table_name);
        console.log(`   Tablas encontradas: ${tables.length}`);
        tables.forEach((table: string) => {
            console.log(`   - ${table}`);
        });
        console.log('');

        // 3. Verificar estructura de historical_snapshots
        if (tables.includes('historical_snapshots')) {
            console.log('3️⃣ Verificando estructura de historical_snapshots...');
            const columnsResult = await dbService.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'historical_snapshots'
                ORDER BY ordinal_position
            `);

            console.log('   Columnas:');
            columnsResult.rows.forEach((row: any) => {
                console.log(`   - ${row.column_name} (${row.data_type})`);
            });
            console.log('');
        }

        // 4. Probar inserción de prueba
        console.log('4️⃣ Probando inserción de datos...');
        const testSnapshot = {
            timestamp: new Date(),
            totalJams: 0,
            totalIncidents: 0,
            avgSpeed: null,
            avgDelay: 0,
            criticalKm: 0,
            affectedPolygons: 0,
            criticalPolygons: 0,
        };

        await dbService.query(
            `INSERT INTO historical_snapshots
            (timestamp, total_jams, total_incidents, avg_speed, avg_delay, critical_km, affected_polygons, critical_polygons)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                testSnapshot.timestamp,
                testSnapshot.totalJams,
                testSnapshot.totalIncidents,
                testSnapshot.avgSpeed,
                testSnapshot.avgDelay,
                testSnapshot.criticalKm,
                testSnapshot.affectedPolygons,
                testSnapshot.criticalPolygons,
            ]
        );
        console.log('✅ Inserción exitosa\n');

        // 5. Probar lectura
        console.log('5️⃣ Probando lectura de datos...');
        const readResult = await dbService.query(
            'SELECT COUNT(*) as count FROM historical_snapshots'
        );
        const count = readResult.rows[0]?.count || 0;
        console.log(`   Total de snapshots: ${count}\n`);

        // 6. Limpiar datos de prueba
        console.log('6️⃣ Limpiando datos de prueba...');
        await dbService.query(
            'DELETE FROM historical_snapshots WHERE total_jams = 0 AND total_incidents = 0'
        );
        console.log('✅ Limpieza completada\n');

        console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
        console.log('✅ PostgreSQL está configurado correctamente\n');

    } catch (error) {
        console.error('\n❌ Error durante las pruebas:');
        if (error instanceof Error) {
            console.error(`   Mensaje: ${error.message}`);
            if (error.stack) {
                console.error(`   Stack: ${error.stack}`);
            }
        } else {
            console.error('   Error desconocido:', error);
        }

        console.error('\n💡 Posibles soluciones:');
        console.error('   1. Verifica que PostgreSQL esté corriendo');
        console.error('   2. Verifica las credenciales en backend/.env');
        console.error('   3. Verifica que la base de datos "panel_waze" exista');
        console.error('   4. Si usas Docker: docker-compose up -d postgres');

        process.exit(1);
    } finally {
        // Cerrar conexión
        await dbService.close();
    }
}

// Ejecutar pruebas
testConnection();

