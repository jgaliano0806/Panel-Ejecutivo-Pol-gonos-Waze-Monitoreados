import { FastifyInstance } from "fastify";
import { dangerZoneService } from "../services/dangerZoneService";
import { DangerZoneCreateInput, DangerZoneUpdateInput } from "@panel-waze/types";

interface IdParams {
  id: string;
}

export default async function dangerZonesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/danger-zones — todas (activas e inactivas)
  app.get("/", async (_req, reply) => {
    try {
      const zones = await dangerZoneService.getAllZones();
      return reply.send({ success: true, data: zones });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/danger-zones/active — solo activas
  app.get("/active", async (_req, reply) => {
    try {
      const zones = await dangerZoneService.getActiveZones();
      return reply.send({ success: true, data: zones });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/danger-zones/:id
  app.get<{ Params: IdParams }>("/:id", async (req, reply) => {
    try {
      const zone = await dangerZoneService.getById(req.params.id);
      if (!zone) return reply.status(404).send({ success: false, error: "Zona no encontrada" });
      return reply.send({ success: true, data: zone });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/danger-zones
  app.post<{ Body: DangerZoneCreateInput }>("/", async (req, reply) => {
    try {
      const { name, geometry, severity, protocol, color, description } = req.body;
      if (!name || !geometry || !severity || protocol === undefined) {
        return reply.status(400).send({ success: false, error: "Campos requeridos: name, geometry, severity, protocol" });
      }
      const zone = await dangerZoneService.create(req.body);
      return reply.status(201).send({ success: true, data: zone });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // PUT /api/danger-zones/:id
  app.put<{ Params: IdParams; Body: DangerZoneUpdateInput }>("/:id", async (req, reply) => {
    try {
      const zone = await dangerZoneService.update(req.params.id, req.body);
      if (!zone) return reply.status(404).send({ success: false, error: "Zona no encontrada" });
      return reply.send({ success: true, data: zone });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // DELETE /api/danger-zones/:id (hard delete)
  app.delete<{ Params: IdParams }>("/:id", async (req, reply) => {
    try {
      const success = await dangerZoneService.remove(req.params.id);
      if (!success) return reply.status(404).send({ success: false, error: "Zona no encontrada" });
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
