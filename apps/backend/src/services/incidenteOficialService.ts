import { dbService as db } from "../database/dbService";

export interface IncidenteOficial {
  id?: number;
  creador_id: number;
  estado_workflow: "Borrador" | "Enviado_A_Base" | "Validado_Base" | "Rechazado" | "Archivado";
  gravedad?: number;
  codigo_situacion?: string;
  ruta?: string;
  kilometro?: number;
  ubicacion_absoluta?: any; // GeoJSON or string Point
  lat?: number;
  lng?: number;
  hay_lesionados: boolean;
  hay_obitos: boolean;
  observaciones?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class IncidenteOficialService {
  /**
   * Crea un Siniestro/Novedad originado usualmente en TERRENO (App Móvil) o Panel.
   * Empieza siempre en "Borrador" o "Enviado_A_Base".
   */
  async createIncidente(data: IncidenteOficial, userId: number): Promise<IncidenteOficial> {
    const lat = data.lat;
    const lng = data.lng;
    
    // PostGIS Point Constructor (lng, lat)
    const geomStr = lat && lng ? `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` : 'NULL';

    const insertQuery = `
      INSERT INTO incidente_oficial (
        creador_id, estado_workflow, gravedad, codigo_situacion,
        ruta, kilometro, ubicacion_absoluta, hay_lesionados, hay_obitos, observaciones
      ) VALUES (
        $1, $2, $3, $4, $5, $6, ${geomStr}, $7, $8, $9
      ) RETURNING *;
    `;

    const values = [
      data.creador_id || userId,
      data.estado_workflow || 'Borrador',
      data.gravedad || null,
      data.codigo_situacion || null,
      data.ruta || null,
      data.kilometro || null,
      data.hay_lesionados ? true : false,
      data.hay_obitos ? true : false,
      data.observaciones || null
    ];

    const result = await db.query<IncidenteOficial & { id: number }>(insertQuery, values);
    const incidente = result.rows[0];

    // Grabar en bitácora
    await this.logBitacora(incidente.id, userId, null, incidente.estado_workflow, 'Creación inicial del Incidente');

    return incidente;
  }

  /**
   * MOTOR DE MÁQUINA DE ESTADOS
   * Ejecuta transiciones válidas y seguras entre estados operativos
   */
  async transitionState(incidenteId: number, validadorId: number, nuevoEstado: string, justificacion: string) {
    // 1. Obtener estado actual
    const readQuery = `SELECT estado_workflow FROM incidente_oficial WHERE id = $1`;
    const readResult = await db.query<{ estado_workflow: string }>(readQuery, [incidenteId]);
    if (readResult.rows.length === 0) throw new Error("Incidente no encontrado");

    const estadoAnterior = readResult.rows[0].estado_workflow;

    // 2. Validar Transiciones (Reglas de Negocio)
    const validTransitions: Record<string, string[]> = {
      'Borrador': ['Enviado_A_Base'], // El inspector termina de cargar y lo sube
      'Enviado_A_Base': ['Validado_Base', 'Rechazado'], // El operador aprueba o devuelve
      'Rechazado': ['Borrador', 'Enviado_A_Base'], // El inspector corrige
      'Validado_Base': ['Archivado'], // Termina el peritaje 
      'Archivado': [] // Estado Terminal
    };

    if (!validTransitions[estadoAnterior]?.includes(nuevoEstado)) {
      throw new Error(`Transición ilegal de flujo: No se puede pasar de [${estadoAnterior}] a [${nuevoEstado}]`);
    }

    // 3. Ejecutar Transición Atómica (Actualizar e Insertar Log)
    const updateQuery = `
      UPDATE incidente_oficial 
      SET estado_workflow = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING *;
    `;
    const save = await db.query<IncidenteOficial & { id: number }>(updateQuery, [nuevoEstado, incidenteId]);

    // 4. Inmutabilidad: Log hacia el "Libro de Actas Digital"
    await this.logBitacora(incidenteId, validadorId, estadoAnterior, nuevoEstado, justificacion);

    return save.rows[0];
  }

  /**
   * Graba en el libro de actas inmutable
   */
  private async logBitacora(incidenteId: number, userId: number, estadoAnterior: string | null, estadoNuevo: string, justificacion: string) {
    const logQuery = `
      INSERT INTO bitacora_estados (incidente_id, validador_id, estado_anterior, estado_nuevo, justificacion)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await db.query(logQuery, [incidenteId, userId, estadoAnterior, estadoNuevo, justificacion]);
  }

  /**
   * Obtener incidentes activos (Live Dashboard)
   */
  async getActiveIncidents() {
    const q = `
      SELECT *, ST_X(ubicacion_absoluta) as lng, ST_Y(ubicacion_absoluta) as lat 
      FROM incidente_oficial
      WHERE estado_workflow NOT IN ('Archivado', 'Rechazado')
      ORDER BY updated_at DESC;
    `;
    const res = await db.query<IncidenteOficial & { id: number; lat: number; lng: number }>(q);
    return res.rows;
  }
}

export const incidenteOficialService = new IncidenteOficialService();
