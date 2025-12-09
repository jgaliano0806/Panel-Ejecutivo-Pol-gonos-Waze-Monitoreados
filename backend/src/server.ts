import Fastify from 'fastify';
import cors from '@fastify/cors';
import { wazeService } from './services/wazeService';
import { apiService } from './services/apiService';
import dotenv from 'dotenv';

dotenv.config();

const server = Fastify({
    logger: true,
    // Optimizaciones de rendimiento
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
});

// Configurar CORS
server.register(cors, {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
});

// Hook global de manejo de errores
server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong'
    });
});

// Hook para agregar headers de cache
server.addHook('onSend', async (request, reply) => {
    // Cache de 30 segundos para datos de Waze (se actualizan cada 2 min)
    if (request.url.startsWith('/api/')) {
        reply.header('Cache-Control', 'public, max-age=30');
    }
});

// --- Rutas ---

server.get('/health', async () => {
    return {
        status: 'ok',
        uptime: process.uptime(),
        lastWazeUpdate: wazeService.getLastUpdate(),
        memory: process.memoryUsage()
    };
});

server.get('/api/polygons', async (request, reply) => {
    try {
        const polygons = apiService.getPolygonsStatus();
        return polygons;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygons status' });
    }
});

server.get('/api/polygons/:id', async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const detail = apiService.getPolygonDetail(id);

        if (!detail) {
            reply.code(404).send({ error: 'Polygon not found' });
            return;
        }

        return detail;
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get polygon detail' });
    }
});

server.get('/api/kpis/global', async (request, reply) => {
    try {
        return apiService.getGlobalKPIs();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get global KPIs' });
    }
});

server.get('/api/incidents/all', async (request, reply) => {
    try {
        return wazeService.getAlerts();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get incidents' });
    }
});

server.get('/api/jams/all', async (request, reply) => {
    try {
        return wazeService.getJams();
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get traffic jams' });
    }
});

// --- Arranque ---

const start = async () => {
    try {
        // Iniciar ingesta de Waze
        wazeService.startIngestionCycle();

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Backend server running on http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
