
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'panel_waze',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function checkColumns() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'polygon_weather_data';
        `);
        console.table(res.rows);
        await client.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
