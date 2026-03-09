
ALTER TABLE spot_visits ADD COLUMN route_id uuid REFERENCES routes(id);
ALTER TABLE routes ADD COLUMN completed_at timestamptz;
ALTER TABLE routes ADD COLUMN auto_completed boolean DEFAULT false;
