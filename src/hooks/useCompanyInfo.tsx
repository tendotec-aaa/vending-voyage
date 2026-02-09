import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyInfo {
  id: string;
  company_name: string;
  trade_name: string | null;
  tax_id: string | null;
  registration_number: string | null;
  country: string | null;
  state_province: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  default_currency: string | null;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export type CompanyInfoFormData = Omit<CompanyInfo, "id" | "created_at" | "updated_at">;

export function useCompanyInfo() {
  const queryClient = useQueryClient();

  const { data: companyInfo, isLoading } = useQuery({
    queryKey: ["company_info"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("company_info" as any)
        .select("*")
        .limit(1)
        .maybeSingle() as unknown as Promise<{ data: CompanyInfo | null; error: any }>);

      if (error) throw error;
      return data;
    },
  });

  const upsertCompanyInfo = useMutation({
    mutationFn: async (formData: CompanyInfoFormData) => {
      if (companyInfo?.id) {
        const { error } = await supabase
          .from("company_info" as any)
          .update(formData as any)
          .eq("id", companyInfo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_info" as any)
          .insert(formData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_info"] });
      toast.success("Company information saved successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  return { companyInfo, isLoading, upsertCompanyInfo };
}
