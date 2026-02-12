import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PurchaseStatus = "draft" | "pending" | "in_transit" | "arrived" | "received" | "cancelled";
export type PurchaseType = "local" | "import";
export type DistributionMethod = "by_value" | "by_quantity" | "by_cbm";

export interface PurchaseLineItem {
  id?: string;
  item_detail_id?: string;
  quantity_ordered: number;
  unit_cost: number;
  cbm?: number;
  item_name?: string;
  sku?: string;
  fees?: { fee_name: string; amount: number }[];
}

export interface GlobalFee {
  id?: string;
  fee_name: string;
  amount: number;
  distribution_method: DistributionMethod;
}

export interface Purchase {
  id: string;
  purchase_order_number: string;
  supplier_id: string | null;
  status: PurchaseStatus;
  type: PurchaseType;
  currency: string;
  total_amount: number;
  expected_arrival_date: string | null;
  created_at: string;
  local_tax_rate: number;
  received_inventory: boolean;
  received_at: string | null;
  supplier?: {
    id: string;
    name: string;
  };
  purchase_items?: {
    id: string;
    quantity_ordered: number;
    unit_cost: number;
    cbm: number;
    item_detail?: {
      id: string;
      name: string;
      sku: string;
    };
  }[];
}

export interface CreatePurchaseData {
  type: PurchaseType;
  supplier_id: string;
  expected_arrival_date?: string;
  local_tax_rate?: number;
  currency?: string;
  line_items: PurchaseLineItem[];
  global_fees: GlobalFee[];
  total_amount: number;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  is_system?: boolean;
}

export function usePurchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purchasesQuery = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          *,
          supplier:suppliers(id, name),
          purchase_items(
            id,
            quantity_ordered,
            unit_cost,
            cbm,
            item_detail:item_details(id, name, sku)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Purchase[];
    },
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, address, is_system")
        .order("name");

      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("warehouses")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData: CreatePurchaseData) => {
      // Generate PO number
      const poNumber = `PO-${Date.now()}`;

      // Create purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          purchase_order_number: poNumber,
          type: purchaseData.type,
          supplier_id: purchaseData.supplier_id,
          expected_arrival_date: purchaseData.expected_arrival_date,
          local_tax_rate: purchaseData.local_tax_rate || 0,
          currency: purchaseData.currency || "USD",
          total_amount: purchaseData.total_amount,
          status: "pending" as PurchaseStatus,
          received_inventory: false,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create line items
      if (purchaseData.line_items.length > 0) {
        const lineItems = [];
        for (const item of purchaseData.line_items) {
          let itemDetailId = item.item_detail_id || null;

          // If no existing item_detail linked, create a new one
          if (!itemDetailId && item.item_name) {
            const { data: newItem, error: newItemError } = await supabase
              .from("item_details")
              .insert({
                name: item.item_name,
                sku: item.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
                type: "merchandise" as const,
              })
              .select()
              .single();

            if (newItemError) throw newItemError;
            itemDetailId = newItem.id;
          }

          lineItems.push({
            purchase_id: purchase.id,
            item_detail_id: itemDetailId,
            quantity_ordered: item.quantity_ordered,
            unit_cost: item.unit_cost,
            cbm: item.cbm || 0,
            quantity_remaining: item.quantity_ordered,
            active_item: true,
            arrival_order: lineItems.length + 1,
          });
        }

        const { data: createdLines, error: linesError } = await supabase
          .from("purchase_items")
          .insert(lineItems)
          .select();

        if (linesError) throw linesError;

        // Create line item fees
        for (let i = 0; i < purchaseData.line_items.length; i++) {
          const item = purchaseData.line_items[i];
          if (item.fees && item.fees.length > 0 && createdLines[i]) {
            const lineFees = item.fees.map((fee) => ({
              purchase_line_id: createdLines[i].id,
              fee_name: fee.fee_name,
              amount: fee.amount,
            }));

            const { error: feesError } = await supabase
              .from("purchase_line_fees")
              .insert(lineFees);

            if (feesError) throw feesError;
          }
        }
      }

      // Create global fees
      if (purchaseData.global_fees.length > 0) {
        const globalFees = purchaseData.global_fees.map((fee) => ({
          purchase_id: purchase.id,
          fee_name: fee.fee_name,
          amount: fee.amount,
          distribution_method: fee.distribution_method,
        }));

        const { error: globalFeesError } = await supabase
          .from("purchase_global_fees")
          .insert(globalFees);

        if (globalFeesError) throw globalFeesError;
      }

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({
        title: "Purchase created",
        description: "The purchase order has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: PurchaseStatus;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      // If marking as received, also set received_inventory and received_at
      if (status === "received") {
        updateData.received_inventory = true;
        updateData.received_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("purchases")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({
        title: "Status updated",
        description: "The purchase status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({
        title: "Purchase deleted",
        description: "The purchase order has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    purchases: purchasesQuery.data || [],
    warehouses: warehousesQuery.data || [],
    isLoading: purchasesQuery.isLoading,
    isWarehousesLoading: warehousesQuery.isLoading,
    createPurchase: createPurchaseMutation.mutate,
    createWarehouse: createWarehouseMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutate,
    deletePurchase: deletePurchaseMutation.mutate,
    isCreating: createPurchaseMutation.isPending,
  };
}
