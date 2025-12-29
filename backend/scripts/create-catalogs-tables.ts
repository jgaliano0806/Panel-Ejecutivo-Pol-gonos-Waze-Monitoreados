import * as fs from 'fs';
import * as path from 'path';
import { dbService } from '../src/database/dbService';

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de catálogos y usuarios...');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', '004_catalogs_and_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar la migración
    await dbService.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');
    console.log('📊 Tablas creadas:');
    console.log('  - incident_types');
    console.log('  - incident_subtypes');
    console.log('  - permissions');
    console.log('  - roles');
    console.log('  - role_permissions');
    console.log('  - users');
    console.log('  - user_roles');
    console.log('  - sso_providers');
    console.log('  - system_settings');
    console.log('  - audit_logs');

    // Verificar que las tablas se crearon correctamente
    const tables = await dbService.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'incident_types', 'incident_subtypes', 'permissions', 'roles',
        'role_permissions', 'users', 'user_roles', 'sso_providers',
        'system_settings', 'audit_logs'
      )
      ORDER BY tablename
    `);

    console.log('\n📋 Verificación de tablas creadas:');
    tables.rows.forEach((row: any) => {
      console.log(`  ✅ ${row.tablename}`);
    });

    // Mostrar datos por defecto insertados
    const typesCount = await dbService.query('SELECT COUNT(*) as count FROM incident_types');
    const subtypesCount = await dbService.query('SELECT COUNT(*) as count FROM incident_subtypes');
    const rolesCount = await dbService.query('SELECT COUNT(*) as count FROM roles');
    const permissionsCount = await dbService.query('SELECT COUNT(*) as count FROM permissions');

    console.log('\n📈 Datos por defecto insertados:');
    console.log(`  - Tipos de incidentes: ${typesCount.rows[0].count}`);
    console.log(`  - Subtipos de incidentes: ${subtypesCount.rows[0].count}`);
    console.log(`  - Roles: ${rolesCount.rows[0].count}`);
    console.log(`  - Permisos: ${permissionsCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await dbService.close();
  }
}

// Ejecutar la migración
runMigration()
  .then(() => {
    console.log('\n🎉 Migración finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en la migración:', error);
    process.exit(1);
  });
