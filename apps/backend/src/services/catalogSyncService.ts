import { dbService } from '../database/dbService';
import { repositories } from '../repositories';
import { toLegacyAlert } from '../utils';

export interface WazeIncidentType {
  type: string;
  subtype?: string;
  count: number;
  lastSeen: Date;
  severity?: number;
  description?: string;
}

export interface CatalogSyncResult {
  newTypes: number;
  updatedTypes: number;
  newSubtypes: number;
  updatedSubtypes: number;
  totalIncidents: number;
  processedPolygons: string[];
}

export class CatalogSyncService {
  /**
   * Sincroniza los catálogos desde los feeds activos de Waze
   */
  async syncFromWazeFeeds(): Promise<CatalogSyncResult> {
    console.log('🔄 Iniciando sincronización de catálogos desde feeds de Waze...');

    const result: CatalogSyncResult = {
      newTypes: 0,
      updatedTypes: 0,
      newSubtypes: 0,
      updatedSubtypes: 0,
      totalIncidents: 0,
      processedPolygons: []
    };

    try {
      // Obtener todos los incidentes activos de todos los feeds
      const alerts = await repositories().wazeAlerts.findAllActive();
      const allIncidents = alerts.map(toLegacyAlert);
      result.totalIncidents = allIncidents.length;

      console.log(`📊 Procesando ${allIncidents.length} incidentes de todos los feeds...`);

      // Agrupar por tipo y subtipo
      const typeMap = new Map<string, WazeIncidentType>();
      const processedPolygonIds = new Set<string>();

      for (const incident of allIncidents) {
        const type = incident.type || 'UNKNOWN';
        const subtype = incident.subtype || undefined;
        const polygonId = incident.polygonId;

        if (polygonId) {
          processedPolygonIds.add(polygonId);
        }

        const key = subtype ? `${type}:${subtype}` : type;

        if (!typeMap.has(key)) {
          typeMap.set(key, {
            type,
            subtype,
            count: 0,
            lastSeen: new Date(incident.timestamp || Date.now()),
            severity: incident.severity,
            description: incident.description
          });
        }

        const entry = typeMap.get(key)!;
        entry.count++;
        if (new Date(incident.timestamp || Date.now()) > entry.lastSeen) {
          entry.lastSeen = new Date(incident.timestamp || Date.now());
        }
      }

      result.processedPolygons = Array.from(processedPolygonIds);

      console.log(`📋 Encontrados ${typeMap.size} tipos/subtipos únicos en ${result.processedPolygons.length} polígonos`);

      // Procesar cada tipo encontrado
      for (const [key, incidentData] of typeMap.entries()) {
        await this.upsertIncidentType(incidentData, result);
      }

      console.log(`✅ Sincronización completada:`);
      console.log(`   - Nuevos tipos: ${result.newTypes}`);
      console.log(`   - Tipos actualizados: ${result.updatedTypes}`);
      console.log(`   - Nuevos subtipos: ${result.newSubtypes}`);
      console.log(`   - Subtipos actualizados: ${result.updatedSubtypes}`);

      return result;

    } catch (error) {
      console.error('❌ Error durante la sincronización de catálogos:', error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza un tipo de incidente
   */
  private async upsertIncidentType(incidentData: WazeIncidentType, result: CatalogSyncResult): Promise<void> {
    try {

      // Primero, verificar si el tipo ya existe
      const existingType = await dbService.query(
        'SELECT id, is_active FROM incident_types WHERE code = $1',
        [incidentData.type]
      );

      let typeId: number;

      if (existingType.rows.length === 0) {
        // Crear nuevo tipo
        const newType = await dbService.query(`
          INSERT INTO incident_types (code, name, description, icon, color, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          incidentData.type,
          this.getTypeDisplayName(incidentData.type),
          incidentData.description || this.getTypeDescription(incidentData.type),
          this.getTypeIcon(incidentData.type),
          this.getTypeColor(incidentData.type),
          true,
          new Date(),
          new Date()
        ]);

        typeId = newType.rows[0].id;
        result.newTypes++;
        console.log(`   ➕ Nuevo tipo: ${incidentData.type}`);

      } else {
        // Actualizar tipo existente (solo campos que pueden cambiar)
        typeId = existingType.rows[0].id;

        // Si estaba inactivo y ahora vemos incidentes, reactivarlo
        if (!existingType.rows[0].is_active) {
          await dbService.query(
            'UPDATE incident_types SET is_active = true, updated_at = $1 WHERE id = $2',
            [new Date(), typeId]
          );
          console.log(`   🔄 Tipo reactivado: ${incidentData.type}`);
        } else {
          await dbService.query(
            'UPDATE incident_types SET updated_at = $1 WHERE id = $2',
            [new Date(), typeId]
          );
        }

        result.updatedTypes++;
      }

      // Si hay subtipo, procesarlo
      if (incidentData.subtype) {
        await this.upsertIncidentSubtype(typeId, incidentData, result);
      }

    } catch (error) {
      console.error(`❌ Error procesando tipo ${incidentData.type}:`, error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza un subtipo de incidente
   */
  private async upsertIncidentSubtype(typeId: number, incidentData: WazeIncidentType, result: CatalogSyncResult): Promise<void> {
    try {
      const existingSubtype = await dbService.query(
        'SELECT id, is_active FROM incident_subtypes WHERE type_id = $1 AND code = $2',
        [typeId, incidentData.subtype]
      );

      if (existingSubtype.rows.length === 0) {
        // Crear nuevo subtipo
        await dbService.query(`
          INSERT INTO incident_subtypes (type_id, code, name, description, severity, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          typeId,
          incidentData.subtype,
          this.getSubtypeDisplayName(incidentData.subtype!),
          incidentData.description || this.getSubtypeDescription(incidentData.subtype!),
          this.getSubtypeSeverity(incidentData.subtype!, incidentData.severity),
          true,
          new Date(),
          new Date()
        ]);

        result.newSubtypes++;
        console.log(`     ➕ Nuevo subtipo: ${incidentData.subtype}`);

      } else {
        // Actualizar subtipo existente
        const subtypeId = existingSubtype.rows[0].id;

        // Si estaba inactivo y ahora vemos incidentes, reactivarlo
        if (!existingSubtype.rows[0].is_active) {
          await dbService.query(
            'UPDATE incident_subtypes SET is_active = true, updated_at = $1 WHERE id = $2',
            [new Date(), subtypeId]
          );
          console.log(`     🔄 Subtipo reactivado: ${incidentData.subtype}`);
        } else {
          await dbService.query(
            'UPDATE incident_subtypes SET updated_at = $1 WHERE id = $2',
            [new Date(), subtypeId]
          );
        }

        result.updatedSubtypes++;
      }

    } catch (error) {
      console.error(`❌ Error procesando subtipo ${incidentData.subtype}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el nombre para mostrar de un tipo
   */
  private getTypeDisplayName(typeCode: string): string {
    const typeNames: Record<string, string> = {
      'ACCIDENT': 'Accidente Vial',
      'JAM': 'Congestión de Tránsito',
      'HAZARD': 'Peligro en la Vía',
      'WEATHERHAZARD': 'Peligro Meteorológico',
      'ROAD_CLOSED': 'Camino Cerrado',
      'ROAD_CLOSED_EVENT': 'Evento - Camino Cerrado',
      'CONSTRUCTION': 'Obras en la Vía',
      'POTHHOLE': 'Bache',
      'HAZARD_ON_ROAD': 'Peligro en Calzada',
      'HAZARD_ON_SHOULDER': 'Peligro en Banquina',
      'HAZARD_WEATHER': 'Condiciones Climáticas Adversas'
    };

    return typeNames[typeCode] || typeCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Obtiene la descripción de un tipo
   */
  private getTypeDescription(typeCode: string): string {
    const descriptions: Record<string, string> = {
      'ACCIDENT': 'Incidentes relacionados con accidentes de tránsito',
      'JAM': 'Tráfico congestionado y lentitud en las vías',
      'HAZARD': 'Situaciones peligrosas en la vía que requieren atención',
      'WEATHERHAZARD': 'Condiciones climáticas que afectan la seguridad vial',
      'ROAD_CLOSED': 'Cierres totales o parciales de caminos',
      'ROAD_CLOSED_EVENT': 'Eventos que causan el cierre de caminos',
      'CONSTRUCTION': 'Trabajos de construcción y mantenimiento vial',
      'POTHHOLE': 'Baches y deterioros en el pavimento',
      'HAZARD_ON_ROAD': 'Peligros presentes en la calzada',
      'HAZARD_ON_SHOULDER': 'Peligros en la banquina o arcén',
      'HAZARD_WEATHER': 'Condiciones meteorológicas peligrosas'
    };

    return descriptions[typeCode] || `Incidentes de tipo ${typeCode}`;
  }

  /**
   * Obtiene el icono para un tipo
   */
  private getTypeIcon(typeCode: string): string {
    const icons: Record<string, string> = {
      'ACCIDENT': 'car',
      'JAM': 'alert-triangle',
      'HAZARD': 'alert-triangle',
      'WEATHERHAZARD': 'cloud',
      'ROAD_CLOSED': 'x-octagon',
      'ROAD_CLOSED_EVENT': 'calendar-x',
      'CONSTRUCTION': 'wrench',
      'POTHHOLE': 'circle-dot',
      'HAZARD_ON_ROAD': 'triangle-alert',
      'HAZARD_ON_SHOULDER': 'triangle-alert',
      'HAZARD_WEATHER': 'cloud-rain'
    };

    return icons[typeCode] || 'alert-triangle';
  }

  /**
   * Obtiene el color para un tipo
   */
  private getTypeColor(typeCode: string): string {
    const colors: Record<string, string> = {
      'ACCIDENT': '#ef4444',
      'JAM': '#f59e0b',
      'HAZARD': '#dc2626',
      'WEATHERHAZARD': '#06b6d4',
      'ROAD_CLOSED': '#b91c1c',
      'ROAD_CLOSED_EVENT': '#991b1b',
      'CONSTRUCTION': '#8b5cf6',
      'POTHHOLE': '#6b7280',
      'HAZARD_ON_ROAD': '#dc2626',
      'HAZARD_ON_SHOULDER': '#ea580c',
      'HAZARD_WEATHER': '#0891b2'
    };

    return colors[typeCode] || '#6b7280';
  }

  /**
   * Obtiene el nombre para mostrar de un subtipo
   */
  private getSubtypeDisplayName(subtypeCode: string): string {
    const subtypeNames: Record<string, string> = {
      'ACCIDENT_MINOR': 'Accidente Menor',
      'ACCIDENT_MAJOR': 'Accidente Grave',
      'ACCIDENT_BLOCKING': 'Accidente Bloqueante',
      'JAM_MODERATE': 'Congestión Moderada',
      'JAM_HEAVY': 'Congestión Pesada',
      'JAM_STANDSTILL': 'Tráfico Detenido',
      'HAZARD_ON_ROAD': 'En la Calzada',
      'HAZARD_ON_SHOULDER': 'En la Banquina',
      'HAZARD_WEATHER': 'Condiciones Climáticas',
      'ROAD_CLOSED_CONSTRUCTION': 'Por Obras',
      'ROAD_CLOSED_EVENT': 'Por Evento',
      'ROAD_CLOSED_HAZARD': 'Por Peligro',
      'CONSTRUCTION': 'Obras',
      'POTHHOLE': 'Bache',
      'WEATHERHAZARD': 'Peligro Meteorológico'
    };

    return subtypeNames[subtypeCode] || subtypeCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Obtiene la descripción de un subtipo
   */
  private getSubtypeDescription(subtypeCode: string): string {
    const descriptions: Record<string, string> = {
      'ACCIDENT_MINOR': 'Accidente con daños menores, sin heridos graves',
      'ACCIDENT_MAJOR': 'Accidente con heridos graves o víctimas fatales',
      'ACCIDENT_BLOCKING': 'Accidente que bloquea completamente la vía',
      'JAM_MODERATE': 'Tráfico lento pero aún fluido',
      'JAM_HEAVY': 'Tráfico muy lento y congestionado',
      'JAM_STANDSTILL': 'Tráfico completamente detenido',
      'HAZARD_ON_ROAD': 'Peligro presente en la calzada principal',
      'HAZARD_ON_SHOULDER': 'Peligro localizado en la banquina',
      'HAZARD_WEATHER': 'Condiciones climáticas que representan un riesgo',
      'ROAD_CLOSED_CONSTRUCTION': 'Cierre por trabajos de construcción',
      'ROAD_CLOSED_EVENT': 'Cierre por eventos especiales',
      'ROAD_CLOSED_HAZARD': 'Cierre por situaciones de peligro',
      'CONSTRUCTION': 'Trabajos de construcción activos',
      'POTHHOLE': 'Baches o deterioros en el pavimento',
      'WEATHERHAZARD': 'Condiciones meteorológicas peligrosas'
    };

    return descriptions[subtypeCode] || `Subtipo ${subtypeCode}`;
  }

  /**
   * Obtiene la severidad de un subtipo
   */
  private getSubtypeSeverity(subtypeCode: string, defaultSeverity?: number): string {
    const severityMap: Record<string, string> = {
      'ACCIDENT_MINOR': 'MEDIUM',
      'ACCIDENT_MAJOR': 'HIGH',
      'ACCIDENT_BLOCKING': 'CRITICAL',
      'JAM_MODERATE': 'LOW',
      'JAM_HEAVY': 'MEDIUM',
      'JAM_STANDSTILL': 'HIGH',
      'HAZARD_ON_ROAD': 'HIGH',
      'HAZARD_ON_SHOULDER': 'MEDIUM',
      'HAZARD_WEATHER': 'HIGH',
      'ROAD_CLOSED_CONSTRUCTION': 'MEDIUM',
      'ROAD_CLOSED_EVENT': 'HIGH',
      'ROAD_CLOSED_HAZARD': 'CRITICAL',
      'CONSTRUCTION': 'MEDIUM',
      'POTHHOLE': 'LOW',
      'WEATHERHAZARD': 'MEDIUM'
    };

    return severityMap[subtypeCode] || (defaultSeverity ? this.mapSeverityNumber(defaultSeverity) : 'MEDIUM');
  }

  /**
   * Mapea número de severidad a string
   */
  private mapSeverityNumber(severity: number): string {
    if (severity >= 4) return 'CRITICAL';
    if (severity >= 3) return 'HIGH';
    if (severity >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Obtiene todos los tipos de incidentes con sus subtipos
   */
  async getAllIncidentTypes(): Promise<any[]> {
    try {
      const query = `
        SELECT
          t.id, t.code, t.name, t.description, t.icon, t.color, t.is_active as type_active,
          json_agg(
            json_build_object(
              'id', s.id,
              'code', s.code,
              'name', s.name,
              'description', s.description,
              'severity', s.severity,
              'is_active', s.is_active
            )
          ) FILTER (WHERE s.id IS NOT NULL) as subtypes
        FROM incident_types t
        LEFT JOIN incident_subtypes s ON t.id = s.type_id
        GROUP BY t.id, t.code, t.name, t.description, t.icon, t.color, t.is_active
        ORDER BY t.name
      `;

      const result = await dbService.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo tipos de incidentes:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de uso de tipos y subtipos
   */
  async getCatalogUsageStats(): Promise<any> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_incidents,
          COUNT(DISTINCT type) as unique_types,
          COUNT(DISTINCT CONCAT(type, ':', subtype)) as unique_subtypes,
          json_object_agg(
            type,
            json_build_object(
              'count', COUNT(*),
              'subtypes', json_object_agg(
                COALESCE(subtype, 'NO_SUBTYPE'),
                COUNT(*)
              ) FILTER (WHERE subtype IS NOT NULL)
            )
          ) as type_breakdown
        FROM incidents_history
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const result = await dbService.query(query);
      return result.rows[0] || {
        total_incidents: 0,
        unique_types: 0,
        unique_subtypes: 0,
        type_breakdown: {}
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de catálogo:', error);
      return {
        total_incidents: 0,
        unique_types: 0,
        unique_subtypes: 0,
        type_breakdown: {}
      };
    }
  }
}

// Exportar instancia singleton
export const catalogSyncService = new CatalogSyncService();
