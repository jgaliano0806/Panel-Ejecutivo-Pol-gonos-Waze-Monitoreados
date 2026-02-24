/**
 * Corrige la contraseña del admin en la base de datos
 * generando un hash bcrypt real para 'Admin123!'
 *
 * Uso: npx tsx scripts/fix-admin-password.ts
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function fixAdminPassword() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "panel_waze",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  try {
    const password = "Admin123!";
    console.log(`Generando hash bcrypt para: ${password}`);

    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);

    if (!isValid) {
      console.error("Error: el hash generado no es válido");
      process.exit(1);
    }

    // Actualizar en la base de datos
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, first_name`,
      [hash, "admin@casisa.com"],
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(
        `Password actualizado para: ${user.email} (${user.first_name})`,
      );
    } else {
      console.log("Usuario admin@casisa.com no encontrado");
    }

    console.log("\nListo! Prueba login con:");
    console.log("  Email: admin@casisa.com");
    console.log("  Password: Admin123!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();
