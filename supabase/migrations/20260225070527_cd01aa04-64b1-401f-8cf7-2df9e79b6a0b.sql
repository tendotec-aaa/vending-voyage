-- Backfill purchase_items for existing assemblies that don't have them
INSERT INTO public.purchase_items (
  item_detail_id, purchase_id, quantity_ordered, quantity_received, quantity_remaining,
  unit_cost, final_unit_cost, landed_unit_cost, active_item, arrival_order
)
SELECT 
  a.output_item_detail_id,
  NULL,
  a.output_quantity,
  a.output_quantity,
  a.output_quantity,
  a.final_unit_cost,
  a.final_unit_cost,
  a.final_unit_cost,
  true,
  1
FROM public.assemblies a
WHERE a.output_item_detail_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.purchase_items pi 
  WHERE pi.item_detail_id = a.output_item_detail_id
  AND pi.purchase_id IS NULL
);