import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCallback } from 'react';

export type PermissionKey =
  | 'view_costs'
  | 'view_profits'
  | 'view_stock'
  | 'edit_bodega'
  | 'view_all_routes'
  | 'manage_own_route'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_purchases'
  | 'manage_sales'
  | 'manage_maintenance'
  | 'manage_expenses';

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'view_costs',
  'view_profits',
  'view_stock',
  'edit_bodega',
  'view_all_routes',
  'manage_own_route',
  'manage_users',
  'view_analytics',
  'manage_purchases',
  'manage_sales',
  'manage_maintenance',
  'manage_expenses',
];

export const PERMISSION_CATEGORIES: Record<string, { label: string; keys: PermissionKey[] }> = {
  finance: { label: 'Finance', keys: ['view_costs', 'view_profits', 'manage_expenses'] },
  inventory: { label: 'Inventory', keys: ['view_stock', 'edit_bodega'] },
  operations: { label: 'Operations', keys: ['view_all_routes', 'manage_own_route'] },
  supply_chain: { label: 'Supply Chain', keys: ['manage_purchases', 'manage_sales'] },
  admin: { label: 'Admin', keys: ['manage_users', 'view_analytics', 'manage_maintenance'] },
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_costs: 'View Costs',
  view_profits: 'View Profits',
  view_stock: 'View Stock',
  edit_bodega: 'Edit Warehouse',
  view_all_routes: 'View All Routes',
  manage_own_route: 'Manage Own Route',
  manage_users: 'Manage Users',
  view_analytics: 'View Analytics',
  manage_purchases: 'Manage Purchases',
  manage_sales: 'Manage Sales',
  manage_maintenance: 'Manage Maintenance',
};

interface UserPermissions {
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  scope: { type: string; scopeId: string | null } | null;
  isAdmin: boolean;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<UserPermissions>({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return { roleId: null, roleName: null, permissions: [], scope: null, isAdmin: false };

      // Check if user is admin via old system (backward compat)
      const { data: oldRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = oldRole?.role === 'admin';

      // Fetch assignment with role and permissions
      const { data: assignment } = await supabase
        .from('user_assignments')
        .select('role_id, scope_type, scope_id')
        .eq('user_id', user.id)
        .single();

      if (!assignment) {
        return { roleId: null, roleName: null, permissions: [], scope: null, isAdmin };
      }

      // Fetch role name
      const { data: role } = await supabase
        .from('app_roles')
        .select('name')
        .eq('id', assignment.role_id)
        .single();

      // Fetch enabled permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .eq('role_id', assignment.role_id)
        .eq('is_enabled', true);

      return {
        roleId: assignment.role_id,
        roleName: role?.name || null,
        permissions: perms?.map((p) => p.permission_key) || [],
        scope: { type: assignment.scope_type, scopeId: assignment.scope_id },
        isAdmin,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const has = useCallback(
    (key: PermissionKey): boolean => {
      if (!data) return false;
      // Admins always pass
      if (data.isAdmin) return true;
      return data.permissions.includes(key);
    },
    [data]
  );

  return {
    has,
    permissions: data?.permissions || [],
    scope: data?.scope || null,
    roleId: data?.roleId || null,
    roleName: data?.roleName || null,
    isAdmin: data?.isAdmin || false,
    isLoading,
  };
}
