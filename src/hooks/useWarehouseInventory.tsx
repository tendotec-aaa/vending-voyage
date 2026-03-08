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

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  is_system: boolean;
  created_at: string | null;
}

export function useWarehouseInventory(warehouseFilter?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", warehouseFilter],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select(`
          *,
          item_detail:item_details(
            id, name, sku, category_id, subcategory_id,
            category:categories(id, name),
            subcategory:subcategories(id, name)
          ),
          warehouse:warehouses(id, name)
        `)
        .not("warehouse_id", "is", null)
        .order("last_updated", { ascending: false });

      if (warehouseFilter && warehouseFilter !== "all") {
        query = query.eq("warehouse_id", warehouseFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WarehouseItem[];
    },
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, address, description, is_system, created_at")
        .order("is_system", { ascending: true })
        .order("name");

      if (error) throw error;
      return data as Warehouse[];
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

  const createWarehouseMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from("warehouses")
        .insert({
          name: data.name,
          address: data.address || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses-list"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "Warehouse created", description: "New warehouse has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create warehouse: ${error.message}`, variant: "destructive" });
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
        const totalQuantity = (existing.quantity_on_hand || 0) + quantity;
        const { data, error } = await supabase
          .from("inventory")
          .update({ quantity_on_hand: totalQuantity, last_updated: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
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
      toast({ title: "Success", description: "Item added to inventory" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to add item: ${error.message}`, variant: "destructive" });
    },
  });

  const createItemDetailMutation = useMutation({
    mutationFn: async ({
      name,
      categoryId,
      subcategoryId,
      categoryName,
      subcategoryName,
    }: {
      name: string;
      categoryId?: string;
      subcategoryId?: string;
      categoryName?: string;
      subcategoryName?: string;
    }) => {
      const data = await insertItemDetailWithRetrySku(
        {
          name: name.trim(),
          type: "merchandise" as const,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
        },
        categoryName,
        subcategoryName
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-details"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create item: ${error.message}`, variant: "destructive" });
    },
  });

  return {
    inventory: inventoryQuery.data || [],
    warehouses: warehousesQuery.data || [],
    itemDetails: itemDetailsQuery.data || [],
    isLoading: inventoryQuery.isLoading,
    isWarehousesLoading: warehousesQuery.isLoading,
    addInventory: addInventoryMutation.mutateAsync,
    createItemDetail: createItemDetailMutation.mutateAsync,
    createWarehouse: createWarehouseMutation.mutateAsync,
    isAdding: addInventoryMutation.isPending,
    isCreatingItem: createItemDetailMutation.isPending,
    isCreatingWarehouse: createWarehouseMutation.isPending,
  };
}
