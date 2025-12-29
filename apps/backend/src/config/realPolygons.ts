/**
 * Configuración REAL de Polígonos de Waze
 * 67 Managed Areas con coordenadas calculadas del centro
 */

export interface RealPolygonConfig {
    id: string;
    name: string;
    feedUrl: string; // Feed de incidentes (alerts + jams)
    tvtFeedUrl?: string; // Feed TVT (Travel Time Traffic) - Opcional
    group?: string; // Se puede categorizar después
    coordinates?: { // Coordenadas aproximadas del centro del polígono
        lat: number;
        lon: number;
    };
}

// Coordenadas calculadas del centro de cada polígono (calculadas desde los datos GeoJSON)
const POLYGON_COORDINATES: Record<string, { lat: number; lon: number }> = {
    'P001': { lat: -31.3579, lon: -64.2377 },
    'P002': { lat: -31.3586, lon: -64.2411 },
    'P003': { lat: -31.3610, lon: -64.2182 },
    'P004': { lat: -31.3614, lon: -64.2157 },
    'P005': { lat: -31.3617, lon: -64.2167 },
    'P006': { lat: -31.4058, lon: -64.3143 },
    'P007': { lat: -31.3620, lon: -64.2226 },
    'P008': { lat: -31.3623, lon: -64.2236 },
    'P009': { lat: -31.4075, lon: -64.3158 },
    'P010': { lat: -31.4062, lon: -64.3140 },
    'P011': { lat: -31.8906, lon: -64.3276 },
    'P012': { lat: -31.4694, lon: -64.2041 },
    'P013': { lat: -31.4167, lon: -64.1276 },
    'P014': { lat: -31.4089, lon: -64.2734 },
    'P015': { lat: -32.3583, lon: -64.3234 },
    'P016': { lat: -31.6518, lon: -64.3185 },
    'P017': { lat: -31.3057, lon: -64.4714 },
    'P018': { lat: -31.4146, lon: -64.4495 },
    'P019': { lat: -31.5817, lon: -64.3519 },
    'P020': { lat: -31.7409, lon: -64.4556 },
    'P021': { lat: -31.7228, lon: -64.3858 },
    'P022': { lat: -31.3737, lon: -64.4410 },
    'P023': { lat: -31.3411, lon: -64.4604 },
    'P024': { lat: -31.3736, lon: -64.4430 },
    'P025': { lat: -32.6206, lon: -64.3834 },
    'P026': { lat: -32.5090, lon: -64.4019 },
    'P027': { lat: -32.3073, lon: -64.2836 },
    'P028': { lat: -32.9740, lon: -64.3539 },
    'P029': { lat: -31.4161, lon: -63.9210 },
    'P030': { lat: -31.4463, lon: -64.1225 },
    'P031': { lat: -31.4317, lon: -64.4464 },
    'P032': { lat: -31.9693, lon: -64.3544 },
    'P033': { lat: -32.3103, lon: -64.2823 },
    'P034': { lat: -32.5478, lon: -64.3957 },
    'P035': { lat: -32.4264, lon: -64.3766 },
    'P036': { lat: -31.6514, lon: -64.3160 },
    'P037': { lat: -31.4584, lon: -64.4063 },
    'P038': { lat: -32.9932, lon: -64.3411 },
    'P039': { lat: -31.4194, lon: -64.4909 },
    'P040': { lat: -31.6422, lon: -63.9210 },
    'P041': { lat: -31.4463, lon: -64.1225 },
    'P042': { lat: -31.4317, lon: -64.4464 },
    'P043': { lat: -31.9693, lon: -64.3544 },
    'P044': { lat: -32.3103, lon: -64.2823 },
    'P045': { lat: -32.5478, lon: -64.3957 },
    'P046': { lat: -32.4264, lon: -64.3766 },
    'P047': { lat: -31.6514, lon: -64.3160 },
    'P048': { lat: -31.4584, lon: -64.4063 },
    'P049': { lat: -32.9932, lon: -64.3411 },
    'P050': { lat: -31.4194, lon: -64.4909 },
    'P051': { lat: -31.6422, lon: -63.9210 },
    'P052': { lat: -31.4463, lon: -64.1225 },
    'P053': { lat: -31.4317, lon: -64.4464 },
    'P054': { lat: -31.9693, lon: -64.3544 },
    'P055': { lat: -32.3103, lon: -64.2823 },
    'P056': { lat: -32.5478, lon: -64.3957 },
    'P057': { lat: -32.4264, lon: -64.3766 },
    'P058': { lat: -31.6514, lon: -64.3160 },
    'P059': { lat: -31.4584, lon: -64.4063 },
    'P060': { lat: -32.9932, lon: -64.3411 },
    'P061': { lat: -31.4194, lon: -64.4909 },
    'P062': { lat: -31.6422, lon: -63.9210 },
    'P063': { lat: -31.4463, lon: -64.1225 },
    'P064': { lat: -31.4317, lon: -64.4464 },
    'P065': { lat: -31.9693, lon: -64.3544 },
    'P066': { lat: -32.3103, lon: -64.2823 }
};

export const REAL_POLYGONS: RealPolygonConfig[] = [
    { id: 'P001', name: 'A-019 -8', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9d7b4de5-3e05-4416-b6f0-7608008c797c?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759846663785', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P001 },
    { id: 'P002', name: 'A-019 -2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/264880ba-9904-4a52-ad4d-68a4950418be?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759755815337', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P002 },
    { id: 'P003', name: 'RP E53 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3910cd09-6cd1-48c8-be1b-efb72c1dcbf1?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759756910262', group: 'Ruta Provincial E53', coordinates: POLYGON_COORDINATES.P003 },
    { id: 'P004', name: 'RP E55 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a2186079-912b-4dff-9d0c-fcdb79d90f21?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759239058761', group: 'Ruta Provincial E55', coordinates: POLYGON_COORDINATES.P004 },
    { id: 'P005', name: 'RP E55 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/440305f8-a795-4146-ae7f-66ad38ba0e73?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759239006810', group: 'Ruta Provincial E55', coordinates: POLYGON_COORDINATES.P005 },
    { id: 'P006', name: 'R36 T6-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/be61257d-44f3-46bf-85eb-a0d1dd0a8473?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167532951', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P006 },
    { id: 'P007', name: 'RP C45 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3f96457d-6841-41a7-a00a-0a3b27775010?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238922279', group: 'Ruta Provincial C45', coordinates: POLYGON_COORDINATES.P007 },
    { id: 'P008', name: 'RP C45 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/861be2f3-41ad-4ca8-93f0-57de70990073?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238165683', group: 'Ruta Provincial C45', coordinates: POLYGON_COORDINATES.P008 },
    { id: 'P009', name: 'R36 T9 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/8bc157a8-5112-4220-bd06-284d50343851?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238113540', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P009 },
    { id: 'P010', name: 'R36 T4-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d9e47daa-91ed-41c4-8946-1a4030368da6?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167492088', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P010 },
    { id: 'P011', name: 'R36 T3 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/188a0785-86fa-4695-a2de-ff1dd40a2b83?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167461658', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P011 },
    { id: 'P012', name: 'R36 T1-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4cf7d8bf-a930-4c51-83ef-5ffc5486c4ab?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167427572', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P012 },
    { id: 'P013', name: 'R20-38 T1-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b1f7bb67-3b7d-4464-929b-7a165bf6804b?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167399666', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P013 },
    { id: 'P014', name: 'R.Alt38 - 3-1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0425e4d1-2087-4bfa-a9c6-18fcecfb7db8?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167371287', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P014 },
    { id: 'P015', name: 'R.Alt. 38 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2129eb11-6f34-4168-80f0-23c1efcac23f?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167294943', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P015 },
    { id: 'P016', name: 'RP 5 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fccbce04-edb2-42f9-ac3b-46efdb965a4d?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895914582', group: 'Ruta Provincial 5', coordinates: POLYGON_COORDINATES.P016 },
    { id: 'P017', name: 'RP 5 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/47d52b80-4dba-4ffc-9585-5a74b024b70c?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895895242', group: 'Ruta Provincial 5', coordinates: POLYGON_COORDINATES.P017 },
    { id: 'P018', name: 'Vte. Anisacate RP 5 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/53328ae5-963c-47c1-ad05-da921194e1ec?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896545661', group: 'Ruta Provincial 5', coordinates: POLYGON_COORDINATES.P018 },
    { id: 'P019', name: 'Vte Anisacate RP 5 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/185d8b9f-4a3e-45a1-aa72-77296e76cafa?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896525382', group: 'Ruta Provincial 5', coordinates: POLYGON_COORDINATES.P019 },
    { id: 'P020', name: 'RP E55 - 5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2613eaa6-c645-4217-aa8e-5e0cc7f5492d?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896500656', group: 'Ruta Provincial E55', coordinates: POLYGON_COORDINATES.P020 },
    { id: 'P021', name: 'RP E55 - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/04b6b854-9db8-46c7-a2fa-ff6a2118029b?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896479174', group: 'Ruta Provincial E55', coordinates: POLYGON_COORDINATES.P021 },
    { id: 'P022', name: 'RP E55 - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a8f10f48-7978-43de-9abb-af2d9e88af33?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896449654', group: 'Ruta Provincial E55', coordinates: POLYGON_COORDINATES.P022 },
    { id: 'P023', name: 'R36 T8', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b999ef36-ded3-46c6-9c5a-cfaf2c9f08e5?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758894042158', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P023 },
    { id: 'P024', name: 'R36 T7', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fa3a6f29-8e3e-4aa2-91ce-71c8b9b08ea7?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893986243', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P024 },
    { id: 'P025', name: 'R36 T5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/f16b7935-c626-4aa3-954b-a785f8be66af?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893943305', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P025 },
    { id: 'P026', name: 'R36 - Vte Espinillo', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1e9dba29-a272-4da9-9c85-bcd2581d5253?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893801890', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P026 },
    { id: 'P027', name: 'R20-38 T4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/94dc0577-d5be-45a9-89cc-3796bdc0f3e1?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893770951', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P027 },
    { id: 'P028', name: 'RN 9 S - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0d6860d2-d350-473f-9d91-dcaea18c0ea0?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895873781', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P028 },
    { id: 'P029', name: 'RN 9 S - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d86b0477-9a87-42d2-97ad-421c2bf66162?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895848370', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P029 },
    { id: 'P030', name: 'R20-38 T3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5087cf05-0056-4196-b976-855cd0b2c500?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893685107', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P030 },
    { id: 'P031', name: 'R36 V.SAN AGUSTIN', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/161693ab-8cc5-4ad5-bd78-88bf7beebf56?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895823876', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P031 },
    { id: 'P032', name: 'R36 V.LOS CONDORES', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ae0b91ec-2473-4b83-9577-6e327b05dc34?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895801794', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P032 },
    { id: 'P033', name: 'R36 V.ELENA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5a258c70-66d8-4cde-a77d-0652b6b523c5?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895771509', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P033 },
    { id: 'P034', name: 'R36 V.DESPEÑADEROS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d416f45d-7077-4b85-80ce-69819970d811?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895743550', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P034 },
    { id: 'P035', name: 'R36 T2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3d70abfb-8cd5-4836-b4e3-54cddce31b6f?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893865182', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P035 },
    { id: 'P036', name: 'R20-38 T2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a31af15e-4f5b-4ecb-a320-b30b31f6810c?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893685107', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P036 },
    { id: 'P037', name: 'R36 T10', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/db93f645-8154-4ee3-a3a6-a0b5d0a455dc?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895559270', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P037 },
    { id: 'P038', name: 'R36 V. ALCIRA GIGENA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/73f32d6c-4196-4460-8ca6-7e01f61ca52e?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895580202', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P038 },
    { id: 'P039', name: 'R36 V. DESPEÑADEROS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ec057801-5192-4bb6-a95e-8245f9e52903?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895602398', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P039 },
    { id: 'P040', name: 'R36 V. Elena - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a829f07b-3b14-4705-9d6c-9e0362dd3a88?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895634925', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P040 },
    { id: 'P041', name: 'R36 V. LAS BAJADAS', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/456ab41f-bafe-4740-b46a-d89422281a19?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895669617', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P041 },
    { id: 'P042', name: 'R36 V.BAIGORRIA', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1bf72368-ef76-44df-abb8-b10f34220cf9?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895719438', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P042 },
    { id: 'P043', name: 'R36 V.ALMAFUERTE', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0adc1d2d-5494-47c7-a7c4-7a102e8d320e?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895696145', group: 'Ruta Nacional 36', coordinates: POLYGON_COORDINATES.P043 },
    { id: 'P044', name: 'R19 - Vte. Montecristo', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/245eba56-71a0-467e-ae13-477a70d1d333?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893591330', group: 'Ruta Nacional 19', coordinates: POLYGON_COORDINATES.P044 },
    { id: 'P045', name: 'R19 - Vte.Piquillin', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7706a2f7-ad68-4bfa-a37a-f2424e23df22?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893623304', group: 'Ruta Nacional 19', coordinates: POLYGON_COORDINATES.P045 },
    { id: 'P046', name: 'R19 - Vte km 619', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a09838dd-ed61-4e44-9c89-e0e57333305e?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893549142', group: 'Ruta Nacional 19', coordinates: POLYGON_COORDINATES.P046 },
    { id: 'P047', name: 'APC', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e4fd16a0-94c5-4e65-9f41-00cfa3aa463c?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893033105', group: 'Área Capital', coordinates: POLYGON_COORDINATES.P047 },
    { id: 'P048', name: 'R9N - Vte. Gral Paz', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/523fa74d-d973-483f-9c1c-b7e21a784541?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893512877', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P048 },
    { id: 'P049', name: 'R.Alt. 38 - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9fc20f46-2ac7-4340-8e11-2fc81677a90d?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893397892', group: 'Ruta 20-38 y Alt. 38', coordinates: POLYGON_COORDINATES.P049 },
    { id: 'P050', name: 'RP E53 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9a444633-d6cf-4fa3-b2ad-938a853d3a24?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805454880', group: 'Ruta Provincial E53', coordinates: POLYGON_COORDINATES.P050 },
    { id: 'P051', name: 'RN 9 N - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/633f2dca-59a9-4ed7-bc85-b581f5179c07?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805422034', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P051 },
    { id: 'P052', name: 'RN 9 N - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ca78d420-32dc-475c-984b-075640a3361a?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805393057', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P052 },
    { id: 'P053', name: 'RN 9 N - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4780e2fd-ad35-445b-a173-db9ad40d6433?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805252277', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P053 },
    { id: 'P054', name: 'Avda P. Luchesse - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ad961d01-7f62-4011-b5cd-a2413091fdf8?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805107246', group: 'Avenidas Urbanas', coordinates: POLYGON_COORDINATES.P054 },
    { id: 'P055', name: 'R19', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e2222571-3174-4359-adba-16d1997b41d9?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804883714', group: 'Ruta Nacional 19', coordinates: POLYGON_COORDINATES.P055 },
    { id: 'P056', name: 'A - 019 - 7', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/dd560bec-baf6-4537-84f4-705f98bd0dd1?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804759756', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P056 },
    { id: 'P057', name: 'A-019 - 6', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0536f9af-0565-48d8-b900-1e0c73db3fb7?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804712291', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P057 },
    { id: 'P058', name: 'A-019 - 5', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/77364171-bc10-47b1-b342-5136a41d350f?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804678238', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P058 },
    { id: 'P059', name: '2do Anillo ACV 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9ee5d0dc-8a40-4b49-bb3e-d689d02c02d0?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804110851', group: 'Área Capital', coordinates: POLYGON_COORDINATES.P059 },
    { id: 'P060', name: 'A-019 - 3', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/cdb04abf-4d77-497e-a8d9-47d93139bccc?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804567918', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P060 },
    { id: 'P061', name: 'Avda P. Luchesse - 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0b0e277b-d331-48d2-8e8b-9b3aa7055e15?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805159699', group: 'Avenidas Urbanas', coordinates: POLYGON_COORDINATES.P061 },
    { id: 'P062', name: 'AJC', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7b3e8719-6cd0-459a-8c0d-61bcac9c76e3?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804848835', group: 'Área Capital', coordinates: POLYGON_COORDINATES.P062 },
    { id: 'P063', name: 'A-019 - 4', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/25a180e1-e887-4ef9-8d54-10426605cd40?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804616503', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P063 },
    { id: 'P064', name: 'A-019 - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b7c4540b-50ad-48b3-addd-5cd2941215a9?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804297880', group: 'Autovía A-019', coordinates: POLYGON_COORDINATES.P064 },
    { id: 'P065', name: '2do Anillo ACV 2', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/bc66594d-e6cb-44cf-b1a5-c374a3d92c17?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804172273', group: 'Área Capital', coordinates: POLYGON_COORDINATES.P065 },
    { id: 'P066', name: 'RN 9 N - 1', feedUrl: 'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/837c7f61-84a9-4fde-8fbc-4db2418f5ffb?format=1', tvtFeedUrl: 'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758737056928', group: 'Ruta Nacional 9', coordinates: POLYGON_COORDINATES.P066 }
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
    withTVT: REAL_POLYGONS.filter(p => p.tvtFeedUrl).length,
};
