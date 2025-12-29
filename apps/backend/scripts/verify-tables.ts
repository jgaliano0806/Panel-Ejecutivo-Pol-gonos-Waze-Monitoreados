import { dbService } from '../src/database/dbService';

(async () => {
    try {
        const result = await dbService.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Tablas en la base de datos:');
        result.rows.forEach((r) => {
            console.log('  ✓', (r as { table_name: string }).table_name);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();

