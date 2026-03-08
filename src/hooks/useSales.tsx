import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SaleLineInput {
  item_detail_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSalePayload {
  sale_date: string;
  buyer_name: string | null;
  buyer_contact: string | null;
  warehouse_id: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  currency: string;
  paid: boolean;
  created_by: string;
  items: SaleLineInput[];
}

export function useSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*, item_details:item_detail_id(id, name, sku))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses-non-system"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_system", false)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["item-details-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, cost_price, type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const { data, error } = await supabase.rpc("create_sales_order", {
        payload: payload as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-ledger"] });
      toast({ title: "Sale created", description: "Sales order recorded successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error creating sale", description: error.message, variant: "destructive" });
    },
  });

  return {
    sales: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    warehouses: warehousesQuery.data || [],
    items: itemsQuery.data || [],
    createSale: createSaleMutation.mutateAsync,
    isCreating: createSaleMutation.isPending,
  };
}

export function useSaleDetail(id: string) {
  return useQuery({
    queryKey: ["sale", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*, item_details:item_detail_id(id, name, sku)), warehouses:warehouse_id(id, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useStockCheck(warehouseId: string | null, itemIds: string[]) {
  return useQuery({
    queryKey: ["stock-check", warehouseId, itemIds],
    queryFn: async () => {
      if (!warehouseId || itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from("inventory")
        .select("item_detail_id, quantity_on_hand")
        .eq("warehouse_id", warehouseId)
        .in("item_detail_id", itemIds);
      if (error) throw error;
      return data;
    },
    enabled: !!warehouseId && itemIds.length > 0,
  });
}
