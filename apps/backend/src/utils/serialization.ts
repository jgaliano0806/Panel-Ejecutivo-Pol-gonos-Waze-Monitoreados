/**
 * Funciones de utilidad para serialización de respuestas
 * Maneja conversión de fechas y objetos complejos para JSON
 */

// Serializa objetos Date a strings ISO para evitar errores de serialización JSON
export function serializeDate(date: Date | undefined | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Serializa un array de alertas convirtiendo Date a ISO string
export function serializeAlerts(alerts: any[]): any[] {
  return alerts.map((alert) => serializeObject(alert));
}

// Serializa un array de jams convirtiendo Date a ISO string
export function serializeJams(jams: any[]): any[] {
  return jams.map((jam) => serializeObject(jam));
}

// Serializa cualquier objeto recursivamente convirtiendo Date a ISO string
export function serializeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObject(item));
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = serializeObject(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
