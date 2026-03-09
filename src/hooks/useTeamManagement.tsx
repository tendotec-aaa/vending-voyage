import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "./useUserProfile";

export type UserRole = "admin" | "route_operator" | "warehouse_manager";

export interface TeamMember extends UserProfile {
  user_role?: {
    role: UserRole;
  } | null;
}

export function useTeamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      // Get all user profiles (admin only due to RLS)
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge roles into profiles
      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]));
      
      return (profiles || []).map((profile) => ({
        ...profile,
        user_role: rolesMap.has(profile.id) 
          ? { role: rolesMap.get(profile.id) as UserRole }
          : null,
      })) as TeamMember[];
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
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

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      // Auto-assign Route Operator role with global scope on activation
      if (active) {
        // Check if user already has an assignment
        const { data: existingAssignment } = await supabase
          .from("user_assignments")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingAssignment) {
          // Get the "Route Operator" app_role ID
          const { data: routeOperatorRole } = await supabase
            .from("app_roles")
            .select("id")
            .eq("name", "Route Operator")
            .maybeSingle();

          if (routeOperatorRole) {
            await supabase.from("user_assignments").insert({
              user_id: userId,
              role_id: routeOperatorRole.id,
              scope_type: "global",
              scope_id: null,
            });
          }
        }
      }
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-assignments-all"] });
      toast({
        title: active ? "User Activated" : "User Deactivated",
        description: active 
          ? "The user can now access the system."
          : "The user's access has been revoked.",
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

  const inviteUser = useMutation({
    mutationFn: async ({ 
      email, 
      firstName, 
      lastName,
      role 
    }: { 
      email: string; 
      firstName: string; 
      lastName: string;
      role: UserRole;
    }) => {
      // Use Supabase admin invite (requires service role key in edge function)
      // For now, we'll create a placeholder that admins can use
      // In production, this would call an edge function that uses admin.auth.admin.inviteUserByEmail
      
      toast({
        title: "Invite Feature",
        description: "User invitation requires an edge function with admin privileges. For now, users can sign up and admins can approve them.",
      });
      
      return { email, firstName, lastName, role };
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
    teamMembers: teamQuery.data || [],
    isLoading: teamQuery.isLoading,
    error: teamQuery.error,
    updateUserRole,
    toggleUserActive,
    inviteUser,
    refetch: teamQuery.refetch,
  };
}
