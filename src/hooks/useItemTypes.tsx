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
  is_component: boolean;
  created_at: string;
}

export type ItemTypeFlag = "is_routable" | "is_sellable" | "is_asset" | "is_supply" | "is_component";

export function useItemTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemTypesQuery = useQuery({
    queryKey: ["item_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("item_types")
        .select("id, name, is_routable, is_sellable, is_asset, is_supply, is_component, created_at")
        .order("name");
      if (error) throw error;
      return (data || []) as ItemType[];
    },
  });

  const createItemType = useMutation({
    mutationFn: async (params: { name: string; is_routable?: boolean; is_sellable?: boolean; is_asset?: boolean; is_supply?: boolean; is_component?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from("item_types")
        .insert({
          name: params.name,
          is_routable: params.is_routable ?? false,
          is_sellable: params.is_sellable ?? false,
          is_asset: params.is_asset ?? false,
          is_supply: params.is_supply ?? false,
          is_component: params.is_component ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ItemType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
      toast({ title: "Item type created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to create item type: ${error.message}`, variant: "destructive" });
    },
  });

  const updateItemType = useMutation({
    mutationFn: async (params: { id: string; name?: string; is_routable?: boolean; is_sellable?: boolean; is_asset?: boolean; is_supply?: boolean; is_component?: boolean }) => {
      const { id, ...updates } = params;
      const { error } = await (supabase as any)
        .from("item_types")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
      toast({ title: "Item type updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to update: ${error.message}`, variant: "destructive" });
    },
  });

  const updateItemTypeFlag = useMutation({
    mutationFn: async ({ id, flag, value }: { id: string; flag: ItemTypeFlag; value: boolean }) => {
      const { error } = await (supabase as any)
        .from("item_types")
        .update({ [flag]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to update flag: ${error.message}`, variant: "destructive" });
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

  const getTypeIdsByFlag = (flag: keyof Pick<ItemType, "is_routable" | "is_sellable" | "is_asset" | "is_supply" | "is_component">): string[] => {
    return (itemTypesQuery.data || []).filter((t) => t[flag]).map((t) => t.id);
  };

  return {
    itemTypes: itemTypesQuery.data || [],
    isLoading: itemTypesQuery.isLoading,
    createItemType: createItemType.mutateAsync,
    updateItemType: updateItemType.mutateAsync,
    updateItemTypeFlag: updateItemTypeFlag.mutate,
    isUpdatingFlag: updateItemTypeFlag.isPending,
    deleteItemType: deleteItemType.mutateAsync,
    checkLinkedItems,
    updateItemTypeForItems,
    getTypeIdsByFlag,
  };
}
