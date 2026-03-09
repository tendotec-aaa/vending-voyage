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
import { useTranslation } from "react-i18next";
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
  Monitor,
  Languages
} from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [visitReminders, setVisitReminders] = useState(true);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('settings.passwordUpdated'));
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('settings.signedOut'));
  };

  const handleSignOutAllDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success(t('settings.signedOutAll'));
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out from all devices");
    }
  };

  return (
    <AppLayout title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="space-y-6 max-w-4xl">
        {/* Account Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>{t('settings.account')}</CardTitle>
                <CardDescription>{t('settings.accountDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('settings.emailAddress')}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user?.email || "N/A"}</span>
                  {user?.email_confirmed_at && (
                    <Badge variant="secondary" className="ml-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('common.verified')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('settings.accountStatus')}</Label>
                <div className="flex items-center gap-2">
                  {profile?.active ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('common.active')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t('settings.pendingActivation')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('settings.role')}</Label>
                <Badge variant="outline">
                  {profile?.role === 'admin' ? t('settings.administrator') : 
                   profile?.role === 'route_operator' ? t('settings.routeOperator') : 
                   profile?.role === 'warehouse_manager' ? t('settings.warehouseManager') : 
                   t('common.loading')}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t('sidebar.profile')}</Label>
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      {t('settings.editProfile')}
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
                <CardTitle>{t('settings.appearance')}</CardTitle>
                <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>{t('settings.theme')}</Label>
              <div className="flex gap-2">
                <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>
                  <Sun className="w-4 h-4 mr-2" /> {t('settings.light')}
                </Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>
                  <Moon className="w-4 h-4 mr-2" /> {t('settings.dark')}
                </Button>
                <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>
                  <Monitor className="w-4 h-4 mr-2" /> {t('settings.system')}
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div>
                <Label>{t('settings.language')}</Label>
                <p className="text-sm text-muted-foreground mt-0.5">{t('settings.languageDesc')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={i18n.language === 'es' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => i18n.changeLanguage('es')}
                >
                  <Languages className="w-4 h-4 mr-2" /> Español
                </Button>
                <Button
                  variant={i18n.language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => i18n.changeLanguage('en')}
                >
                  <Languages className="w-4 h-4 mr-2" /> English
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
                <CardTitle>{t('settings.notifications')}</CardTitle>
                <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.emailNotifications')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.emailNotificationsDesc')}</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.maintenanceAlerts')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.maintenanceAlertsDesc')}</p>
              </div>
              <Switch checked={maintenanceAlerts} onCheckedChange={setMaintenanceAlerts} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.visitReminders')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.visitRemindersDesc')}</p>
              </div>
              <Switch checked={visitReminders} onCheckedChange={setVisitReminders} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>{t('settings.security')}</CardTitle>
                <CardDescription>{t('settings.securityDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base font-medium">{t('settings.changePassword')}</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.enterNewPassword')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmNewPassword')} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handlePasswordChange} disabled={isChangingPassword || !newPassword || !confirmPassword}>
                    {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('settings.updatePassword')}
                  </Button>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-medium">{t('settings.sessionManagement')}</Label>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> {t('settings.signOutDevice')}
                </Button>
                <Button variant="destructive" onClick={handleSignOutAllDevices}>
                  <LogOut className="w-4 h-4 mr-2" /> {t('settings.signOutAll')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t('settings.signOutDesc')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info Footer */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>{t('settings.userId')}: {user?.id?.slice(0, 8)}...</span>
              <span>{t('settings.lastSignIn')}: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</span>
              <span>{t('settings.accountCreated')}: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}