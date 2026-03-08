
CREATE OR REPLACE FUNCTION public.create_sales_order(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale_id uuid;
  v_sale_number text;
  v_warehouse_id uuid;
  v_created_by uuid;
  v_line jsonb;
BEGIN
  -- Generate sale number: S-YYYYMMDD-XXXXX
  v_sale_number := 'S-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
  v_warehouse_id := (payload->>'warehouse_id')::uuid;
  v_created_by := (payload->>'created_by')::uuid;

  -- Insert the sale header
  INSERT INTO public.sales (
    sale_number, sale_date, buyer_name, buyer_contact,
    warehouse_id, subtotal, tax_rate, tax_amount, total_amount,
    status, notes, currency, paid, created_by
  ) VALUES (
    v_sale_number,
    COALESCE((payload->>'sale_date')::date, CURRENT_DATE),
    payload->>'buyer_name',
    payload->>'buyer_contact',
    v_warehouse_id,
    COALESCE((payload->>'subtotal')::numeric, 0),
    COALESCE((payload->>'tax_rate')::numeric, 0),
    COALESCE((payload->>'tax_amount')::numeric, 0),
    COALESCE((payload->>'total_amount')::numeric, 0),
    'completed',
    payload->>'notes',
    COALESCE(payload->>'currency', 'USD'),
    COALESCE((payload->>'paid')::boolean, false),
    v_created_by
  )
  RETURNING id INTO v_sale_id;

  -- Insert line items and ledger entries
  FOR v_line IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    -- Insert sale_item
    INSERT INTO public.sale_items (
      sale_id, item_detail_id, quantity, unit_price, total_price
    ) VALUES (
      v_sale_id,
      (v_line->>'item_detail_id')::uuid,
      (v_line->>'quantity')::integer,
      (v_line->>'unit_price')::numeric,
      (v_line->>'total_price')::numeric
    );

    -- Insert ledger entry (running_balance = 0 placeholder, BEFORE INSERT trigger computes it)
    INSERT INTO public.inventory_ledger (
      item_detail_id, warehouse_id, movement_type,
      quantity, running_balance,
      reference_id, reference_type, performed_by, notes
    ) VALUES (
      (v_line->>'item_detail_id')::uuid,
      v_warehouse_id,
      'warehouse_sale',
      -((v_line->>'quantity')::integer),
      0,
      v_sale_id,
      'sale',
      v_created_by,
      'Sale ' || v_sale_number
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$;
