import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Truck, Warehouse, Calculator } from "lucide-react";
import { RequireRole } from "@/components/auth/RequireRole";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-destructive text-destructive-foreground", icon: Shield },
  route_operator: { label: "Route Operator", color: "bg-primary text-primary-foreground", icon: Truck },
  warehouse_manager: { label: "Warehouse Mgr", color: "bg-secondary text-secondary-foreground", icon: Warehouse },
  accountant: { label: "Accountant", color: "bg-accent text-accent-foreground", icon: Calculator },
};

function UserDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-muted-foreground">Loading user profile...</div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-muted-foreground">User not found</div>
      </AppLayout>
    );
  }

  const role = userRole?.role as UserRole | undefined;
  const config = role ? roleConfig[role] : null;
  const displayName = [profile.first_names, profile.last_names].filter(Boolean).join(" ") || profile.email || "Unknown";

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-foreground">{value || "—"}</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/users")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {role && config && (
                <Badge className={config.color}>{config.label}</Badge>
              )}
              <Badge variant={profile.active ? "default" : "secondary"}>
                {profile.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="First Names" value={profile.first_names} />
              <InfoRow label="Last Names" value={profile.last_names} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone_number} />
              <InfoRow label="Address" value={profile.address} />
              <InfoRow label="Personal ID" value={profile.personal_id_number} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Employment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Employed Since" value={profile.employed_since} />
              <InfoRow label="Profile Completed" value={profile.profile_completed ? "Yes" : "No"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Driver's License</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Has License" value={profile.has_driver_license ? "Yes" : "No"} />
              <InfoRow label="License Type" value={profile.driver_license_type} />
              <InfoRow label="Expiry Date" value={profile.driver_license_expiry_date} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Contact Name" value={profile.emergency_contact_name} />
              <InfoRow label="Contact Number" value={profile.emergency_contact_number} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function UserDetail() {
  return (
    <RequireRole roles={["admin"]}>
      <UserDetailContent />
    </RequireRole>
  );
}
