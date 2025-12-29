import { ConfigPolygon } from '../types';

/**
 * Configuración de Polígonos
 * Fuente de verdad para las áreas monitoreadas.
 */

const createRectPolygon = (
    id: string,
    name: string,
    group: string,
    centerLat: number,
    centerLng: number,
    size: number = 0.01
): ConfigPolygon => {
    const halfSize = size / 2;
    return {
        id,
        name,
        group,
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
    };
};

export const POLYGONS: ConfigPolygon[] = [
    // Zona Norte
    createRectPolygon('P001', 'Av. del Libertador - Tramo 1', 'Zona Norte', -34.560, -58.445, 0.012),
    createRectPolygon('P002', 'Av. del Libertador - Tramo 2', 'Zona Norte', -34.550, -58.440, 0.012),
    createRectPolygon('P003', 'Av. Cabildo - Norte', 'Zona Norte', -34.555, -58.455, 0.010),
    createRectPolygon('P004', 'Av. Cabildo - Sur', 'Zona Norte', -34.565, -58.460, 0.010),
    createRectPolygon('P005', 'Núñez - Centro', 'Zona Norte', -34.545, -58.465, 0.008),
    createRectPolygon('P006', 'Belgrano - Este', 'Zona Norte', -34.560, -58.450, 0.009),
    createRectPolygon('P007', 'Belgrano - Oeste', 'Zona Norte', -34.560, -58.470, 0.009),
    createRectPolygon('P008', 'Colegiales', 'Zona Norte', -34.570, -58.448, 0.008),
    createRectPolygon('P009', 'Palermo - Norte', 'Zona Norte', -34.575, -58.425, 0.011),
    createRectPolygon('P010', 'Recoleta - Norte', 'Zona Norte', -34.585, -58.395, 0.009),

    // Zona Centro
    createRectPolygon('P011', 'Av. 9 de Julio - Norte', 'Zona Centro', -34.595, -58.380, 0.015),
    createRectPolygon('P012', 'Av. 9 de Julio - Centro', 'Zona Centro', -34.605, -58.385, 0.015),
    createRectPolygon('P013', 'Av. 9 de Julio - Sur', 'Zona Centro', -34.615, -58.382, 0.015),
    createRectPolygon('P014', 'Microcentro - Este', 'Zona Centro', -34.602, -58.370, 0.010),
    createRectPolygon('P015', 'Microcentro - Oeste', 'Zona Centro', -34.602, -58.390, 0.010),
    createRectPolygon('P016', 'San Nicolás', 'Zona Centro', -34.607, -58.378, 0.008),
    createRectPolygon('P017', 'Monserrat', 'Zona Centro', -34.612, -58.375, 0.009),
    createRectPolygon('P018', 'Av. Corrientes - Oeste', 'Zona Centro', -34.604, -58.400, 0.012),
    createRectPolygon('P019', 'Av. Corrientes - Este', 'Zona Centro', -34.604, -58.372, 0.012),
    createRectPolygon('P020', 'Retiro', 'Zona Centro', -34.590, -58.375, 0.009),

    // Zona Sur
    createRectPolygon('P021', 'Av. Belgrano', 'Zona Sur', -34.612, -58.390, 0.013),
    createRectPolygon('P022', 'San Telmo', 'Zona Sur', -34.620, -58.373, 0.009),
    createRectPolygon('P023', 'La Boca - Norte', 'Zona Sur', -34.635, -58.365, 0.010),
    createRectPolygon('P024', 'Barracas', 'Zona Sur', -34.642, -58.380, 0.011),
    createRectPolygon('P025', 'Parque Patricios', 'Zona Sur', -34.638, -58.400, 0.010),
    createRectPolygon('P026', 'Boedo - Centro', 'Zona Sur', -34.633, -58.418, 0.009),
    createRectPolygon('P027', 'Almagro', 'Zona Sur', -34.610, -58.420, 0.010),
    createRectPolygon('P028', 'Caballito - Este', 'Zona Sur', -34.615, -58.430, 0.011),
    createRectPolygon('P029', 'Flores - Norte', 'Zona Sur', -34.628, -58.440, 0.010),
    createRectPolygon('P030', 'Av. Rivadavia - Oeste', 'Zona Sur', -34.620, -58.450, 0.014),

    // Corredores
    createRectPolygon('P031', 'Autopista 25 de Mayo - Tramo 1', 'Corredores', -34.630, -58.360, 0.020),
    createRectPolygon('P032', 'Autopista 25 de Mayo - Tramo 2', 'Corredores', -34.625, -58.390, 0.020),
    createRectPolygon('P033', 'Autopista Perito Moreno - Norte', 'Corredores', -34.595, -58.410, 0.018),
    createRectPolygon('P034', 'Autopista Perito Moreno - Sur', 'Corredores', -34.610, -58.410, 0.018),
    createRectPolygon('P035', 'Av. Gral. Paz - Tramo Norte', 'Corredores', -34.570, -58.490, 0.022),
    createRectPolygon('P036', 'Av. Gral. Paz - Tramo Oeste', 'Corredores', -34.600, -58.500, 0.022),
    createRectPolygon('P037', 'Av. Gral. Paz - Tramo Sur', 'Corredores', -34.630, -58.490, 0.022),
    createRectPolygon('P038', 'Autopista Lugones', 'Corredores', -34.555, -58.435, 0.016),
    createRectPolygon('P039', 'Av. Figueroa Alcorta', 'Corredores', -34.565, -58.420, 0.014),
    createRectPolygon('P040', 'Paseo Colón - Completo', 'Corredores', -34.615, -58.368, 0.016),
];
