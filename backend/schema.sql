-- FleetFlow Database Schema
-- Run this SQL in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- Users table (JWT auth - not Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'dispatcher', 'safety', 'analyst')),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  model text,
  license_plate text UNIQUE NOT NULL,
  max_capacity numeric NOT NULL CHECK (max_capacity > 0),
  odometer numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'on_trip', 'in_shop', 'retired')),
  acquisition_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  license_expiry date NOT NULL,
  safety_score numeric DEFAULT 100,
  status text NOT NULL DEFAULT 'off_duty'
    CHECK (status IN ('on_duty', 'off_duty', 'suspended')),
  created_at timestamptz DEFAULT now()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  origin text NOT NULL,
  destination text NOT NULL,
  cargo_weight numeric NOT NULL,
  distance numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'dispatched', 'completed', 'cancelled')),
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Maintenance logs
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES vehicles(id),
  description text NOT NULL,
  cost numeric NOT NULL,
  service_date date NOT NULL,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid REFERENCES vehicles(id),
  trip_id uuid REFERENCES trips(id),
  fuel_liters numeric,
  fuel_cost numeric,
  other_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS with permissive policies (RBAC handled at application layer)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Permissive policies for all tables
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on maintenance_logs" ON maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Maintenance trigger: auto set vehicle to in_shop
CREATE OR REPLACE FUNCTION set_vehicle_in_shop()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles SET status = 'in_shop' WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_vehicle_status ON maintenance_logs;
CREATE TRIGGER maintenance_vehicle_status
  AFTER INSERT ON maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_in_shop();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
