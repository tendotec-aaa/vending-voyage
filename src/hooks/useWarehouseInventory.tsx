import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WarehouseItem {
  id: string;
  item_definition_id: string;
  quantity_on_hand: number;
  average_cost: number;
  last_updated: string;
  item_definition: {
    id: string;
    name: string;
    sku: string;
    category_id: string | null;
    subcategory_id: string | null;
    category?: { id: string; name: string } | null;
    subcategory?: { id: string; name: string } | null;
  };
}

export interface ItemDefinition {
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
        .from("warehouse_inventory")
        .select(`
          *,
          item_definition:item_definitions(
            id,
            name,
            sku,
            category_id,
            subcategory_id,
            category:categories(id, name),
            subcategory:subcategories(id, name)
          )
        `)
        .order("last_updated", { ascending: false });

      if (error) throw error;
      return data as WarehouseItem[];
    },
  });

  const itemDefinitionsQuery = useQuery({
    queryKey: ["item-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_definitions")
        .select("id, name, sku, category_id, subcategory_id")
        .order("name");

      if (error) throw error;
      return data as ItemDefinition[];
    },
  });

  const addInventoryMutation = useMutation({
    mutationFn: async ({
      itemDefinitionId,
      quantity,
      unitCost,
    }: {
      itemDefinitionId: string;
      quantity: number;
      unitCost: number;
    }) => {
      // Check if item already exists in warehouse
      const { data: existing } = await supabase
        .from("warehouse_inventory")
        .select("id, quantity_on_hand, average_cost")
        .eq("item_definition_id", itemDefinitionId)
        .single();

      if (existing) {
        // Update existing - calculate new average cost
        const totalQuantity = existing.quantity_on_hand + quantity;
        const newAverageCost =
          (existing.quantity_on_hand * existing.average_cost + quantity * unitCost) /
          totalQuantity;

        const { data, error } = await supabase
          .from("warehouse_inventory")
          .update({
            quantity_on_hand: totalQuantity,
            average_cost: newAverageCost,
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
          .from("warehouse_inventory")
          .insert({
            item_definition_id: itemDefinitionId,
            quantity_on_hand: quantity,
            average_cost: unitCost,
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
        description: "Item added to warehouse inventory",
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

  const createItemDefinitionMutation = useMutation({
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
        .from("item_definitions")
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
      queryClient.invalidateQueries({ queryKey: ["item-definitions"] });
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
    itemDefinitions: itemDefinitionsQuery.data || [],
    isLoading: inventoryQuery.isLoading || itemDefinitionsQuery.isLoading,
    addInventory: addInventoryMutation.mutateAsync,
    createItemDefinition: createItemDefinitionMutation.mutateAsync,
    isAdding: addInventoryMutation.isPending,
    isCreatingItem: createItemDefinitionMutation.isPending,
  };
}
