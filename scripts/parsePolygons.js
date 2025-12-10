const fs = require('fs');
const path = require('path');

// Leer archivo de polígonos
const input = fs.readFileSync(path.join(__dirname, '../poligonos_waze_66.txt'), 'utf-8');
const lines = input.trim().split('\n');

const polygons = [];

lines.forEach((line, index) => {
    const [name, wkt] = line.split(';');
    
    // Extraer coordenadas del WKT POLYGON ((x y, x y, ...))
    const coordsMatch = wkt.match(/POLYGON\s*\(\(([^)]+)\)\)/);
    if (!coordsMatch) {
        console.error(`Error parseando línea ${index + 1}: ${name}`);
        return;
    }
    
    const coordsStr = coordsMatch[1];
    const coordPairs = coordsStr.split(',').map(pair => pair.trim());
    
    const coordinates = coordPairs.map(pair => {
        const [lng, lat] = pair.split(/\s+/).map(Number);
        return [lng, lat];
    });
    
    // Generar ID único
    const id = `P${String(index + 1).padStart(3, '0')}`;
    
    polygons.push({
        id,
        name: name.trim(),
        coordinates
    });
});

// Generar archivo TypeScript
let tsContent = `import type { Polygon } from '../../types';
import { PolygonState } from '../../types';

/**
 * 66 Polígonos REALES de Córdoba con geometrías exactas
 * Generados desde datos oficiales de Waze
 */

export const realCordobaPolygons: Polygon[] = [
`;

polygons.forEach((poly, index) => {
    const coordsStr = JSON.stringify(poly.coordinates, null, 8)
        .replace(/\n/g, '\n        ');
    
    tsContent += `    {
        id: '${poly.id}',
        name: '${poly.name}',
        group: 'Sin Grupo', // Se actualizará desde el backend
        state: PolygonState.LOW,
        geometry: {
            type: 'Polygon',
            coordinates: [${coordsStr}],
        },
        metadata: {
            jurisdiction: 'Córdoba',
            priority: 1,
        },
    }${index < polygons.length - 1 ? ',' : ''}
`;
});

tsContent += `];
`;

// Escribir archivo
const outputPath = path.join(__dirname, '../src/data/mock/realCordobaPolygons.ts');
fs.writeFileSync(outputPath, tsContent, 'utf-8');

console.log(`✅ Archivo generado: ${outputPath}`);
console.log(`✅ ${polygons.length} polígonos procesados`);


