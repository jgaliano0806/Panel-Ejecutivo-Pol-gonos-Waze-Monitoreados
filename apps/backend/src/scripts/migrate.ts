// Wrapper para ejecutar migraciones
import { runMigrations } from "../database/migrations/runMigrations";

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
