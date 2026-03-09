import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ItemType {
  id: string;
  name: string;
  is_routable: boolean;
  is_sellable: boolean;
  is_asset: boolean;
  is_supply: boolean;
  created_at: string;
}

export function useItemTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemTypesQuery = useQuery({
    queryKey: ["item_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("item_types")
        .select("id, name, is_routable, is_sellable, is_asset, is_supply, created_at")
        .order("name");
      if (error) throw error;
      return (data || []) as ItemType[];
    },
  });

  const createItemType = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any)
        .from("item_types")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data as ItemType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to create item type: ${error.message}`, variant: "destructive" });
    },
  });

  const checkLinkedItems = async (itemTypeId: string) => {
    const { data, error } = await (supabase as any)
      .from("item_details")
      .select("id, name, sku")
      .eq("item_type_id", itemTypeId);
    if (error) throw error;
    return (data || []) as { id: string; name: string; sku: string }[];
  };

  const deleteItemType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("item_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
      toast({ title: "Item type deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete: ${error.message}`, variant: "destructive" });
    },
  });

  const updateItemTypeForItems = async (itemIds: string[], newItemTypeId: string) => {
    for (const itemId of itemIds) {
      const { error } = await supabase
        .from("item_details")
        .update({ item_type_id: newItemTypeId } as any)
        .eq("id", itemId);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ["item_details_with_categories"] });
  };

  // Helper: get IDs for a specific flag
  const getTypeIdsByFlag = (flag: keyof Pick<ItemType, "is_routable" | "is_sellable" | "is_asset" | "is_supply">): string[] => {
    return (itemTypesQuery.data || []).filter((t) => t[flag]).map((t) => t.id);
  };

  return {
    itemTypes: itemTypesQuery.data || [],
    isLoading: itemTypesQuery.isLoading,
    createItemType: createItemType.mutateAsync,
    deleteItemType: deleteItemType.mutateAsync,
    checkLinkedItems,
    updateItemTypeForItems,
    getTypeIdsByFlag,
  };
}
