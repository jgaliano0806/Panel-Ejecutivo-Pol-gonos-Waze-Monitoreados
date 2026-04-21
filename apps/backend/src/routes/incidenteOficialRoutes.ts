import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { incidenteOficialService, IncidenteOficial } from '../services/incidenteOficialService';
import { authenticate } from '../middleware/authMiddleware';

export const incidenteOficialRoutes: FastifyPluginAsync = async (fastify, opts) => {
  
  // Endpoint: Obtener incidentes activos (Para Mapa Panel Web)
  fastify.get('/', {
    preHandler: [authenticate] 
  }, async (request, reply) => {
    try {
      const incidentes = await incidenteOficialService.getActiveIncidents();
      return reply.send({ success: true, data: incidentes });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ success: false, error: 'Error fetching incidents' });
    }
  });

  // Endpoint: Crear Siniestro desde Móvil (App Inspectores/EPI)
  fastify.post('/', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const data = request.body as IncidenteOficial;
      const user = (request as any).user;
      const incidente = await incidenteOficialService.createIncidente(data, user.id);
      return reply.send({ success: true, data: incidente });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Endpoint: Máquina de Estados - Aprobar/Rechazar (Libro de Actas Inmutable)
  fastify.patch('/:id/state', {
    preHandler: [authenticate] // O preHandler con permisos ej: requirePermissions(['incidents.manage'])
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { nuevoEstado, justificacion } = request.body as { nuevoEstado: string, justificacion: string };
      const user = (request as any).user;

      const actualizado = await incidenteOficialService.transitionState(
        parseInt(id, 10),
        user.id,
        nuevoEstado,
        justificacion
      );
      
      return reply.send({ success: true, data: actualizado });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

};
