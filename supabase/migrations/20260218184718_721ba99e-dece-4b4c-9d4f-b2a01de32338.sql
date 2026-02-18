
-- Drop the over-restrictive constraint (only on item_detail_id)
ALTER TABLE public.inventory 
  DROP CONSTRAINT IF EXISTS warehouse_inventory_item_definition_id_key;

-- Add the correct composite unique constraint (item per warehouse)
ALTER TABLE public.inventory 
  ADD CONSTRAINT inventory_item_warehouse_unique 
  UNIQUE (item_detail_id, warehouse_id);
