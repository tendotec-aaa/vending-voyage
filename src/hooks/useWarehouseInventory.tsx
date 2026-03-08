import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { insertItemDetailWithRetrySku } from "@/lib/skuGenerator";

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
  is_transitional: boolean | null;
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
        .select("id, name, address, description, is_system, is_transitional, created_at")
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
    mutationFn: async (data: { name: string; address?: string; description?: string; is_transitional?: boolean }) => {
      const { data: result, error } = await supabase
        .from("warehouses")
        .insert({
          name: data.name,
          address: data.address || null,
          description: data.description || null,
          is_transitional: data.is_transitional ?? false,
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

  const unloadVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, destinationWarehouseId, userId }: {
      vehicleId: string;
      destinationWarehouseId: string;
      userId: string;
    }) => {
      const { error } = await supabase.rpc("unload_vehicle", {
        p_vehicle_id: vehicleId,
        p_destination_warehouse_id: destinationWarehouseId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_ledger"] });
      toast({ title: "Vehicle unloaded", description: "All inventory has been transferred to the destination bodega." });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to unload vehicle: ${error.message}`, variant: "destructive" });
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
    unloadVehicle: unloadVehicleMutation.mutateAsync,
    isAdding: addInventoryMutation.isPending,
    isCreatingItem: createItemDetailMutation.isPending,
    isCreatingWarehouse: createWarehouseMutation.isPending,
    isUnloading: unloadVehicleMutation.isPending,
  };
}
