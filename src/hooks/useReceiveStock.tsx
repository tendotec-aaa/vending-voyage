import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UnreceivedPurchase {
  id: string;
  purchase_order_number: string;
  supplier?: { id: string; name: string } | null;
  status: string;
  expected_arrival_date: string | null;
  created_at: string;
  purchase_items: {
    id: string;
    quantity_ordered: number;
    quantity_received: number | null;
    quantity_remaining: number | null;
    item_detail_id: string | null;
    item_detail?: { id: string; name: string; sku: string } | null;
  }[];
}

export interface WarehouseAllocation {
  warehouseId: string;
  quantity: number;
}

export interface ReceivedItemData {
  purchaseItemId: string;
  itemDetailId: string | null;
  itemName: string;
  quantityExpected: number;
  quantityReceived: number;
  allocations: WarehouseAllocation[];
}

export interface ReceiveStockPayload {
  purchaseId: string;
  items: ReceivedItemData[];
  discrepancyNote?: string;
}

export function useReceiveStock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unreceivedPurchasesQuery = useQuery({
    queryKey: ["unreceived-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          purchase_order_number,
          status,
          expected_arrival_date,
          created_at,
          supplier:suppliers(id, name),
          purchase_items(
            id,
            quantity_ordered,
            quantity_received,
            quantity_remaining,
            item_detail_id,
            item_detail:item_details(id, name, sku)
          )
        `)
        .in("status", ["arrived"])
        .eq("received_inventory", false)
        .order("expected_arrival_date", { ascending: true });

      if (error) throw error;
      return data as UnreceivedPurchase[];
    },
  });

  // Fetch system warehouse (Unaccounted Inventory)
  const systemWarehouseQuery = useQuery({
    queryKey: ["system-warehouse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_system", true)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const receiveStockMutation = useMutation({
    mutationFn: async (payload: ReceiveStockPayload) => {
      const systemWarehouseId = systemWarehouseQuery.data?.id;

      for (const item of payload.items) {
        const difference = item.quantityExpected - item.quantityReceived;

        // 1. Update purchase_items
        const { error: updateError } = await supabase
          .from("purchase_items")
          .update({
            quantity_received: item.quantityReceived,
            quantity_remaining: item.quantityReceived,
          })
          .eq("id", item.purchaseItemId);

        if (updateError) throw updateError;

        // 2. Create receiving_allocations and ledger entries (trigger handles inventory sync)
        for (const alloc of item.allocations) {
          const { error: allocError } = await supabase
            .from("receiving_allocations")
            .insert({
              purchase_id: payload.purchaseId,
              purchase_item_id: item.purchaseItemId,
              warehouse_id: alloc.warehouseId,
              quantity: alloc.quantity,
            });

          if (allocError) throw allocError;

          // Write ledger entry — DB trigger auto-syncs inventory.quantity_on_hand
          if (item.itemDetailId) {
            // Get current running balance for this item+warehouse
            const { data: lastEntry } = await supabase
              .from("inventory_ledger")
              .select("running_balance")
              .eq("item_detail_id", item.itemDetailId)
              .eq("warehouse_id", alloc.warehouseId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const newBalance = (lastEntry?.running_balance ?? 0) + alloc.quantity;

            await supabase.from("inventory_ledger").insert({
              item_detail_id: item.itemDetailId,
              warehouse_id: alloc.warehouseId,
              movement_type: "receive",
              quantity: alloc.quantity,
              running_balance: newBalance,
              reference_id: payload.purchaseId,
              reference_type: "purchase",
              notes: `Received from PO`,
            });
          }
        }

        // 3. Handle discrepancy
        if (difference > 0) {
          const systemWarehouseName = systemWarehouseQuery.data?.name || "Unaccounted Inventory";
          const defaultNote = `Missing ${difference} unit(s) of "${item.itemName}" (expected ${item.quantityExpected}, received ${item.quantityReceived}) — routed to ${systemWarehouseName} for supplier reclaim.`;
          const { error: noteError } = await supabase
            .from("receiving_notes")
            .insert({
              purchase_id: payload.purchaseId,
              purchase_item_id: item.purchaseItemId,
              quantity_expected: item.quantityExpected,
              quantity_received: item.quantityReceived,
              difference,
              note: payload.discrepancyNote || defaultNote,
            });

          if (noteError) throw noteError;

          if (systemWarehouseId) {
            // Ledger entry for discrepancy allocation — trigger handles inventory sync
            if (item.itemDetailId) {
              const { data: sysLastEntry } = await supabase
                .from("inventory_ledger")
                .select("running_balance")
                .eq("item_detail_id", item.itemDetailId)
                .eq("warehouse_id", systemWarehouseId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const sysBalance = (sysLastEntry?.running_balance ?? 0) + difference;

              await supabase.from("inventory_ledger").insert({
                item_detail_id: item.itemDetailId,
                warehouse_id: systemWarehouseId,
                movement_type: "receive",
                quantity: difference,
                running_balance: sysBalance,
                reference_id: payload.purchaseId,
                reference_type: "purchase",
                notes: `Discrepancy: ${difference} unit(s) routed to ${systemWarehouseName}`,
              });
            }

            const { error: unaccountedAllocError } = await supabase
              .from("receiving_allocations")
              .insert({
                purchase_id: payload.purchaseId,
                purchase_item_id: item.purchaseItemId,
                warehouse_id: systemWarehouseId,
                quantity: difference,
              });

            if (unaccountedAllocError) throw unaccountedAllocError;
          }
        }
      }

      // 4. Mark purchase as received
      const { error: purchaseError } = await supabase
        .from("purchases")
        .update({
          received_inventory: true,
          received_at: new Date().toISOString(),
          status: "received",
        })
        .eq("id", payload.purchaseId);

      if (purchaseError) throw purchaseError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreceived-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["consolidated-inventory"] });
      toast({
        title: "Stock received",
        description: "The purchase order has been received and inventory updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to receive stock: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    unreceivedPurchases: unreceivedPurchasesQuery.data || [],
    isLoadingUnreceived: unreceivedPurchasesQuery.isLoading,
    systemWarehouse: systemWarehouseQuery.data,
    receiveStock: receiveStockMutation.mutateAsync,
    isReceiving: receiveStockMutation.isPending,
  };
}

async function upsertInventory(
  itemDetailId: string | null,
  warehouseId: string,
  quantity: number
): Promise<number> {
  if (!itemDetailId) return 0;

  const { data: existing } = await supabase
    .from("inventory")
    .select("id, quantity_on_hand")
    .eq("item_detail_id", itemDetailId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  const newBalance = (existing?.quantity_on_hand || 0) + quantity;

  if (existing) {
    const { error } = await supabase
      .from("inventory")
      .update({
        quantity_on_hand: newBalance,
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("inventory")
      .insert({
        item_detail_id: itemDetailId,
        warehouse_id: warehouseId,
        quantity_on_hand: quantity,
      });
    if (error) throw error;
  }

  return newBalance;
}
