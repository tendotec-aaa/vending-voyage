import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

type UserRole = 'admin' | 'route_operator' | 'warehouse_manager';

interface RequireRoleProps {
  children: ReactNode;
  roles: UserRole[];
  redirectTo?: string;
}

export function RequireRole({ children, roles, redirectTo = '/' }: RequireRoleProps) {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role || !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
