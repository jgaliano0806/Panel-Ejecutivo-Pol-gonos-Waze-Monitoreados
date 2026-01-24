import { FastifyInstance } from "fastify";

// Define interface for the response
interface WazeTVTMetric {
  polygonId: string;
  wazersCount: number;
  jamLevels: any;
  updateTime: string;
}

/**
 * Rutas para métricas TVT (Traffic View Tool / Time vs Time)
 * Implementación básica para resolver el 404 y servir datos mock o reales
 */
export default async function tvtRoutes(fastify: FastifyInstance) {
  fastify.get("/metrics", async (request, reply) => {
    // TODO: Conectar con servicio real de base de datos
    // Por ahora devolvemos un array vacío o datos mock para desbloquear el frontend
    const mockMetrics: WazeTVTMetric[] = [
      {
        polygonId: "mock-poly-1",
        wazersCount: 150,
        jamLevels: { low: 10, medium: 5, high: 2 },
        updateTime: new Date().toISOString(),
      },
    ];

    return mockMetrics;
  });
}
