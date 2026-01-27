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

  // Redirect to onboarding if profile not completed (and not already on onboarding)
  if (profile && !isProfileComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If profile is complete but user is not active, show a pending message
  if (profile && isProfileComplete && !isActive && location.pathname !== "/onboarding") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Account Pending Activation</h2>
          <p className="text-muted-foreground">
            Your account is awaiting approval from an administrator. 
            You'll be notified once your access has been granted.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
