import { dbService } from "../src/database/dbService";
import * as fs from "fs";
import * as path from "path";

async function runAuthMigration() {
  try {
    console.log("🔄 Ejecutando migración 005_auth_sessions...");

    const migrationPath = path.join(
      __dirname,
      "migrations/005_auth_sessions.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    await dbService.query(sql);
    console.log("✅ Migración 005_auth_sessions completada");

    // Verificar que las tablas se crearon
    const tablesResult = await dbService.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('user_sessions')
        `);
    console.log(
      `✅ Tablas creadas: ${tablesResult.rows.map((r) => r.table_name).join(", ")}`,
    );

    // Verificar que el admin fue creado
    const adminResult = await dbService.query(`
            SELECT u.email, r.name as role_name
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.email = 'admin@casisa.com'
        `);

    if (adminResult.rows.length > 0) {
      console.log(
        `✅ Usuario admin creado: ${adminResult.rows[0].email} (rol: ${adminResult.rows[0].role_name})`,
      );
    } else {
      console.log("⚠️  Usuario admin no encontrado - puede que ya existiera");
    }

    console.log("\n🎉 Migración completada exitosamente");
    console.log("📋 Credenciales admin:");
    console.log("   Email: admin@casisa.com");
    console.log("   Password: Admin123!");
    console.log("   ⚠️  Cambiar password en producción\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

runAuthMigration();
