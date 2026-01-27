import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
}

export function useCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  const subcategoriesQuery = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: name.trim() })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create category: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({ name, categoryId }: { name: string; categoryId: string }) => {
      const { data, error } = await supabase
        .from("subcategories")
        .insert({ name: name.trim(), category_id: categoryId })
        .select()
        .single();

      if (error) throw error;
      return data as Subcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create subcategory: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getSubcategoriesByCategory = (categoryId: string | undefined) => {
    if (!categoryId) return [];
    return (subcategoriesQuery.data || []).filter(
      (sub) => sub.category_id === categoryId
    );
  };

  return {
    categories: categoriesQuery.data || [],
    subcategories: subcategoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading || subcategoriesQuery.isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    createSubcategory: createSubcategoryMutation.mutateAsync,
    getSubcategoriesByCategory,
    isCreatingCategory: createCategoryMutation.isPending,
    isCreatingSubcategory: createSubcategoryMutation.isPending,
  };
}
