-- FleetFlow Row Level Security (RLS) Policies
-- Run this SQL in your Supabase SQL Editor after creating the tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role';
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
-- All authenticated users can view users
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);

-- Only managers can modify users
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (get_user_role() = 'manager');

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (get_user_role() = 'manager');

CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- VEHICLES TABLE POLICIES
-- ============================================
-- All roles can view vehicles
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT USING (true);

-- Only managers can add/modify/delete vehicles
CREATE POLICY "vehicles_insert_policy" ON vehicles
  FOR INSERT WITH CHECK (get_user_role() = 'manager');

CREATE POLICY "vehicles_update_policy" ON vehicles
  FOR UPDATE USING (get_user_role() = 'manager');

CREATE POLICY "vehicles_delete_policy" ON vehicles
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- DRIVERS TABLE POLICIES
-- ============================================
-- All roles can view drivers
CREATE POLICY "drivers_select_policy" ON drivers
  FOR SELECT USING (true);

-- Managers and Safety officers can modify drivers
CREATE POLICY "drivers_insert_policy" ON drivers
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'safety'));

CREATE POLICY "drivers_update_policy" ON drivers
  FOR UPDATE USING (get_user_role() IN ('manager', 'safety'));

CREATE POLICY "drivers_delete_policy" ON drivers
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- TRIPS TABLE POLICIES
-- ============================================
-- All roles can view trips
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT USING (true);

-- Managers and dispatchers can create/update trips
CREATE POLICY "trips_insert_policy" ON trips
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE USING (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "trips_delete_policy" ON trips
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- MAINTENANCE_LOGS TABLE POLICIES
-- ============================================
-- All roles can view maintenance logs
CREATE POLICY "maintenance_select_policy" ON maintenance_logs
  FOR SELECT USING (true);

-- Managers and dispatchers can create/update maintenance logs
CREATE POLICY "maintenance_insert_policy" ON maintenance_logs
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "maintenance_update_policy" ON maintenance_logs
  FOR UPDATE USING (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "maintenance_delete_policy" ON maintenance_logs
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- EXPENSES TABLE POLICIES
-- ============================================
-- All roles can view expenses
CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT USING (true);

-- Managers and dispatchers can create/update expenses
CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "expenses_update_policy" ON expenses
  FOR UPDATE USING (get_user_role() IN ('manager', 'dispatcher'));

CREATE POLICY "expenses_delete_policy" ON expenses
  FOR DELETE USING (get_user_role() = 'manager');

-- ============================================
-- PERMISSION MATRIX SUMMARY:
-- ============================================
-- Manager:     Full CRUD on all tables
-- Dispatcher:  CRUD on trips, maintenance, expenses | Read on vehicles, drivers
-- Safety:      CRUD on drivers | Read on all other tables  
-- Analyst:     Read-only on all tables
-- ============================================
