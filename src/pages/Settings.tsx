import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Key, 
  LogOut, 
  Loader2,
  Mail,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { theme, setTheme } = useTheme();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Notification preferences (local state - could be extended to persist in DB)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [visitReminders, setVisitReminders] = useState(true);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const handleSignOutAllDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success("Signed out from all devices");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out from all devices");
    }
  };

  return (
    <AppLayout
      title="Settings"
      subtitle="Manage your account and preferences"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Account Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Your account information and status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user?.email || "Not available"}</span>
                  {user?.email_confirmed_at && (
                    <Badge variant="secondary" className="ml-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Account Status</Label>
                <div className="flex items-center gap-2">
                  {profile?.active ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pending Activation
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Role</Label>
                <Badge variant="outline">
                  {profile?.role === 'admin' ? 'Administrator' : 
                   profile?.role === 'route_operator' ? 'Route Operator' : 
                   profile?.role === 'warehouse_manager' ? 'Warehouse Manager' : 
                   'Loading...'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Profile</Label>
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about urgent maintenance tickets
                </p>
              </div>
              <Switch
                checked={maintenanceAlerts}
                onCheckedChange={setMaintenanceAlerts}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visit Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders for upcoming scheduled visits
                </p>
              </div>
              <Switch
                checked={visitReminders}
                onCheckedChange={setVisitReminders}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your password and sessions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Change Password */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base font-medium">Change Password</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Session Management */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Session Management</Label>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                <Button variant="destructive" onClick={handleSignOutAllDevices}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out All Devices
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Sign out from this device or all devices where you're currently logged in.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info Footer */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>User ID: {user?.id?.slice(0, 8)}...</span>
              <span>Last Sign In: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</span>
              <span>Account Created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
