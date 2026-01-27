import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  email: string | null;
  first_names: string | null;
  last_names: string | null;
  personal_id_number: string | null;
  phone_number: string | null;
  address: string | null;
  employed_since: string | null;
  has_driver_license: boolean | null;
  driver_license_type: string | null;
  driver_license_expiry_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  profile_completed: boolean | null;
  active: boolean | null;
  role: "admin" | "route_operator" | "warehouse_manager" | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateProfileData {
  first_names?: string;
  last_names?: string;
  personal_id_number?: string;
  phone_number?: string;
  address?: string;
  employed_since?: string;
  has_driver_license?: boolean;
  driver_license_type?: string;
  driver_license_expiry_date?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  profile_completed?: boolean;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile,
    isProfileComplete: profileQuery.data?.profile_completed ?? false,
    isActive: profileQuery.data?.active ?? false,
  };
}
