import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createServiceLogger } from "../utils/logger";

dotenv.config();

// Logger estructurado para este servicio
const log = createServiceLogger("DatabaseService");

/**
 * Servicio de Conexión a PostgreSQL
 * Maneja la conexión y operaciones de base de datos
 */
export class DatabaseService {
  private pool: Pool | null = null;
  private static instance: DatabaseService;

  private constructor() {
    this.initializePool();
  }

  /**
   * Obtiene instancia singleton del servicio
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Inicializa el pool de conexiones
   */
  private initializePool() {
    const config = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "panel_waze",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      max: 20, // Máximo de conexiones en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    // Manejar errores del pool
    this.pool.on("error", (err: Error) => {
      log.error(
        { error: err.message },
        "Error inesperado en el pool de PostgreSQL",
      );
    });

    log.info(
      { host: config.host, database: config.database },
      "Pool de PostgreSQL inicializado",
    );
  }

  /**
   * Obtiene una conexión del pool
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error("Pool de PostgreSQL no inicializado");
    }
    return await this.pool.connect();
  }

  /**
   * Obtiene el pool de conexiones
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error("Pool de PostgreSQL no inicializado");
    }
    return this.pool;
  }

  /**
   * Ejecuta una query
   */
  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("Pool de PostgreSQL no inicializado");
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Log solo en desarrollo (nivel debug)
      log.debug(
        { duration, rows: result.rowCount, text: text.substring(0, 100) },
        "Query ejecutada",
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(
        { error: errorMessage, query: text.substring(0, 100) },
        "Error ejecutando query",
      );
      throw error;
    }
  }

  /**
   * Ejecuta una transacción
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica la conexión a la base de datos
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.query("SELECT NOW()");
      log.info("Conexión a PostgreSQL exitosa");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error({ error: errorMessage }, "Error conectando a PostgreSQL");
      return false;
    }
  }

  /**
   * Ejecuta el esquema SQL (crea tablas)
   */
  public async initializeSchema(): Promise<void> {
    try {
      // Intentar diferentes rutas posibles
      let schemaPath = path.join(__dirname, "schema.sql");

      // Si no existe, intentar desde el directorio de trabajo
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(
          process.cwd(),
          "backend",
          "src",
          "database",
          "schema.sql",
        );
      }

      // Si aún no existe, intentar desde el directorio actual
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(process.cwd(), "src", "database", "schema.sql");
      }

      if (!fs.existsSync(schemaPath)) {
        log.warn(
          "No se encontró schema.sql, las tablas deben crearse manualmente",
        );
        return;
      }

      const schema = fs.readFileSync(schemaPath, "utf-8");

      // Ejecutar el esquema completo en una sola query (mejor manejo de funciones/procedimientos)
      if (schema.trim()) {
        await this.query(schema);
        log.info("Esquema de base de datos inicializado");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error({ error: errorMessage }, "Error inicializando esquema");
      // No lanzar error, permitir que continúe si las tablas ya existen o el error es menor
    }
  }

  /**
   * Cierra todas las conexiones
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      log.info("Pool de PostgreSQL cerrado");
    }
  }
}

// Exportar instancia singleton
export const dbService = DatabaseService.getInstance();
