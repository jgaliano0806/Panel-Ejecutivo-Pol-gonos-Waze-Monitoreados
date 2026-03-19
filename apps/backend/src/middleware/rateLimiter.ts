import { FastifyRequest, FastifyReply } from 'fastify';
import { cacheService } from '../services/cacheService';

/**
 * Configuración de Rate Limiting
 * - Protege contra abuso de API
 * - Integración con Redis si está disponible
 * - Límites diferenciados por tipo de operación
 */

// Límites por tipo de operación
export const RATE_LIMITS = {
    // Lecturas generales - 100 req/min
    READ: { max: 100, timeWindow: '1 minute' },

    // Escrituras - 20 req/min
    WRITE: { max: 20, timeWindow: '1 minute' },

    // Operaciones costosas (cálculos, agregaciones) - 5 req/min
    EXPENSIVE: { max: 5, timeWindow: '1 minute' },

    // Exportaciones - 10 req/min
    EXPORT: { max: 10, timeWindow: '1 minute' },

    // WebSocket connections - 20 conexiones por minuto
    WEBSOCKET: { max: 20, timeWindow: '1 minute' },
} as const;

/**
 * Configuración global de rate limiting
 */
export const globalRateLimitConfig = {
    // Límite global: 100 requests por minuto
    max: 100,
    timeWindow: '1 minute',

    // Cache interno (fallback si Redis no disponible)
    cache: 10000,

    // IPs que no tienen límite
    allowList: ['127.0.0.1', '::1'],

    // No saltar en caso de error
    skipOnError: false,

    // Generador de key (prioriza API key > user id > IP)
    keyGenerator: (req: FastifyRequest) => {
        const apiKey = req.headers['x-api-key'] as string | undefined;
        const userId = (req as any).user?.id;
        const forwarded = req.headers['x-forwarded-for'] as string | undefined;
        const ip = forwarded?.split(',')[0]?.trim() || req.ip;

        return apiKey || userId || ip || 'anonymous';
    },

    // Respuesta de error personalizada
    errorResponseBuilder: (req: FastifyRequest, context: any) => {
        const retryAfter = Math.ceil(context.ttl / 1000);

        console.warn(`⚠️ Rate limit exceeded for ${req.ip} on ${req.method} ${req.url}`);

        return {
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Límite de solicitudes excedido. Intenta de nuevo en ${retryAfter} segundos.`,
            retryAfter,
        };
    },

    // Headers de rate limit
    addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
    },

    // Hook para después de exceder límite
    onExceeded: (req: FastifyRequest) => {
        console.warn(`🚫 Rate limit exceeded:`, {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.headers['user-agent'],
        });
    },

    // En desarrollo, límites más permisivos
    ...(process.env.NODE_ENV === 'development' && {
        max: 500,
        timeWindow: '1 minute',
    }),
};

/**
 * Endpoints excluidos de rate limiting
 */
export const rateLimitExclusions = [
    '/health',
    '/health/live',
    '/health/ready',
    '/api/health',
    '/tiles', // Tiles del mapa: muchas peticiones simultáneas, no deben contar contra el límite
];

/**
 * Verifica si un endpoint debe ser excluido
 */
export function shouldExcludeFromRateLimit(url: string): boolean {
    return rateLimitExclusions.some(excluded =>
        url === excluded || url.startsWith(excluded + '/')
    );
}

/**
 * Hook para logging de rate limit
 */
export function rateLimitLoggingHook(req: FastifyRequest, reply: FastifyReply) {
    const remaining = reply.getHeader('x-ratelimit-remaining');

    // Log cuando está cerca del límite (menos del 10%)
    if (remaining !== undefined) {
        const limit = reply.getHeader('x-ratelimit-limit');
        const remainingNum = Number(remaining);
        const limitNum = Number(limit);

        if (remainingNum === 0) {
            console.warn(`🚫 Rate limit HIT:`, {
                ip: req.ip,
                endpoint: req.url,
                method: req.method,
            });
        } else if (limitNum > 0 && remainingNum / limitNum <= 0.1) {
            console.log(`⚠️ Rate limit approaching:`, {
                ip: req.ip,
                remaining: remainingNum,
                limit: limitNum,
            });
        }
    }
}

/**
 * Configuración para endpoint específico
 */
export function createEndpointRateLimit(type: keyof typeof RATE_LIMITS) {
    return {
        rateLimit: RATE_LIMITS[type]
    };
}
