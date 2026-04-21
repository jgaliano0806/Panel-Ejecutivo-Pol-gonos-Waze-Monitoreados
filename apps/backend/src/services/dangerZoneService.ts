import { DangerZone, DangerZoneCreateInput, DangerZoneUpdateInput } from "@panel-waze/types";
import { repositories } from "../repositories";
import { logger } from "../utils/logger";

class DangerZoneService {
  private static instance: DangerZoneService;

  public static getInstance(): DangerZoneService {
    if (!DangerZoneService.instance) {
      DangerZoneService.instance = new DangerZoneService();
    }
    return DangerZoneService.instance;
  }

  async getActiveZones(): Promise<DangerZone[]> {
    return repositories().dangerZones.findActive();
  }

  async getAllZones(): Promise<DangerZone[]> {
    return repositories().dangerZones.findAllZones();
  }

  async getById(id: string): Promise<DangerZone | null> {
    const entity = await repositories().dangerZones.findById(id);
    return entity as unknown as DangerZone | null;
  }

  async create(input: DangerZoneCreateInput, createdBy?: string): Promise<DangerZone> {
    const entity = await repositories().dangerZones.create({
      name: input.name,
      description: input.description,
      geometry: input.geometry as any,
      severity: input.severity,
      protocol: input.protocol,
      color: input.color || "#ef4444",
      is_active: true,
      created_by: createdBy,
    } as any);
    logger.info(`Zona peligrosa creada: ${input.name}`);
    return entity as unknown as DangerZone;
  }

  async update(id: string, input: DangerZoneUpdateInput): Promise<DangerZone | null> {
    const entity = await repositories().dangerZones.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.geometry !== undefined && { geometry: input.geometry as any }),
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.protocol !== undefined && { protocol: input.protocol }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.is_active !== undefined && { is_active: input.is_active }),
    } as any);
    return entity as unknown as DangerZone | null;
  }

  async remove(id: string): Promise<boolean> {
    return repositories().dangerZones.delete(id);
  }
}

export const dangerZoneService = DangerZoneService.getInstance();
