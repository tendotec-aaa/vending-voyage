
-- Add warehouse_sale to movement_type check (drop if exists, then recreate)
ALTER TABLE public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_movement_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_movement_type_check 
CHECK (movement_type = ANY (ARRAY[
  'receive','refill','removal','sale','swap_in','swap_out',
  'reversal','adjustment','transfer','initial',
  'assembly_consumption','assembly_production','warehouse_sale'
]));

-- Trigger function: recompute quantity_on_hand from ledger SUM
CREATE OR REPLACE FUNCTION public.sync_inventory_from_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.warehouse_id IS NOT NULL THEN
    INSERT INTO public.inventory (item_detail_id, warehouse_id, quantity_on_hand, last_updated)
    VALUES (
      NEW.item_detail_id,
      NEW.warehouse_id,
      (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id AND warehouse_id = NEW.warehouse_id),
      now()
    )
    ON CONFLICT (item_detail_id, warehouse_id)
    DO UPDATE SET
      quantity_on_hand = (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_ledger
                          WHERE item_detail_id = NEW.item_detail_id AND warehouse_id = NEW.warehouse_id),
      last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_sync_inventory_after_ledger ON public.inventory_ledger;
CREATE TRIGGER trg_sync_inventory_after_ledger
AFTER INSERT ON public.inventory_ledger
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_from_ledger();
