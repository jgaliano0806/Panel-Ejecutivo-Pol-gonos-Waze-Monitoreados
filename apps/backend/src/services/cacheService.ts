import Redis from 'ioredis';

/**
 * TTL por tipo de datos (en segundos)
 */
export const TTL = {
    WAZE_ALERTS: 60,      // 1 minuto
    WAZE_JAMS: 60,        // 1 minuto
    WEATHER: 300,         // 5 minutos
    RISK_SCORE: 120,      // 2 minutos
    POLYGONS: 3600,       // 1 hora
    STATS: 600,           // 10 minutos
    DEFAULT: 300,         // 5 minutos
} as const;

/**
 * Servicio de Cache con Redis
 * - Reduce latencia 70-90%
 * - Descarga de PostgreSQL
 * - Fallback graceful si Redis no está disponible
 */
class CacheService {
    private redis: Redis | null = null;
    private isConnected: boolean = false;
    private memoryCache = new Map<string, { value: any, expiresAt: number }>();

    constructor() {
        this.initialize();
    }

    /**
     * Inicializa la conexión a Redis
     */
    private initialize(): void {
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379');
        const password = process.env.REDIS_PASSWORD || undefined;
        const db = parseInt(process.env.REDIS_DB || '0');

        try {
            this.redis = new Redis({
                host,
                port,
                password,
                db,
                retryStrategy: (times: number) => {
                    if (times > 10) {
                        console.error('❌ Redis: demasiados reintentos, deshabilitando cache');
                        return null; // Stop retrying
                    }
                    return Math.min(times * 50, 2000);
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true,
            });

            this.redis.on('connect', () => {
                this.isConnected = true;
                console.log('🔴 Redis connected');
            });

            this.redis.on('ready', () => {
                this.isConnected = true;
                console.log('✅ Redis ready');
            });

            this.redis.on('error', (err: Error) => {
                if (err.message.includes('ECONNREFUSED')) {
                    if (this.isConnected) {
                        console.warn('⚠️ Redis no disponible - cache deshabilitado');
                    }
                    this.isConnected = false;
                } else {
                    console.error('❌ Redis error:', err.message);
                }
            });

            this.redis.on('close', () => {
                this.isConnected = false;
            });

            // Intentar conectar
            this.redis.connect().catch(() => {
                console.warn('⚠️ Redis no disponible - cache deshabilitado');
                this.isConnected = false;
            });

        } catch (error) {
            console.warn('⚠️ Redis initialization failed - cache deshabilitado');
            this.redis = null;
            this.isConnected = false;
        }
    }

    /**
     * Obtiene un valor del cache
     */
    public async get<T>(key: string): Promise<T | null> {
        if (this.redis && this.isConnected) {
            try {
                const data = await this.redis.get(key);
                if (data) return JSON.parse(data) as T;
            } catch (error) {
                console.error(`Cache get error for ${key}:`, error instanceof Error ? error.message : error);
            }
        }
        
        const entry = this.memoryCache.get(key);
        if (entry) {
            if (Date.now() < entry.expiresAt) {
                return entry.value as T;
            } else {
                this.memoryCache.delete(key);
            }
        }
        return null;
    }

    /**
     * Guarda un valor en el cache con TTL
     */
    public async set(key: string, value: any, ttl: number = TTL.DEFAULT): Promise<void> {
        if (this.redis && this.isConnected) {
            try {
                await this.redis.setex(key, ttl, JSON.stringify(value));
            } catch (error) {}
        }
        
        this.memoryCache.set(key, {
            value,
            expiresAt: Date.now() + (ttl * 1000)
        });
    }

    /**
     * Invalida todas las keys que coinciden con el patrón
     * Ejemplo: invalidate('waze:alerts:*') borra waze:alerts:P001, waze:alerts:P002, etc.
     */
    public async invalidate(pattern: string): Promise<number> {
        let count = 0;
        const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const key of this.memoryCache.keys()) {
            if (regexPattern.test(key)) {
                this.memoryCache.delete(key);
                count++;
            }
        }

        if (this.redis && this.isConnected) {
            try {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    count += keys.length;
                    console.log(`🗑️ Cache invalidated: ${pattern} (${keys.length} keys)`);
                }
            } catch (error) {}
        }
        return count;
    }

    /**
     * Invalida una key específica
     */
    public async del(key: string): Promise<void> {
        this.memoryCache.delete(key);
        if (this.redis && this.isConnected) {
            try { await this.redis.del(key); } catch (error) {}
        }
    }

    /**
     * Verifica si una key existe
     */
    public async exists(key: string): Promise<boolean> {
        if (!this.redis || !this.isConnected) return false;

        try {
            return (await this.redis.exists(key)) === 1;
        } catch (error) {
            return false;
        }
    }

    /**
     * Limpia todo el cache (usar con precaución)
     */
    public async clear(): Promise<void> {
        this.memoryCache.clear();
        if (this.redis && this.isConnected) {
            try { await this.redis.flushdb(); } catch (error) {}
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    public async getStats(): Promise<{ connected: boolean; keyCount: number; memory: string }> {
        if (!this.redis || !this.isConnected) {
            return { connected: false, keyCount: 0, memory: '0' };
        }

        try {
            const info = await this.redis.info('memory');
            const keyCount = await this.redis.dbsize();
            const memoryMatch = info.match(/used_memory_human:(\S+)/);

            return {
                connected: true,
                keyCount,
                memory: memoryMatch ? memoryMatch[1] : 'unknown'
            };
        } catch (error) {
            return { connected: false, keyCount: 0, memory: '0' };
        }
    }

    /**
     * Verifica si el cache está disponible
     */
    public isAvailable(): boolean {
        return this.isConnected;
    }

    /**
     * Cierra la conexión a Redis
     */
    public async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
            console.log('🔴 Redis disconnected');
        }
    }

    /**
     * Wrapper para cache-aside pattern
     * Si el valor no está en cache, ejecuta la función y guarda el resultado
     */
    public async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = TTL.DEFAULT
    ): Promise<T> {
        // Intentar obtener del cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Ejecutar función y cachear resultado
        const result = await fetchFn();
        await this.set(key, result, ttl);
        return result;
    }
}

// Exportar singleton
export const cacheService = new CacheService();
export default cacheService;
