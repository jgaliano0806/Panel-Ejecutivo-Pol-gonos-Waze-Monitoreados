const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'panel_waze',
        user: 'postgres',
        password: '', // Intentar sin contraseña primero
    });

    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado');

        const sqlPath = path.join(__dirname, '../src/database/migrations/005_add_status_to_road_accidents.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔄 Ejecutando migración 005...');
        await client.query(sql);
        console.log('✅ Migración 005 ejecutada exitosamente');

        // Actualizar TODOS los registros existentes con status='active'
        console.log('🔄 Actualizando registros existentes...');
        const updateResult = await client.query(`
            UPDATE road_accidents
            SET status = 'active'
            WHERE status IS NULL
        `);
        console.log(`✅ ${updateResult.rowCount} registros actualizados con status='active'`);

        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

runMigration();
