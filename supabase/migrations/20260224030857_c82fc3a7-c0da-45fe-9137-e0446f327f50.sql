
-- ============================================================
-- INVENTORY LEDGER: Authoritative stock movement log
-- ============================================================

CREATE TABLE public.inventory_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  item_detail_id uuid NOT NULL REFERENCES public.item_details(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  slot_id uuid REFERENCES public.machine_slots(id),
  movement_type text NOT NULL CHECK (movement_type IN (
    'receive', 'refill', 'removal', 'swap_in', 'swap_out',
    'reversal', 'adjustment', 'transfer', 'initial'
  )),
  quantity integer NOT NULL,  -- signed: + for in, - for out
  running_balance integer NOT NULL,  -- balance AFTER this movement at this location
  reference_id uuid,  -- visit_id or purchase_id
  reference_type text CHECK (reference_type IN ('visit', 'purchase', 'manual', 'backfill')),
  performed_by uuid,
  notes text
);

-- Performance indexes
CREATE INDEX idx_ledger_item ON public.inventory_ledger(item_detail_id, created_at DESC);
CREATE INDEX idx_ledger_warehouse ON public.inventory_ledger(warehouse_id, created_at DESC) WHERE warehouse_id IS NOT NULL;
CREATE INDEX idx_ledger_slot ON public.inventory_ledger(slot_id, created_at DESC) WHERE slot_id IS NOT NULL;
CREATE INDEX idx_ledger_reference ON public.inventory_ledger(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_ledger_type ON public.inventory_ledger(movement_type);

-- RLS
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated"
  ON public.inventory_ledger FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Allow insert for authenticated"
  ON public.inventory_ledger FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);

-- No update/delete policies — ledger is append-only

-- ============================================================
-- BACKFILL: Seed ledger from historical warehouse inventory
-- (current balances as "initial" entries)
-- ============================================================

INSERT INTO public.inventory_ledger (
  item_detail_id, warehouse_id, slot_id, movement_type,
  quantity, running_balance, reference_type, notes
)
SELECT
  i.item_detail_id,
  i.warehouse_id,
  NULL,
  'initial',
  i.quantity_on_hand,
  i.quantity_on_hand,
  'backfill',
  'Backfilled from warehouse inventory snapshot'
FROM public.inventory i
WHERE i.item_detail_id IS NOT NULL
  AND i.warehouse_id IS NOT NULL
  AND i.quantity_on_hand IS NOT NULL
  AND i.quantity_on_hand != 0;

-- Backfill: current machine slot stock as "initial" entries
INSERT INTO public.inventory_ledger (
  item_detail_id, warehouse_id, slot_id, movement_type,
  quantity, running_balance, reference_type, notes
)
SELECT
  ms.current_product_id,
  NULL,
  ms.id,
  'initial',
  ms.current_stock,
  ms.current_stock,
  'backfill',
  'Backfilled from machine slot snapshot'
FROM public.machine_slots ms
WHERE ms.current_product_id IS NOT NULL
  AND ms.current_stock IS NOT NULL
  AND ms.current_stock != 0;
