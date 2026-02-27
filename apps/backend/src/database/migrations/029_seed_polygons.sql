-- Migration: 029_seed_polygons.sql
-- Description: Siembra los 66 polígonos productivos con sus feed URLs de Waze Partner Hub
--              y los grupos correspondientes en polygon_groups.
-- Idempotente: ON CONFLICT garantiza que re-ejecutar es seguro.
-- Date: 2026-02-26

-- =====================================================
-- 1. GRUPOS DE POLÍGONOS
-- =====================================================
INSERT INTO polygon_groups (name, sort_order) VALUES
  ('Autovía A-019',        10),
  ('Ruta Provincial C45',  20),
  ('Ruta Provincial E53',  30),
  ('Ruta Provincial E55',  40),
  ('Ruta Provincial 5',    50),
  ('Ruta Nacional 9',      60),
  ('Ruta 9 Norte',         70),
  ('Ruta Nacional 19',     80),
  ('Ruta Nacional 36',     90),
  ('Ruta 20-38 y Alt. 38', 100),
  ('Área Capital',         110),
  ('Avenidas Urbanas',     120)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. POLÍGONOS PRODUCTIVOS (66 managed areas)
-- =====================================================
INSERT INTO config_polygons (id, name, "group", feed_url, tvt_feed_url, coordinates, is_active) VALUES

-- Autovía A-019
('P001','A-019-8','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9d7b4de5-3e05-4416-b6f0-7608008c797c?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759846663785',
  '{"lat":-31.3579,"lon":-64.2377}', true),

('P002','A-019-2','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/264880ba-9904-4a52-ad4d-68a4950418be?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759755815337',
  '{"lat":-31.3586,"lon":-64.2411}', true),

('P056','A-019-7','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/dd560bec-baf6-4537-84f4-705f98bd0dd1?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804759756',
  '{"lat":-32.5478,"lon":-64.3957}', true),

('P057','A-019-6','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0536f9af-0565-48d8-b900-1e0c73db3fb7?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804712291',
  '{"lat":-32.4264,"lon":-64.3766}', true),

('P058','A-019-5','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/77364171-bc10-47b1-b342-5136a41d350f?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804678238',
  '{"lat":-31.6514,"lon":-64.316}', true),

('P060','A-019-3','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/cdb04abf-4d77-497e-a8d9-47d93139bccc?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804567918',
  '{"lat":-32.9932,"lon":-64.3411}', true),

('P063','A-019-4','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/25a180e1-e887-4ef9-8d54-10426605cd40?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804616503',
  '{"lat":-31.4463,"lon":-64.1225}', true),

('P064','A-019-1','Autovía A-019',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b7c4540b-50ad-48b3-addd-5cd2941215a9?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804297880',
  '{"lat":-31.4317,"lon":-64.4464}', true),

-- Ruta Provincial C45
('P007','RP C45-2','Ruta Provincial C45',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3f96457d-6841-41a7-a00a-0a3b27775010?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238922279',
  '{"lat":-31.362,"lon":-64.2226}', true),

('P008','RP C45-1','Ruta Provincial C45',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/861be2f3-41ad-4ca8-93f0-57de70990073?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238165683',
  '{"lat":-31.3623,"lon":-64.2236}', true),

-- Ruta Provincial E53
('P003','RP E53-2','Ruta Provincial E53',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3910cd09-6cd1-48c8-be1b-efb72c1dcbf1?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759756910262',
  '{"lat":-31.361,"lon":-64.2182}', true),

('P050','RP E53-1','Ruta Provincial E53',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9a444633-d6cf-4fa3-b2ad-938a853d3a24?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805454880',
  '{"lat":-31.4194,"lon":-64.4909}', true),

-- Ruta Provincial E55
('P004','RP E55-2','Ruta Provincial E55',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a2186079-912b-4dff-9d0c-fcdb79d90f21?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759239058761',
  '{"lat":-31.3614,"lon":-64.2157}', true),

('P005','RP E55-1','Ruta Provincial E55',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/440305f8-a795-4146-ae7f-66ad38ba0e73?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759239006810',
  '{"lat":-31.3617,"lon":-64.2167}', true),

('P020','RP E55-5','Ruta Provincial E55',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2613eaa6-c645-4217-aa8e-5e0cc7f5492d?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896500656',
  '{"lat":-31.7409,"lon":-64.4556}', true),

('P021','RP E55-4','Ruta Provincial E55',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/04b6b854-9db8-46c7-a2fa-ff6a2118029b?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896479174',
  '{"lat":-31.7228,"lon":-64.3858}', true),

('P022','RP E55-3','Ruta Provincial E55',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a8f10f48-7978-43de-9abb-af2d9e88af33?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896449654',
  '{"lat":-31.3737,"lon":-64.441}', true),

-- Ruta Provincial 5
('P016','RP 5-2','Ruta Provincial 5',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fccbce04-edb2-42f9-ac3b-46efdb965a4d?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895914582',
  '{"lat":-31.6518,"lon":-64.3185}', true),

('P017','RP 5-1','Ruta Provincial 5',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/47d52b80-4dba-4ffc-9585-5a74b024b70c?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895895242',
  '{"lat":-31.3057,"lon":-64.4714}', true),

('P018','Vte. Anisacate RP 5-2','Ruta Provincial 5',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/53328ae5-963c-47c1-ad05-da921194e1ec?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896545661',
  '{"lat":-31.4146,"lon":-64.4495}', true),

('P019','Vte Anisacate RP 5-1','Ruta Provincial 5',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/185d8b9f-4a3e-45a1-aa72-77296e76cafa?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758896525382',
  '{"lat":-31.5817,"lon":-64.3519}', true),

-- Ruta Nacional 9
('P028','RN 9 S-2','Ruta Nacional 9',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0d6860d2-d350-473f-9d91-dcaea18c0ea0?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895873781',
  '{"lat":-32.974,"lon":-64.3539}', true),

('P029','RN 9 S-1','Ruta Nacional 9',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d86b0477-9a87-42d2-97ad-421c2bf66162?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895848370',
  '{"lat":-31.4161,"lon":-63.921}', true),

-- Ruta 9 Norte
('P048','R9N-Vte. Gral Paz','Ruta 9 Norte',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/523fa74d-d973-483f-9c1c-b7e21a784541?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893512877',
  '{"lat":-31.4584,"lon":-64.4063}', true),

('P051','RN 9 N-4','Ruta 9 Norte',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/633f2dca-59a9-4ed7-bc85-b581f5179c07?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805422034',
  '{"lat":-31.6422,"lon":-63.921}', true),

('P052','RN 9 N-3','Ruta 9 Norte',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ca78d420-32dc-475c-984b-075640a3361a?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805393057',
  '{"lat":-31.4463,"lon":-64.1225}', true),

('P053','RN 9 N-2','Ruta 9 Norte',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4780e2fd-ad35-445b-a173-db9ad40d6433?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805252277',
  '{"lat":-31.4317,"lon":-64.4464}', true),

('P066','RN 9 N-1','Ruta 9 Norte',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/837c7f61-84a9-4fde-8fbc-4db2418f5ffb?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758737056928',
  '{"lat":-32.3103,"lon":-64.2823}', true),

-- Ruta Nacional 19
('P044','R19-Vte. Montecristo','Ruta Nacional 19',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/245eba56-71a0-467e-ae13-477a70d1d333?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893591330',
  '{"lat":-32.3103,"lon":-64.2823}', true),

('P045','R19-Vte.Piquillin','Ruta Nacional 19',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7706a2f7-ad68-4bfa-a37a-f2424e23df22?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893623304',
  '{"lat":-32.5478,"lon":-64.3957}', true),

('P046','R19-Vte km 619','Ruta Nacional 19',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a09838dd-ed61-4e44-9c89-e0e57333305e?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893549142',
  '{"lat":-32.4264,"lon":-64.3766}', true),

('P055','R19','Ruta Nacional 19',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e2222571-3174-4359-adba-16d1997b41d9?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804883714',
  '{"lat":-32.3103,"lon":-64.2823}', true),

-- Ruta Nacional 36
('P006','R36 T6-1','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/be61257d-44f3-46bf-85eb-a0d1dd0a8473?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167532951',
  '{"lat":-31.4058,"lon":-64.3143}', true),

('P009','R36 T9 - 1','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/8bc157a8-5112-4220-bd06-284d50343851?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759238113540',
  '{"lat":-31.4075,"lon":-64.3158}', true),

('P010','R36 T4-1','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d9e47daa-91ed-41c4-8946-1a4030368da6?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167492088',
  '{"lat":-31.4062,"lon":-64.314}', true),

('P011','R36 T3-1','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/188a0785-86fa-4695-a2de-ff1dd40a2b83?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167461658',
  '{"lat":-31.8906,"lon":-64.3276}', true),

('P012','R36 T1-1','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/4cf7d8bf-a930-4c51-83ef-5ffc5486c4ab?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167427572',
  '{"lat":-31.4694,"lon":-64.2041}', true),

('P023','R36 T8','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b999ef36-ded3-46c6-9c5a-cfaf2c9f08e5?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758894042158',
  '{"lat":-31.3411,"lon":-64.4604}', true),

('P024','R36 T7','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/fa3a6f29-8e3e-4aa2-91ce-71c8b9b08ea7?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893986243',
  '{"lat":-31.3736,"lon":-64.443}', true),

('P025','R36 T5','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/f16b7935-c626-4aa3-954b-a785f8be66af?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893943305',
  '{"lat":-32.6206,"lon":-64.3834}', true),

('P026','R36 - Vte Espinillo','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1e9dba29-a272-4da9-9c85-bcd2581d5253?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893801890',
  '{"lat":-32.509,"lon":-64.4019}', true),

('P031','R36 V.SAN AGUSTIN','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/161693ab-8cc5-4ad5-bd78-88bf7beebf56?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895823876',
  '{"lat":-31.4317,"lon":-64.4464}', true),

('P032','R36 V.LOS CONDORES','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ae0b91ec-2473-4b83-9577-6e327b05dc34?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895801794',
  '{"lat":-31.9693,"lon":-64.3544}', true),

('P033','R36 V.ELENA','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5a258c70-66d8-4cde-a77d-0652b6b523c5?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895771509',
  '{"lat":-32.3103,"lon":-64.2823}', true),

('P034','R36 V.DESPEÑADEROS','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/d416f45d-7077-4b85-80ce-69819970d811?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895743550',
  '{"lat":-32.5478,"lon":-64.3957}', true),

('P035','R36 T2','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/3d70abfb-8cd5-4836-b4e3-54cddce31b6f?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893865182',
  '{"lat":-32.4264,"lon":-64.3766}', true),

('P037','R36 T10','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/db93f645-8154-4ee3-a3a6-a0b5d0a455dc?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895559270',
  '{"lat":-31.4584,"lon":-64.4063}', true),

('P038','R36 V. ALCIRA GIGENA','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/73f32d6c-4196-4460-8ca6-7e01f61ca52e?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895580202',
  '{"lat":-32.9932,"lon":-64.3411}', true),

('P039','R36 V. DESPEÑADEROS','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ec057801-5192-4bb6-a95e-8245f9e52903?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895602398',
  '{"lat":-31.4194,"lon":-64.4909}', true),

('P040','R36 V. Elena-2','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a829f07b-3b14-4705-9d6c-9e0362dd3a88?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895634925',
  '{"lat":-31.6422,"lon":-63.921}', true),

('P041','R36 V. LAS BAJADAS','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/456ab41f-bafe-4740-b46a-d89422281a19?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895669617',
  '{"lat":-31.4463,"lon":-64.1225}', true),

('P042','R36 V.BAIGORRIA','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/1bf72368-ef76-44df-abb8-b10f34220cf9?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895719438',
  '{"lat":-31.4317,"lon":-64.4464}', true),

('P043','R36 V.ALMAFUERTE','Ruta Nacional 36',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0adc1d2d-5494-47c7-a7c4-7a102e8d320e?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758895696145',
  '{"lat":-31.9693,"lon":-64.3544}', true),

-- Ruta 20-38 y Alt. 38
('P013','R20-38 T1-1','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/b1f7bb67-3b7d-4464-929b-7a165bf6804b?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167399666',
  '{"lat":-31.4167,"lon":-64.1276}', true),

('P014','R.Alt38-3-1','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0425e4d1-2087-4bfa-a9c6-18fcecfb7db8?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167371287',
  '{"lat":-31.4089,"lon":-64.2734}', true),

('P015','R.Alt. 38-1','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/2129eb11-6f34-4168-80f0-23c1efcac23f?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1759167294943',
  '{"lat":-32.3583,"lon":-64.3234}', true),

('P027','R20-38 T4','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/94dc0577-d5be-45a9-89cc-3796bdc0f3e1?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893770951',
  '{"lat":-32.3073,"lon":-64.2836}', true),

('P030','R20-38 T3','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/5087cf05-0056-4196-b976-855cd0b2c500?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893685107',
  '{"lat":-31.4463,"lon":-64.1225}', true),

('P036','R20-38 T2','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/a31af15e-4f5b-4ecb-a320-b30b31f6810c?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893685107',
  '{"lat":-31.6514,"lon":-64.316}', true),

('P049','R.Alt. 38-2','Ruta 20-38 y Alt. 38',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9fc20f46-2ac7-4340-8e11-2fc81677a90d?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893397892',
  '{"lat":-32.9932,"lon":-64.3411}', true),

-- Área Capital
('P047','APC','Área Capital',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/e4fd16a0-94c5-4e65-9f41-00cfa3aa463c?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758893033105',
  '{"lat":-31.6514,"lon":-64.316}', true),

('P059','2do Anillo ACV 1','Área Capital',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/9ee5d0dc-8a40-4b49-bb3e-d689d02c02d0?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804110851',
  '{"lat":-31.4584,"lon":-64.4063}', true),

('P062','AJC','Área Capital',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/7b3e8719-6cd0-459a-8c0d-61bcac9c76e3?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804848835',
  '{"lat":-31.6422,"lon":-63.921}', true),

('P065','2do Anillo ACV 2','Área Capital',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/bc66594d-e6cb-44cf-b1a5-c374a3d92c17?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758804172273',
  '{"lat":-31.9693,"lon":-64.3544}', true),

-- Avenidas Urbanas
('P054','Avda P. Luchesse-1','Avenidas Urbanas',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/ad961d01-7f62-4011-b5cd-a2413091fdf8?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805107246',
  '{"lat":-31.9693,"lon":-64.3544}', true),

('P061','Avda P. Luchesse-2','Avenidas Urbanas',
  'https://www.waze.com/row-partnerhub-api/partners/11387019565/waze-feeds/0b0e277b-d331-48d2-8e8b-9b3aa7055e15?format=1',
  'https://www.waze.com/row-partnerhub-api/feeds-tvt/?id=1758805159699',
  '{"lat":-31.4194,"lon":-64.4909}', true)

ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  "group"    = EXCLUDED."group",
  feed_url   = EXCLUDED.feed_url,
  tvt_feed_url = EXCLUDED.tvt_feed_url,
  coordinates  = EXCLUDED.coordinates,
  updated_at   = NOW();

-- =====================================================
-- 3. SINCRONIZAR polygon_groups con los grupos activos
-- =====================================================
INSERT INTO polygon_groups (name, sort_order)
SELECT DISTINCT "group", 0
FROM config_polygons
WHERE "group" IS NOT NULL AND TRIM("group") != ''
ON CONFLICT (name) DO NOTHING;
