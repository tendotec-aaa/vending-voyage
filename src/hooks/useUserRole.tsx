import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type UserRole = 'admin' | 'route_operator' | 'warehouse_manager';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      return data?.role as UserRole | null;
    },
    enabled: !!user?.id,
  });

  const isAdmin = role === 'admin';
  const isRouteOperator = role === 'route_operator';
  const isWarehouseManager = role === 'warehouse_manager';

  return {
    role,
    isLoading,
    isAdmin,
    isRouteOperator,
    isWarehouseManager,
  };
}
