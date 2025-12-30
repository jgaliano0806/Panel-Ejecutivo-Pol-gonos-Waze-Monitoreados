const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'panel_waze',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../src/database/migrations');

    // Files to run (could be dynamic)
    const files = [
        '006_cleanup_and_optimize.sql',
        '007_normalize_naming.sql'
    ];

    console.log('🚀 Starting migrations...');

    const client = await pool.connect();

    try {
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`\n📄 Running ${file}...`);
                const sql = fs.readFileSync(filePath, 'utf-8');

                // Ejecutar
                await client.query(sql);
                console.log(`✅ ${file} applied successfully.`);
            } else {
                console.warn(`⚠️ File not found: ${file}`);
            }
        }
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
        console.log('\n🏁 Migration process finished.');
    }
}

runMigrations();
