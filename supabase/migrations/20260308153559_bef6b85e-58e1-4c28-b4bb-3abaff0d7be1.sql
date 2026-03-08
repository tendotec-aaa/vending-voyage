
CREATE OR REPLACE FUNCTION public.sync_inventory_from_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Sync machine_slots.current_stock from running_balance when slot_id is present
  IF NEW.slot_id IS NOT NULL THEN
    UPDATE public.machine_slots
    SET current_stock = NEW.running_balance
    WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$function$;
