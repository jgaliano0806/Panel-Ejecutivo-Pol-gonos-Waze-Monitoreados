/**
 * Configuración REAL de Polígonos de Waze
 * 67 Managed Areas con sus URLs individuales del feed
 */

export interface RealPolygonConfig {
    id: string;
    name: string;
    feedUrl: string;
    group?: string; // Se puede categorizar después
}

// Función helper para asignar grupos automáticamente según el nombre
const getGroupFromName = (name: string): string => {
    if (name.startsWith('A-019') || name.startsWith('A - 019')) return 'Autovía A-019';
    if (name.includes('RP E53')) return 'Ruta Provincial E53';
    if (name.includes('RP E55')) return 'Ruta Provincial E55';
    if (name.includes('RP C45')) return 'Ruta Provincial C45';
    if (name.includes('RP 5')) return 'Ruta Provincial 5';
    if (name.startsWith('R36')) return 'Ruta Nacional 36';
    if (name.startsWith('RN 9') || name.startsWith('R9')) return 'Ruta Nacional 9';
    if (name.startsWith('R20-38') || name.includes('R.Alt')) return 'Ruta 20-38 y Alt. 38';
    if (name.startsWith('R19')) return 'Ruta Nacional 19';
    if (name.includes('Anillo ACV') || name === 'AJC' || name === 'APC') return 'Área Capital';
    if (name.includes('Avda') || name.includes('Luchesse')) return 'Avenidas Urbanas';
    return 'Otros';
};

export const REAL_POLYGONS: RealPolygonConfig[] = [
    { id: 'P001', name: 'A-019 -8', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9d7b4de5-3e05-4416-b6f0-7608008c797c?format=1', group: 'Autovía A-019' },
    { id: 'P002', name: 'A-019 -2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/264880ba-9904-4a52-ad4d-68a4950418be?format=1', group: 'Autovía A-019' },
    { id: 'P003', name: 'RP E53 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3910cd09-6cd1-48c8-be1b-efb72c1dcbf1?format=1', group: 'Ruta Provincial E53' },
    { id: 'P004', name: 'RP E55 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a2186079-912b-4dff-9d0c-fcdb79d90f21?format=1', group: 'Ruta Provincial E55' },
    { id: 'P005', name: 'RP E55 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/440305f8-a795-4146-ae7f-66ad38ba0e73?format=1', group: 'Ruta Provincial E55' },
    { id: 'P006', name: 'R36 T6-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/be61257d-44f3-46bf-85eb-a0d1dd0a8473?format=1', group: 'Ruta Nacional 36' },
    { id: 'P007', name: 'RP C45 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3f96457d-6841-41a7-a00a-0a3b27775010?format=1', group: 'Ruta Provincial C45' },
    { id: 'P008', name: 'RP C45 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/861be2f3-41ad-4ca8-93f0-57de70990073?format=1', group: 'Ruta Provincial C45' },
    { id: 'P009', name: 'R36 T9 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/8bc157a8-5112-4220-bd06-284d50343851?format=1', group: 'Ruta Nacional 36' },
    { id: 'P010', name: 'R36 T4-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d9e47daa-91ed-41c4-8946-1a4030368da6?format=1', group: 'Ruta Nacional 36' },
    { id: 'P011', name: 'R36 T3 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/188a0785-86fa-4695-a2de-ff1dd40a2b83?format=1', group: 'Ruta Nacional 36' },
    { id: 'P012', name: 'R36 T1-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4cf7d8bf-a930-4c51-83ef-5ffc5486c4ab?format=1', group: 'Ruta Nacional 36' },
    { id: 'P013', name: 'R20-38 T1-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b1f7bb67-3b7d-4464-929b-7a165bf6804b?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P014', name: 'R.Alt38 - 3-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0425e4d1-2087-4bfa-a9c6-18fcecfb7db8?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P015', name: 'R.Alt. 38 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2129eb11-6f34-4168-80f0-23c1efcac23f?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P016', name: 'RP 5 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fccbce04-edb2-42f9-ac3b-46efdb965a4d?format=1', group: 'Ruta Provincial 5' },
    { id: 'P017', name: 'RP 5 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/47d52b80-4dba-4ffc-9585-5a74b024b70c?format=1', group: 'Ruta Provincial 5' },
    { id: 'P018', name: 'Vte. Anisacate RP 5 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/53328ae5-963c-47c1-ad05-da921194e1ec?format=1', group: 'Ruta Provincial 5' },
    { id: 'P019', name: 'Vte Anisacate RP 5 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/185d8b9f-4a3e-45a1-aa72-77296e76cafa?format=1', group: 'Ruta Provincial 5' },
    { id: 'P020', name: 'RP E55 - 5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2613eaa6-c645-4217-aa8e-5e0cc7f5492d?format=1', group: 'Ruta Provincial E55' },
    { id: 'P021', name: 'RP E55 - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/04b6b854-9db8-46c7-a2fa-ff6a2118029b?format=1', group: 'Ruta Provincial E55' },
    { id: 'P022', name: 'RP E55 - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a8f10f48-7978-43de-9abb-af2d9e88af33?format=1', group: 'Ruta Provincial E55' },
    { id: 'P023', name: 'R36 T8', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b999ef36-ded3-46c6-9c5a-cfaf2c9f08e5?format=1', group: 'Ruta Nacional 36' },
    { id: 'P024', name: 'R36 T7', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fa3a6f29-8e3e-4aa2-91ce-71c8b9b08ea7?format=1', group: 'Ruta Nacional 36' },
    { id: 'P025', name: 'R36 T5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/f16b7935-c626-4aa3-954b-a785f8be66af?format=1', group: 'Ruta Nacional 36' },
    { id: 'P026', name: 'R36 - Vte Espinillo', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1e9dba29-a272-4da9-9c85-bcd2581d5253?format=1', group: 'Ruta Nacional 36' },
    { id: 'P027', name: 'R20-38 T4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/94dc0577-d5be-45a9-89cc-3796bdc0f3e1?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P028', name: 'RN 9 S - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0d6860d2-d350-473f-9d91-dcaea18c0ea0?format=1', group: 'Ruta Nacional 9' },
    { id: 'P029', name: 'RN 9 S - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d86b0477-9a87-42d2-97ad-421c2bf66162?format=1', group: 'Ruta Nacional 9' },
    { id: 'P030', name: 'R20-38 T3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5087cf05-0056-4196-b976-855cd0b2c500?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P031', name: 'R36 V.SAN AGUSTIN', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/161693ab-8cc5-4ad5-bd78-88bf7beebf56?format=1', group: 'Ruta Nacional 36' },
    { id: 'P032', name: 'R36 V.LOS CONDORES', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ae0b91ec-2473-4b83-9577-6e327b05dc34?format=1', group: 'Ruta Nacional 36' },
    { id: 'P033', name: 'R36 V.ELENA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5a258c70-66d8-4cde-a77d-0652b6b523c5?format=1', group: 'Ruta Nacional 36' },
    { id: 'P034', name: 'R36 V.DESPEÑADEROS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d416f45d-7077-4b85-80ce-69819970d811?format=1', group: 'Ruta Nacional 36' },
    { id: 'P035', name: 'R36 T2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3d70abfb-8cd5-4836-b4e3-54cddce31b6f?format=1', group: 'Ruta Nacional 36' },
    { id: 'P036', name: 'R20-38 T2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a31af15e-4f5b-4ecb-a320-b30b31f6810c?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P037', name: 'R36 T10', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/db93f645-8154-4ee3-a3a6-a0b5d0a455dc?format=1', group: 'Ruta Nacional 36' },
    { id: 'P038', name: 'R36 V. ALCIRA GIGENA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/73f32d6c-4196-4460-8ca6-7e01f61ca52e?format=1', group: 'Ruta Nacional 36' },
    { id: 'P039', name: 'R36 V. DESPEÑADEROS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ec057801-5192-4bb6-a95e-8245f9e52903?format=1', group: 'Ruta Nacional 36' },
    { id: 'P040', name: 'R36 V. Elena - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a829f07b-3b14-4705-9d6c-9e0362dd3a88?format=1', group: 'Ruta Nacional 36' },
    { id: 'P041', name: 'R36 V. LAS BAJADAS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/456ab41f-bafe-4740-b46a-d89422281a19?format=1', group: 'Ruta Nacional 36' },
    { id: 'P042', name: 'R36 V.BAIGORRIA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1bf72368-ef76-44df-abb8-b10f34220cf9?format=1', group: 'Ruta Nacional 36' },
    { id: 'P043', name: 'R36 V.ALMAFUERTE', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0adc1d2d-5494-47c7-a7c4-7a102e8d320e?format=1', group: 'Ruta Nacional 36' },
    { id: 'P044', name: 'R19 - Vte. Montecristo', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/245eba56-71a0-467e-ae13-477a70d1d333?format=1', group: 'Ruta Nacional 19' },
    { id: 'P045', name: 'R19 - Vte.Piquillin', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7706a2f7-ad68-4bfa-a37a-f2424e23df22?format=1', group: 'Ruta Nacional 19' },
    { id: 'P046', name: 'R19 - Vte km 619', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a09838dd-ed61-4e44-9c89-e0e57333305e?format=1', group: 'Ruta Nacional 19' },
    { id: 'P047', name: 'APC', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e4fd16a0-94c5-4e65-9f41-00cfa3aa463c?format=1', group: 'Área Capital' },
    { id: 'P048', name: 'R9N - Vte. Gral Paz', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/523fa74d-d973-483f-9c1c-b7e21a784541?format=1', group: 'Ruta Nacional 9' },
    { id: 'P049', name: 'R.Alt. 38 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9fc20f46-2ac7-4340-8e11-2fc81677a90d?format=1', group: 'Ruta 20-38 y Alt. 38' },
    { id: 'P050', name: 'RP E53 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9a444633-d6cf-4fa3-b2ad-938a853d3a24?format=1', group: 'Ruta Provincial E53' },
    { id: 'P051', name: 'RN 9 N - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/633f2dca-59a9-4ed7-bc85-b581f5179c07?format=1', group: 'Ruta Nacional 9' },
    { id: 'P052', name: 'RN 9 N - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ca78d420-32dc-475c-984b-075640a3361a?format=1', group: 'Ruta Nacional 9' },
    { id: 'P053', name: 'RN 9 N - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4780e2fd-ad35-445b-a173-db9ad40d6433?format=1', group: 'Ruta Nacional 9' },
    { id: 'P054', name: 'Avda P. Luchesse - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ad961d01-7f62-4011-b5cd-a2413091fdf8?format=1', group: 'Avenidas Urbanas' },
    { id: 'P055', name: 'R19', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e2222571-3174-4359-adba-16d1997b41d9?format=1', group: 'Ruta Nacional 19' },
    { id: 'P056', name: 'A - 019 - 7', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/dd560bec-baf6-4537-84f4-705f98bd0dd1?format=1', group: 'Autovía A-019' },
    { id: 'P057', name: 'A-019 - 6', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0536f9af-0565-48d8-b900-1e0c73db3fb7?format=1', group: 'Autovía A-019' },
    { id: 'P058', name: 'A-019 - 5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/77364171-bc10-47b1-b342-5136a41d350f?format=1', group: 'Autovía A-019' },
    { id: 'P059', name: '2do Anillo ACV 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9ee5d0dc-8a40-4b49-bb3e-d689d02c02d0?format=1', group: 'Área Capital' },
    { id: 'P060', name: 'A-019 - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/cdb04abf-4d77-497e-a8d9-47d93139bccc?format=1', group: 'Autovía A-019' },
    { id: 'P061', name: 'Avda P. Luchesse - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0b0e277b-d331-48d2-8e8b-9b3aa7055e15?format=1', group: 'Avenidas Urbanas' },
    { id: 'P062', name: 'AJC', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7b3e8719-6cd0-459a-8c0d-61bcac9c76e3?format=1', group: 'Área Capital' },
    { id: 'P063', name: 'A-019 - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/25a180e1-e887-4ef9-8d54-10426605cd40?format=1', group: 'Autovía A-019' },
    { id: 'P064', name: 'A-019 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b7c4540b-50ad-48b3-addd-5cd2941215a9?format=1', group: 'Autovía A-019' },
    { id: 'P065', name: '2do Anillo ACV 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/bc66594d-e6cb-44cf-b1a5-c374a3d92c17?format=1', group: 'Área Capital' },
    { id: 'P066', name: 'RN 9 N - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/837c7f61-84a9-4fde-8fbc-4db2418f5ffb?format=1', group: 'Ruta Nacional 9' },
];

// Helper para obtener polígono por ID
export const getRealPolygonById = (id: string): RealPolygonConfig | undefined => {
    return REAL_POLYGONS.find(p => p.id === id);
};

// Helper para obtener todos los IDs
export const getAllPolygonIds = (): string[] => {
    return REAL_POLYGONS.map(p => p.id);
};

// Helper para obtener todos los grupos únicos
export const getAllGroups = (): string[] => {
    const groups = new Set(REAL_POLYGONS.map(p => p.group || 'Sin Grupo'));
    return Array.from(groups).sort();
};

// Helper para obtener polígonos por grupo
export const getPolygonsByGroup = (group: string): RealPolygonConfig[] => {
    return REAL_POLYGONS.filter(p => p.group === group);
};

// Estadísticas de la configuración
export const POLYGON_STATS = {
    total: REAL_POLYGONS.length,
    groups: getAllGroups(),
    groupCount: getAllGroups().length,
};
