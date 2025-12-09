import type { Polygon } from '../../types';
import { PolygonState } from '../../types';

/**
 * 66 Polígonos REALES de Córdoba
 * Con geometrías placeholder centradas en Córdoba, Argentina
 * Lat: -31.4, Lng: -64.2 (centro aproximado)
 */

// Helper para crear un polígono rectangular
const createCbaPolygon = (
    id: string,
    name: string,
    centerLat: number,
    centerLng: number,
    size: number = 0.015
): Polygon => {
    const halfSize = size / 2;
    return {
        id,
        name,
        group: 'Sin Grupo', // Se actualizará desde el backend
        state: PolygonState.LOW,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [centerLng - halfSize, centerLat - halfSize],
                [centerLng + halfSize, centerLat - halfSize],
                [centerLng + halfSize, centerLat + halfSize],
                [centerLng - halfSize, centerLat + halfSize],
                [centerLng - halfSize, centerLat - halfSize],
            ]],
        },
        metadata: {
            jurisdiction: 'Córdoba',
            priority: 1,
        },
    };
};

// Distribuir 66 polígonos en una cuadrícula alrededor de Córdoba
const BASE_LAT = -31.4;
const BASE_LNG = -64.2;
const SPACING = 0.03;

export const realCordobaPolygons: Polygon[] = [
    // Fila 1 (11 polígonos)
    createCbaPolygon('P001', 'A-019 -8', BASE_LAT, BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P002', 'A-019 -2', BASE_LAT, BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P003', 'RP E53 -2', BASE_LAT, BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P004', 'RP E55 -2', BASE_LAT, BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P005', 'RP E55 -1', BASE_LAT, BASE_LNG - SPACING),
    createCbaPolygon('P006', 'R36 T6 -1', BASE_LAT, BASE_LNG),
    createCbaPolygon('P007', 'RP C45 -2', BASE_LAT, BASE_LNG + SPACING),
    createCbaPolygon('P008', 'RP C45 -1', BASE_LAT, BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P009', 'R36 T9 -1', BASE_LAT, BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P010', 'R36 T4 -1', BASE_LAT, BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P011', 'R36 T3 -1', BASE_LAT, BASE_LNG + (SPACING * 5)),

    // Fila 2 (11 polígonos)
    createCbaPolygon('P012', 'R36 T1 -1', BASE_LAT - SPACING, BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P013', 'R20-38 T1 -1', BASE_LAT - SPACING, BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P014', 'R.Alt38 - 3 -1', BASE_LAT - SPACING, BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P015', 'R.Alt. 38 -1', BASE_LAT - SPACING, BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P016', 'RP 5 -2', BASE_LAT - SPACING, BASE_LNG - SPACING),
    createCbaPolygon('P017', 'RP 5 -1', BASE_LAT - SPACING, BASE_LNG),
    createCbaPolygon('P018', 'Vte. Anisacate RP 5 -2', BASE_LAT - SPACING, BASE_LNG + SPACING),
    createCbaPolygon('P019', 'Vte Anisacate RP 5 -1', BASE_LAT - SPACING, BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P020', 'RP E55 -5', BASE_LAT - SPACING, BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P021', 'RP E55 -4', BASE_LAT - SPACING, BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P022', 'RP E55 -3', BASE_LAT - SPACING, BASE_LNG + (SPACING * 5)),

    // Fila 3 (11 polígonos)
    createCbaPolygon('P023', 'R36 T8', BASE_LAT - (SPACING * 2), BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P024', 'R36 T7', BASE_LAT - (SPACING * 2), BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P025', 'R36 T5', BASE_LAT - (SPACING * 2), BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P026', 'R36 - Vte Espinillo', BASE_LAT - (SPACING * 2), BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P027', 'R20-38 T4', BASE_LAT - (SPACING * 2), BASE_LNG - SPACING),
    createCbaPolygon('P028', 'RN 9 S -2', BASE_LAT - (SPACING * 2), BASE_LNG),
    createCbaPolygon('P029', 'RN 9 S -1', BASE_LAT - (SPACING * 2), BASE_LNG + SPACING),
    createCbaPolygon('P030', 'R20-38 T3', BASE_LAT - (SPACING * 2), BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P031', 'R36 V.SAN AGUSTIN', BASE_LAT - (SPACING * 2), BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P032', 'R36 V.LOS CONDORES', BASE_LAT - (SPACING * 2), BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P033', 'R36 V.ELENA', BASE_LAT - (SPACING * 2), BASE_LNG + (SPACING * 5)),

    // Fila 4 (11 polígonos)
    createCbaPolygon('P034', 'R36 V.DESPEÑADEROS', BASE_LAT - (SPACING * 3), BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P035', 'R36 T2', BASE_LAT - (SPACING * 3), BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P036', 'R20-38 T2', BASE_LAT - (SPACING * 3), BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P037', 'R36 T10', BASE_LAT - (SPACING * 3), BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P038', 'R36 V. ALCIRA GIGENA', BASE_LAT - (SPACING * 3), BASE_LNG - SPACING),
    createCbaPolygon('P039', 'R36 V. DESPEÑADEROS', BASE_LAT - (SPACING * 3), BASE_LNG),
    createCbaPolygon('P040', 'R36 V. Elena -2', BASE_LAT - (SPACING * 3), BASE_LNG + SPACING),
    createCbaPolygon('P041', 'R36 V. LAS BAJADAS', BASE_LAT - (SPACING * 3), BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P042', 'R36 V.BAIGORRIA', BASE_LAT - (SPACING * 3), BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P043', 'R36 V.ALMAFUERTE', BASE_LAT - (SPACING * 3), BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P044', 'R19 - Vte. Montecristo', BASE_LAT - (SPACING * 3), BASE_LNG + (SPACING * 5)),

    // Fila 5 (11 polígonos)
    createCbaPolygon('P045', 'R19 - Vte.Piquillin', BASE_LAT - (SPACING * 4), BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P046', 'R19 - Vte km 619', BASE_LAT - (SPACING * 4), BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P047', 'APC', BASE_LAT - (SPACING * 4), BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P048', 'R9N - Vte. Gral Paz', BASE_LAT - (SPACING * 4), BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P049', 'R.Alt. 38 -2', BASE_LAT - (SPACING * 4), BASE_LNG - SPACING),
    createCbaPolygon('P050', 'RP E53 -1', BASE_LAT - (SPACING * 4), BASE_LNG),
    createCbaPolygon('P051', 'RN 9 N -4', BASE_LAT - (SPACING * 4), BASE_LNG + SPACING),
    createCbaPolygon('P052', 'RN 9 N -3', BASE_LAT - (SPACING * 4), BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P053', 'RN 9 N -2', BASE_LAT - (SPACING * 4), BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P054', 'Avda P. Luchesse -1', BASE_LAT - (SPACING * 4), BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P055', 'R19', BASE_LAT - (SPACING * 4), BASE_LNG + (SPACING * 5)),

    // Fila 6 (11 polígonos)
    createCbaPolygon('P056', 'A - 019 -7', BASE_LAT - (SPACING * 5), BASE_LNG - (SPACING * 5)),
    createCbaPolygon('P057', 'A-019 -6', BASE_LAT - (SPACING * 5), BASE_LNG - (SPACING * 4)),
    createCbaPolygon('P058', 'A-019 -5', BASE_LAT - (SPACING * 5), BASE_LNG - (SPACING * 3)),
    createCbaPolygon('P059', '2do Anillo ACV 1', BASE_LAT - (SPACING * 5), BASE_LNG - (SPACING * 2)),
    createCbaPolygon('P060', 'A-019 -3', BASE_LAT - (SPACING * 5), BASE_LNG - SPACING),
    createCbaPolygon('P061', 'Avda P. Luchesse -2', BASE_LAT - (SPACING * 5), BASE_LNG),
    createCbaPolygon('P062', 'AJC', BASE_LAT - (SPACING * 5), BASE_LNG + SPACING),
    createCbaPolygon('P063', 'A-019 -4', BASE_LAT - (SPACING * 5), BASE_LNG + (SPACING * 2)),
    createCbaPolygon('P064', 'A-019 -1', BASE_LAT - (SPACING * 5), BASE_LNG + (SPACING * 3)),
    createCbaPolygon('P065', '2do Anillo ACV 2', BASE_LAT - (SPACING * 5), BASE_LNG + (SPACING * 4)),
    createCbaPolygon('P066', 'RN 9 N -1', BASE_LAT - (SPACING * 5), BASE_LNG + (SPACING * 5)),
];

// Helper para obtener polígono por ID
export const getPolygonById = (id: string): Polygon | undefined => {
    return realCordobaPolygons.find(p => p.id === id);
};

// Helper para obtener polígonos por grupo
export const getPolygonsByGroup = (group: string): Polygon[] => {
    return realCordobaPolygons.filter(p => p.group === group);
};

// Lista de grupos únicos (se actualizará dinámicamente desde el backend)
export const polygonGroups = ['Sin Grupo'];
