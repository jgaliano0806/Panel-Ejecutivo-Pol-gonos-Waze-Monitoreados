import { FastifyInstance } from "fastify";
import { zonaPeligrosaService } from "../services/zonaPeligrosaService";
import type { ZonaPeligrosaRow } from "../repositories/ZonaPeligrosaRepository";

function toApiShape(row: ZonaPeligrosaRow) {
  return {
    id: row.id,
    name: row.nombre,
    geometry: row.geometria,
    severity: row.nivel_severidad === 2 ? "critical" : "high",
    protocol: row.protocolo_accion,
    color: row.nivel_severidad === 2 ? "#ef4444" : "#f97316",
    is_active: row.activa,
    created_at: row.fecha_creacion
      ? new Date(row.fecha_creacion).toISOString()
      : new Date().toISOString(),
  };
}

interface CreateBody {
  nombre: string;
  geometria: GeoJSON.Polygon;
  nivel_severidad: 1 | 2;
  protocolo_accion: string;
}

export default async function zonasPeligrosasRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/", async (_req, reply) => {
    try {
      const rows = await zonaPeligrosaService.listAll();
      return reply.send({ success: true, data: rows.map(toApiShape) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });

  app.get("/active", async (_req, reply) => {
    try {
      const rows = await zonaPeligrosaService.listActive();
      return reply.send({ success: true, data: rows.map(toApiShape) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });

  app.post<{ Body: CreateBody }>("/", async (req, reply) => {
    try {
      const { nombre, geometria, nivel_severidad, protocolo_accion } = req.body;
      if (!nombre?.trim() || !geometria || !nivel_severidad) {
        return reply.status(400).send({
          success: false,
          error: "nombre, geometria y nivel_severidad son obligatorios",
        });
      }
      const row = await zonaPeligrosaService.create({
        nombre: nombre.trim(),
        geometria,
        nivel_severidad,
        protocolo_accion: protocolo_accion?.trim() || "",
      });
      return reply.status(201).send({ success: true, data: toApiShape(row) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });

  app.put<{ Params: { id: string }; Body: Partial<CreateBody> }>(
    "/:id",
    async (req, reply) => {
      try {
        const row = await zonaPeligrosaService.update(req.params.id, {
          nombre: req.body.nombre,
          geometria: req.body.geometria,
          nivel_severidad: req.body.nivel_severidad,
          protocolo_accion: req.body.protocolo_accion,
        });
        if (!row)
          return reply
            .status(404)
            .send({ success: false, error: "No encontrada" });
        return reply.send({ success: true, data: toApiShape(row) });
      } catch (e: any) {
        return reply.status(500).send({ success: false, error: e.message });
      }
    },
  );

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    try {
      const ok = await zonaPeligrosaService.remove(req.params.id);
      if (!ok)
        return reply.status(404).send({ success: false, error: "No encontrada" });
      return reply.send({ success: true });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  });
}
