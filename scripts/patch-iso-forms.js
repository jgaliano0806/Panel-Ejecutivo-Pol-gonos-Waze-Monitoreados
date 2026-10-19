#!/usr/bin/env node
/**
 * Añade sección "Uso del registro" a plantillas RP y mejora redacción de alcance en IP-001.
 */
const fs = require('fs');
const path = require('path');

const isoDir = path.join(__dirname, '..', 'docs', 'iso9001');

const RP_USAGE = {
  'RP-001_Registro_Monitoreo.md': 'Complete este formulario en cada turno de monitoreo para documentar la evidencia del indicador IP-01, conforme al instructivo IP-001.',
  'RP-002_Registro_Alertas.md': 'Registre cada alerta atendida durante el turno para calcular el indicador IP-02, conforme al instructivo IP-002.',
  'RP-003_Registro_Zonas_Peligrosas.md': 'Documente cada activación de zona peligrosa para verificar el indicador IP-03, conforme al instructivo IP-003.',
  'RP-004_Registro_Siniestros.md': 'Complete este formulario por cada siniestro vial registrado para validar el indicador IP-04, conforme al instructivo IP-004.',
  'RP-005_Registro_Consulta_Incidentes.md': 'Registre las consultas de incidentes realizadas durante el turno, conforme al instructivo IP-005.',
  'RP-006_Informe_Estadistico.md': 'Complete este informe al finalizar cada período de análisis estadístico, conforme al instructivo IP-006.',
  'RP-007_Registro_Cambios_Admin.md': 'Documente cada cambio administrativo aplicado al sistema, conforme al instructivo IP-007.',
  'RP-008_Registro_Usuarios.md': 'Registre cada alta, modificación o baja de usuario, conforme al instructivo IP-008.',
  'RP-009_Bitacora_Turno.md': 'Complete la bitácora al inicio y cierre de cada turno para verificar el indicador IP-05, conforme al instructivo IP-009.',
  'RP-010_Registro_No_Conformidades.md': 'Registre cada no conformidad operativa detectada para dar seguimiento al indicador IP-06, conforme al instructivo IP-010.',
};

for (const [file, text] of Object.entries(RP_USAGE)) {
  const filePath = path.join(isoDir, 'registros', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('## Uso del registro')) continue;
  const section = `\n## Uso del registro\n\n${text}\n`;
  content = content.replace(/\n---\n\n## Datos del registro/, `${section}\n---\n\n## Datos del registro`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Actualizado:', file);
}

const ip001 = path.join(isoDir, 'instructivos', 'IP-001_Monitoreo_Tiempo_Real.md');
let ip = fs.readFileSync(ip001, 'utf-8');
ip = ip.replace(
  'Ejecutar el monitoreo continuo del tráfico vehicular mediante el módulo Mapa, verificando que los datos Waze se actualicen en tiempo real.',
  'Este instructivo describe cómo ejecutar el monitoreo continuo del tráfico vehicular mediante el módulo Mapa y verificar que los datos Waze se actualicen en tiempo real.'
);
ip = ip.replace(
  'Turno operativo en sala de control. Módulo `/mapa`.',
  'Aplica al turno operativo en sala de control. El módulo de trabajo es `/mapa`.'
);
fs.writeFileSync(ip001, ip, 'utf-8');
console.log('Actualizado: IP-001');
