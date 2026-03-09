import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserLocations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['user-location-assignments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_location_assignments')
        .select('location_id')
        .eq('user_id', userId);
      if (error) {
        console.error('Error fetching user location assignments:', error);
        return [];
      }
      return data.map((a: any) => a.location_id as string);
    },
    enabled: !!userId,
  });

  const locationIds = assignments ?? [];

  const isAssigned = (locationId: string) => locationIds.includes(locationId);

  const assignLocation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('user_location_assignments')
        .insert({ user_id: userId, location_id: locationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location-assignments', userId] });
    },
  });

  const unassignLocation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('No user ID');
      const { error } = await supabase
        .from('user_location_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location-assignments', userId] });
    },
  });

  return {
    locationIds,
    isLoading,
    isAssigned,
    assignLocation: assignLocation.mutateAsync,
    unassignLocation: unassignLocation.mutateAsync,
    isAssigning: assignLocation.isPending,
    isUnassigning: unassignLocation.isPending,
  };
}
