import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WarehouseItem {
  id: string;
  item_detail_id: string;
  quantity_on_hand: number;
  warehouse_id: string | null;
  spot_id: string | null;
  slot_id: string | null;
  last_updated: string;
  item_detail: {
    id: string;
    name: string;
    sku: string;
    category_id: string | null;
    subcategory_id: string | null;
    category?: { id: string; name: string } | null;
    subcategory?: { id: string; name: string } | null;
  };
  warehouse?: { id: string; name: string } | null;
}

export interface ItemDetail {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  subcategory_id: string | null;
}

export function useWarehouseInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          item_detail:item_details(
            id,
            name,
            sku,
            category_id,
            subcategory_id,
            category:categories(id, name),
            subcategory:subcategories(id, name)
          ),
          warehouse:warehouses(id, name)
        `)
        .order("last_updated", { ascending: false });

      if (error) throw error;
      return data as WarehouseItem[];
    },
  });

  const itemDetailsQuery = useQuery({
    queryKey: ["item-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, category_id, subcategory_id")
        .order("name");

      if (error) throw error;
      return data as ItemDetail[];
    },
  });

  const addInventoryMutation = useMutation({
    mutationFn: async ({
      itemDetailId,
      quantity,
      warehouseId,
    }: {
      itemDetailId: string;
      quantity: number;
      warehouseId?: string;
    }) => {
      // Check if item already exists in the same warehouse
      let query = supabase
        .from("inventory")
        .select("id, quantity_on_hand")
        .eq("item_detail_id", itemDetailId);

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      } else {
        query = query.is("warehouse_id", null);
      }

      const { data: existing } = await query.single();

      if (existing) {
        // Update existing - add to quantity
        const totalQuantity = (existing.quantity_on_hand || 0) + quantity;

        const { data, error } = await supabase
          .from("inventory")
          .update({
            quantity_on_hand: totalQuantity,
            last_updated: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("inventory")
          .insert({
            item_detail_id: itemDetailId,
            quantity_on_hand: quantity,
            warehouse_id: warehouseId || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      toast({
        title: "Success",
        description: "Item added to inventory",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createItemDetailMutation = useMutation({
    mutationFn: async ({
      name,
      categoryId,
      subcategoryId,
    }: {
      name: string;
      categoryId?: string;
      subcategoryId?: string;
    }) => {
      // Generate a simple SKU
      const sku = `SKU-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("item_details")
        .insert({
          name: name.trim(),
          sku,
          type: "merchandise" as const,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-details"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    inventory: inventoryQuery.data || [],
    itemDetails: itemDetailsQuery.data || [],
    isLoading: inventoryQuery.isLoading || itemDetailsQuery.isLoading,
    addInventory: addInventoryMutation.mutateAsync,
    createItemDetail: createItemDetailMutation.mutateAsync,
    isAdding: addInventoryMutation.isPending,
    isCreatingItem: createItemDetailMutation.isPending,
  };
}
