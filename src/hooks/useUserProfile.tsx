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

      // If no profile exists yet, create it (this avoids relying on triggers on auth.users)
      if (!data) {
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            email: user.email,
            active: false,
            profile_completed: false,
          });

        // If a profile was created concurrently, ignore duplicate-key errors.
        // Otherwise, surface the error.
        if (insertError && insertError.code !== "23505") {
          throw insertError;
        }

        const { data: created, error: createdError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (createdError) throw createdError;
        return created as UserProfile | null;
      }

      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Sanitize data: convert empty strings to null for date fields
      const sanitizedData: Record<string, unknown> = { ...profileData };
      
      // Date fields that should be null instead of empty string
      const dateFields = ['employed_since', 'driver_license_expiry_date'];
      dateFields.forEach((field) => {
        if (sanitizedData[field] === '') {
          sanitizedData[field] = null;
        }
      });

      // Optional string fields that should be null instead of empty string
      const optionalStringFields = [
        'personal_id_number', 'phone_number', 'address', 
        'driver_license_type', 'emergency_contact_name', 'emergency_contact_number'
      ];
      optionalStringFields.forEach((field) => {
        if (sanitizedData[field] === '') {
          sanitizedData[field] = null;
        }
      });

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...sanitizedData,
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
