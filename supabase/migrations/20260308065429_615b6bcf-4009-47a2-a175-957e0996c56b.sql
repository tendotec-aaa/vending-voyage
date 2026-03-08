
-- BEFORE INSERT trigger to auto-compute running_balance on inventory_ledger
CREATE OR REPLACE FUNCTION public.compute_ledger_running_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.warehouse_id IS NOT NULL THEN
    NEW.running_balance := COALESCE(
      (SELECT SUM(quantity) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id 
         AND warehouse_id = NEW.warehouse_id),
      0
    ) + NEW.quantity;
  ELSIF NEW.slot_id IS NOT NULL THEN
    NEW.running_balance := COALESCE(
      (SELECT SUM(quantity) FROM public.inventory_ledger
       WHERE item_detail_id = NEW.item_detail_id 
         AND slot_id = NEW.slot_id),
      0
    ) + NEW.quantity;
  ELSE
    NEW.running_balance := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_running_balance
  BEFORE INSERT ON public.inventory_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_ledger_running_balance();
