---
description: new-service Template para nuevo servicio backend
---


typescriptimport { logger } from '@packages/shared/utils';
import dbService from '../database/dbService';

class NombreService {
  constructor() {
    logger.info('NombreService initialized');
  }

  async metodoPublico(params: Tipo): Promise<Resultado> {
    try {
      // Validar inputs
      if (!params) throw new Error('Invalid params');

      // Lógica
      const result = await this.procesarDatos(params);

      logger.info('Operación exitosa', { params });
      return result;
    } catch (error) {
      logger.error('Error en NombreService', { error, params });
      throw error;
    }
  }

  private async procesarDatos(params: Tipo) {
    // Implementación
  }
}

export default new NombreService();
Reglas:

Singleton pattern
TypeScript strict (no any)
Try-catch en async
Logging estructurado
JSDoc en métodos públicos
Prepared statements si usa DB

