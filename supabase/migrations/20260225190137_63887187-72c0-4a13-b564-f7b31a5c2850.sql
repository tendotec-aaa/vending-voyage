
-- Expand movement_type check to include assembly types
ALTER TABLE public.inventory_ledger DROP CONSTRAINT inventory_ledger_movement_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_movement_type_check 
  CHECK (movement_type = ANY (ARRAY['receive','refill','removal','swap_in','swap_out','reversal','adjustment','transfer','initial','assembly_consumption','assembly_production']));

-- Expand reference_type check to include assembly
ALTER TABLE public.inventory_ledger DROP CONSTRAINT inventory_ledger_reference_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_reference_type_check 
  CHECK (reference_type = ANY (ARRAY['visit','purchase','manual','backfill','assembly']));

-- Backfill inventory_ledger entries for all existing transactions
INSERT INTO public.inventory_ledger (item_detail_id, warehouse_id, movement_type, quantity, running_balance, reference_id, reference_type, notes, created_at)
VALUES 
  ('4ea0f6cb-6dfd-45c3-a91f-c07d72995c3b', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'receive', 10000, 10000, 'b80d0bf9-5363-42fd-bca3-4d818c2bf6b7', 'purchase', 'Received from PO-1771986972152', '2026-02-25 04:30:00+00'),
  ('4ea0f6cb-6dfd-45c3-a91f-c07d72995c3b', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'assembly_consumption', -10000, 0, '5a41ff9f-e74c-4691-902b-aa4a9918faf4', 'assembly', 'Consumed for assembly ASM-1771996767349', '2026-02-25 05:19:28+00'),
  ('c3a8701b-5ca7-4cd4-9f7d-4788b1c19dab', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'receive', 10000, 10000, 'b80d0bf9-5363-42fd-bca3-4d818c2bf6b7', 'purchase', 'Received from PO-1771986972152', '2026-02-25 04:30:00+00'),
  ('c3a8701b-5ca7-4cd4-9f7d-4788b1c19dab', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'assembly_consumption', -10000, 0, '5a41ff9f-e74c-4691-902b-aa4a9918faf4', 'assembly', 'Consumed for assembly ASM-1771996767349', '2026-02-25 05:19:28+00'),
  ('9549dc50-1225-47b8-8e42-c325b46837f5', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'assembly_production', 10000, 10000, '5a41ff9f-e74c-4691-902b-aa4a9918faf4', 'assembly', 'Produced from assembly ASM-1771996767349', '2026-02-25 05:19:28+00'),
  ('7771cb59-d4b9-4700-947c-c0adbb38c137', 'fbedae85-321e-4ac9-8738-67e3604b8f11', 'receive', 48, 48, '48ef59b4-0d46-4724-87fc-a642d7781817', 'purchase', 'Received from PO-1772040690509', '2026-02-25 18:00:00+00');
