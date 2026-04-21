import { FastifyInstance } from "fastify";
import { authenticate, requirePermission } from "../middleware/authMiddleware";
import { zonaPeligrosaService } from "../services/zonaPeligrosaService";
import type { ZonaPeligrosaRow } from "../repositories/ZonaPeligrosaRepository";

const readDangerZones = [
  authenticate,
  requirePermission("danger_zones.view", "danger_zones.edit"),
] as const;

const writeDangerZones = [authenticate, requirePermission("danger_zones.edit")] as const;

function severityLabelFromNivel(n: number): "high" | "critical" | "extreme" {
  if (n === 3) return "extreme";
  if (n === 2) return "critical";
  return "high";
}

function colorFromNivel(n: number): string {
  if (n === 3) return "#EF4444"; // extrema  -> rojo
  if (n === 2) return "#F97316"; // crítica  -> naranja
  return "#FACC15"; // alta    -> amarillo
}

function toApiShape(row: ZonaPeligrosaRow) {
  return {
    id: row.id,
    name: row.nombre,
    description: row.descripcion ?? "",
    geometry: row.geometria,
    severity: severityLabelFromNivel(row.nivel_severidad),
    protocol: row.protocolo_accion,
    color: colorFromNivel(row.nivel_severidad),
    is_active: row.activa,
    created_at: row.fecha_creacion
      ? new Date(row.fecha_creacion).toISOString()
      : new Date().toISOString(),
  };
}

interface CreateBody {
  nombre: string;
  descripcion?: string;
  geometria: GeoJSON.Polygon;
  nivel_severidad: 1 | 2 | 3;
  protocolo_accion: string;
}

export default async function zonasPeligrosasRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/",
    { preHandler: [...readDangerZones] },
    async (_req, reply) => {
    try {
      const rows = await zonaPeligrosaService.listAll();
      return reply.send({ success: true, data: rows.map(toApiShape) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  },
  );

  app.get(
    "/active",
    { preHandler: [...readDangerZones] },
    async (_req, reply) => {
    try {
      const rows = await zonaPeligrosaService.listActive();
      return reply.send({ success: true, data: rows.map(toApiShape) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  },
  );

  app.post<{ Body: CreateBody }>(
    "/",
    { preHandler: [...writeDangerZones] },
    async (req, reply) => {
    try {
      const {
        nombre,
        descripcion,
        geometria,
        nivel_severidad,
        protocolo_accion,
      } = req.body;
      if (!nombre?.trim() || !geometria || !nivel_severidad) {
        return reply.status(400).send({
          success: false,
          error: "nombre, geometria y nivel_severidad son obligatorios",
        });
      }
      const row = await zonaPeligrosaService.create({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() ?? "",
        geometria,
        nivel_severidad,
        protocolo_accion: protocolo_accion?.trim() || "",
      });
      return reply.status(201).send({ success: true, data: toApiShape(row) });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  },
  );

  app.put<{ Params: { id: string }; Body: Partial<CreateBody> }>(
    "/:id",
    { preHandler: [...writeDangerZones] },
    async (req, reply) => {
      try {
        const row = await zonaPeligrosaService.update(req.params.id, {
          nombre: req.body.nombre,
          descripcion: req.body.descripcion,
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

  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [...writeDangerZones] },
    async (req, reply) => {
    try {
      const ok = await zonaPeligrosaService.remove(req.params.id);
      if (!ok)
        return reply.status(404).send({ success: false, error: "No encontrada" });
      return reply.send({ success: true });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e.message });
    }
  },
  );
}
