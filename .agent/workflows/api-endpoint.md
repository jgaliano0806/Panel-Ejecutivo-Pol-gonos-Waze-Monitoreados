---
description: api-endpoint Crear nuevo endpoint en Fastify
---

typescript// En server.ts
server.get('/api/resource/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    }
  },
  config: {
    rateLimit: { max: 100, timeWindow: '1 minute' }
  }
}, async (request, reply) => {
  try {
    const { id } = request.params;
    const data = await service.getData(id);
    return reply.code(200).send(data);
  } catch (error) {
    logger.error('Endpoint error', { error, id });
    return reply.code(500).send({ error: 'Internal error' });
  }
});
Incluir:

Schema validation
Rate limiting
Error handling
Logging
CORS si público
