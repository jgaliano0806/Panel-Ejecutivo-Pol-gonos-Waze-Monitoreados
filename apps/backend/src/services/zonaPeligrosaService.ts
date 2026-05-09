import { repositories } from "../repositories";
import { invalidateZonasPeligrosasCache } from "./wazeService";
import { logger } from "../utils/logger";
import type { ZonaPeligrosaRow } from "../repositories/ZonaPeligrosaRepository";

export interface ZonaPeligrosaCreateInput {
  nombre: string;
  descripcion?: string;
  geometria: GeoJSON.Polygon;
  /** 1 = alta, 2 = crítica, 3 = extrema */
  nivel_severidad: 1 | 2 | 3;
  protocolo_accion: string;
}

class ZonaPeligrosaService {
  private static instance: ZonaPeligrosaService;

  static getInstance(): ZonaPeligrosaService {
    if (!ZonaPeligrosaService.instance) {
      ZonaPeligrosaService.instance = new ZonaPeligrosaService();
    }
    return ZonaPeligrosaService.instance;
  }

  async listAll(): Promise<ZonaPeligrosaRow[]> {
    try {
      return await repositories().zonasPeligrosas.findAll();
    } catch (error) {
      if (error instanceof Error && error.message.includes("does not exist")) {
        logger.warn(
          "Tabla zonas_peligrosas no existe; retornando []. Ejecutar migraciones.",
        );
        return [];
      }
      throw error;
    }
  }

  async listActive(): Promise<ZonaPeligrosaRow[]> {
    try {
      return await repositories().zonasPeligrosas.findActive();
    } catch (error) {
      if (error instanceof Error && error.message.includes("does not exist")) {
        logger.warn(
          "Tabla zonas_peligrosas no existe; retornando []. Ejecutar migraciones.",
        );
        return [];
      }
      throw error;
    }
  }

  async create(input: ZonaPeligrosaCreateInput): Promise<ZonaPeligrosaRow> {
    const row = await repositories().zonasPeligrosas.create({
      nombre: input.nombre,
      descripcion: (input.descripcion ?? "").trim(),
      geometria: input.geometria as any,
      nivel_severidad: input.nivel_severidad,
      protocolo_accion: input.protocolo_accion,
      activa: true,
    } as any);
    invalidateZonasPeligrosasCache();
    logger.info(`Zona peligrosa RAC creada: ${input.nombre}`);
    return row;
  }

  async update(
    id: string,
    input: Partial<ZonaPeligrosaCreateInput>,
  ): Promise<ZonaPeligrosaRow | null> {
    const patch: Record<string, unknown> = {};
    if (input.nombre !== undefined) patch.nombre = input.nombre;
    if (input.descripcion !== undefined) {
      patch.descripcion =
        typeof input.descripcion === "string"
          ? input.descripcion.trim()
          : String(input.descripcion ?? "");
    }
    if (input.geometria !== undefined) patch.geometria = input.geometria;
    if (input.nivel_severidad !== undefined)
      patch.nivel_severidad = input.nivel_severidad;
    if (input.protocolo_accion !== undefined)
      patch.protocolo_accion = input.protocolo_accion;
    const row = await repositories().zonasPeligrosas.update(id, patch as any);
    if (row) invalidateZonasPeligrosasCache();
    return row;
  }

  async remove(id: string): Promise<boolean> {
    const ok = await repositories().zonasPeligrosas.delete(id);
    if (ok) invalidateZonasPeligrosasCache();
    return ok;
  }
}

export const zonaPeligrosaService = ZonaPeligrosaService.getInstance();
