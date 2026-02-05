-- =====================================================
-- DATABASE RESTRUCTURING: FIFO Inventory System
-- =====================================================

-- Step 1: Rename tables
ALTER TABLE item_definitions RENAME TO item_details;
ALTER TABLE warehouse_inventory RENAME TO inventory;
ALTER TABLE purchase_lines RENAME TO purchase_items;

-- Step 2: Add updated_at to item_details
ALTER TABLE item_details
  ADD COLUMN updated_at timestamptz DEFAULT now();

-- Step 3: Modify inventory table
-- First rename the column
ALTER TABLE inventory 
  RENAME COLUMN item_definition_id TO item_detail_id;

-- Add new columns for location tracking
ALTER TABLE inventory 
  ADD COLUMN warehouse_id uuid REFERENCES warehouses(id),
  ADD COLUMN spot_id uuid REFERENCES spots(id),
  ADD COLUMN slot_id uuid REFERENCES machine_slots(id);

-- Remove average_cost (costing now at purchase_items level)
ALTER TABLE inventory DROP COLUMN IF EXISTS average_cost;

-- Step 4: Modify purchases table
ALTER TABLE purchases
  ADD COLUMN received_inventory boolean DEFAULT false,
  ADD COLUMN received_at timestamptz;

-- Remove old warehouse fields
ALTER TABLE purchases 
  DROP COLUMN IF EXISTS warehouse_id,
  DROP COLUMN IF EXISTS warehouse_destination;

-- Step 5: Modify purchase_items table
-- Rename the column
ALTER TABLE purchase_items
  RENAME COLUMN item_definition_id TO item_detail_id;

-- Add FIFO tracking columns
ALTER TABLE purchase_items
  ADD COLUMN quantity_remaining integer DEFAULT 0,
  ADD COLUMN line_fees_total numeric DEFAULT 0,
  ADD COLUMN global_fees_allocated numeric DEFAULT 0,
  ADD COLUMN tax_allocated numeric DEFAULT 0,
  ADD COLUMN landed_unit_cost numeric DEFAULT 0,
  ADD COLUMN active_item boolean DEFAULT true,
  ADD COLUMN inventory_id uuid REFERENCES inventory(id),
  ADD COLUMN arrival_order integer,
  ADD COLUMN created_at timestamptz DEFAULT now(),
  ADD COLUMN updated_at timestamptz DEFAULT now();

-- Step 6: Create validation trigger for inventory location
CREATE OR REPLACE FUNCTION validate_inventory_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow both null for initial migration, but in practice one should be set
  -- Modified to be less restrictive initially
  IF (NEW.warehouse_id IS NOT NULL AND NEW.spot_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Inventory cannot have both warehouse_id and spot_id set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_location
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION validate_inventory_location();

-- Step 7: Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_item_details_updated_at
  BEFORE UPDATE ON item_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_items_updated_at
  BEFORE UPDATE ON purchase_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Update RLS policies for renamed tables
-- Drop old policies and create new ones for inventory
DROP POLICY IF EXISTS "Allow delete for authenticated" ON inventory;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON inventory;
DROP POLICY IF EXISTS "Allow read for authenticated" ON inventory;
DROP POLICY IF EXISTS "Allow update for authenticated" ON inventory;

CREATE POLICY "Allow delete for authenticated" ON inventory FOR DELETE USING (true);
CREATE POLICY "Allow insert for authenticated" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow update for authenticated" ON inventory FOR UPDATE USING (true);

-- RLS policies for item_details
DROP POLICY IF EXISTS "Allow delete for authenticated" ON item_details;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON item_details;
DROP POLICY IF EXISTS "Allow read for authenticated" ON item_details;
DROP POLICY IF EXISTS "Allow update for authenticated" ON item_details;

CREATE POLICY "Allow delete for authenticated" ON item_details FOR DELETE USING (true);
CREATE POLICY "Allow insert for authenticated" ON item_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON item_details FOR SELECT USING (true);
CREATE POLICY "Allow update for authenticated" ON item_details FOR UPDATE USING (true);

-- RLS policies for purchase_items
DROP POLICY IF EXISTS "Allow delete for authenticated" ON purchase_items;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON purchase_items;
DROP POLICY IF EXISTS "Allow read for authenticated" ON purchase_items;
DROP POLICY IF EXISTS "Allow update for authenticated" ON purchase_items;

CREATE POLICY "Allow delete for authenticated" ON purchase_items FOR DELETE USING (true);
CREATE POLICY "Allow insert for authenticated" ON purchase_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read for authenticated" ON purchase_items FOR SELECT USING (true);
CREATE POLICY "Allow update for authenticated" ON purchase_items FOR UPDATE USING (true);

-- Step 9: Update views to reference new table names
DROP VIEW IF EXISTS view_sales_ledger;
CREATE VIEW view_sales_ledger AS
SELECT
  l.name AS location_name,
  sp.name AS spot_name,
  s.name AS setup_name,
  m.serial_number,
  id.name AS product_name,
  vli.action_type,
  vli.quantity_added,
  vli.cash_collected,
  sv.visit_date,
  up.email AS operator_email
FROM visit_line_items vli
LEFT JOIN spot_visits sv ON vli.spot_visit_id = sv.id
LEFT JOIN spots sp ON sv.spot_id = sp.id
LEFT JOIN locations l ON sp.location_id = l.id
LEFT JOIN machines m ON vli.machine_id = m.id
LEFT JOIN setups s ON m.setup_id = s.id
LEFT JOIN item_details id ON vli.product_id = id.id
LEFT JOIN user_profiles up ON sv.operator_id = up.id;

-- Step 10: Add index for FIFO queries
CREATE INDEX IF NOT EXISTS idx_purchase_items_fifo 
  ON purchase_items(item_detail_id, active_item, arrival_order);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse 
  ON inventory(warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_spot 
  ON inventory(spot_id) WHERE spot_id IS NOT NULL;