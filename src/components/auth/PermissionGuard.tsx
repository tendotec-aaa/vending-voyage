import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { usePermissions, PermissionKey } from '@/hooks/usePermissions';
import { AccessDenied } from './AccessDenied';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPerm: PermissionKey;
}

export function PermissionGuard({ children, requiredPerm }: PermissionGuardProps) {
  const { has, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!has(requiredPerm)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
