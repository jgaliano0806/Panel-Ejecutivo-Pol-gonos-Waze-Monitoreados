CREATE TABLE IF NOT EXISTS danger_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  geometry JSONB NOT NULL,           -- GeoJSON Polygon
  severity VARCHAR(20) NOT NULL DEFAULT 'high',
  protocol TEXT NOT NULL DEFAULT '',
  color VARCHAR(9) DEFAULT '#ef4444',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_danger_zones_active ON danger_zones(is_active);
