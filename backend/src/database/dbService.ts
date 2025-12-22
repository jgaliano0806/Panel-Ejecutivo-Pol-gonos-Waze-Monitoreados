import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'panel_waze',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 20, // Máximo de conexiones en el pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new Pool(config);

        // Manejar errores del pool
        this.pool.on('error', (err: Error) => {
            console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
        });

        console.log('✅ Pool de PostgreSQL inicializado');
    }

    /**
     * Obtiene una conexión del pool
     */
    public async getClient(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error('Pool de PostgreSQL no inicializado');
        }
        return await this.pool.connect();
    }

    /**
     * Ejecuta una query
     */
    public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        if (!this.pool) {
            throw new Error('Pool de PostgreSQL no inicializado');
        }

        const start = Date.now();
        try {
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - start;

            // Log solo en desarrollo
            if (process.env.NODE_ENV === 'development') {
                console.log('📊 Query ejecutada:', { text, duration, rows: result.rowCount });
            }

            return result;
        } catch (error) {
            console.error('❌ Error ejecutando query:', error);
            throw error;
        }
    }

    /**
     * Ejecuta una transacción
     */
    public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
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
            const result = await this.query('SELECT NOW()');
            console.log('✅ Conexión a PostgreSQL exitosa');
            return true;
        } catch (error) {
            console.error('❌ Error conectando a PostgreSQL:', error);
            return false;
        }
    }

    /**
     * Ejecuta el esquema SQL (crea tablas)
     */
    public async initializeSchema(): Promise<void> {
        const fs = require('fs');
        const path = require('path');

        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf-8');

            // Ejecutar el esquema
            await this.query(schema);
            console.log('✅ Esquema de base de datos inicializado');
        } catch (error) {
            console.error('❌ Error inicializando esquema:', error);
            throw error;
        }
    }

    /**
     * Cierra todas las conexiones
     */
    public async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Pool de PostgreSQL cerrado');
        }
    }
}

// Exportar instancia singleton
export const dbService = DatabaseService.getInstance();

