
const { dbService } = require('./apps/backend/src/database/dbService');

async function checkColumns() {
    try {
        const result = await dbService.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'polygon_weather_data';
        `);
        console.table(result.rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkColumns();
