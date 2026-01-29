import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, isProfileComplete, isActive } = useUserProfile();
  const location = useLocation();

  // Show loading while checking auth
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to profile if profile not completed (and not already on profile)
  if (profile && !isProfileComplete && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  // If profile is complete but user is not active, only allow access to profile page
  if (profile && isProfileComplete && !isActive && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
