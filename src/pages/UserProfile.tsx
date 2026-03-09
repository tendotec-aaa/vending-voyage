import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, UserCircle, Car, AlertCircle, Edit2, Save, X, Clock, Home, LogOut } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const profileSchema = z.object({
  first_names: z.string().trim().min(1, "Required").max(100),
  last_names: z.string().trim().min(1, "Required").max(100),
  personal_id_number: z.string().trim().optional(),
  phone_number: z.string().trim().optional(),
  address: z.string().trim().optional(),
  employed_since: z.string().optional(),
  has_driver_license: z.boolean(),
  driver_license_type: z.string().optional(),
  driver_license_expiry_date: z.string().optional(),
  emergency_contact_name: z.string().trim().optional(),
  emergency_contact_number: z.string().trim().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile, isProfileComplete, isActive } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const prevActiveRef = useRef(isActive);
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    first_names: "",
    last_names: "",
    personal_id_number: "",
    phone_number: "",
    address: "",
    employed_since: "",
    has_driver_license: false,
    driver_license_type: "",
    driver_license_expiry_date: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employedSinceDate, setEmployedSinceDate] = useState<Date | undefined>();
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<Date | undefined>();

  useEffect(() => {
    if (profile) {
      setFormData({
        first_names: profile.first_names || "",
        last_names: profile.last_names || "",
        personal_id_number: profile.personal_id_number || "",
        phone_number: profile.phone_number || "",
        address: profile.address || "",
        employed_since: profile.employed_since || "",
        has_driver_license: profile.has_driver_license || false,
        driver_license_type: profile.driver_license_type || "",
        driver_license_expiry_date: profile.driver_license_expiry_date || "",
        emergency_contact_name: profile.emergency_contact_name || "",
        emergency_contact_number: profile.emergency_contact_number || "",
      });
      if (profile.employed_since) setEmployedSinceDate(parseISO(profile.employed_since));
      if (profile.driver_license_expiry_date) setLicenseExpiryDate(parseISO(profile.driver_license_expiry_date));
    }
  }, [profile]);

  useEffect(() => {
    if (!isLoading && !isProfileComplete) setIsEditing(true);
  }, [isLoading, isProfileComplete]);

  useEffect(() => {
    if (!isLoading && isActive && prevActiveRef.current === false) {
      toast.success(t('profile.accountActivated'));
      navigate("/");
    }
    prevActiveRef.current = isActive;
  }, [isActive, isLoading, navigate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    updateProfile.mutate({ ...formData, profile_completed: true }, { onSuccess: () => setIsEditing(false) });
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_names: profile.first_names || "", last_names: profile.last_names || "",
        personal_id_number: profile.personal_id_number || "", phone_number: profile.phone_number || "",
        address: profile.address || "", employed_since: profile.employed_since || "",
        has_driver_license: profile.has_driver_license || false, driver_license_type: profile.driver_license_type || "",
        driver_license_expiry_date: profile.driver_license_expiry_date || "",
        emergency_contact_name: profile.emergency_contact_name || "", emergency_contact_number: profile.emergency_contact_number || "",
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const updateField = (field: keyof ProfileFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileContent = (
    <div className="p-6 max-w-4xl mx-auto">
      {isProfileComplete && !isActive && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">{t('profile.pendingActivation')}</h3>
              <p className="text-sm text-muted-foreground">{t('profile.pendingActivationDesc')}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isProfileComplete 
                    ? `${profile?.first_names || ''} ${profile?.last_names || ''}`.trim() || t('profile.myProfile')
                    : t('profile.completeYourProfile')
                  }
                </CardTitle>
                <CardDescription>
                  {isProfileComplete ? t('profile.manageInfo') : t('profile.fillOutInfo')}
                </CardDescription>
                {profile?.role && (
                  <Badge variant="secondary" className="mt-2">
                    {profile.role === 'admin' ? t('settings.administrator') : 
                     profile.role === 'route_operator' ? t('settings.routeOperator') : 
                     t('settings.warehouseManager')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isActive && (
                <Button onClick={() => navigate("/")}>
                  <Home className="w-4 h-4 mr-2" />
                  {t('profile.goToDashboard')}
                </Button>
              )}
              {isProfileComplete && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t('profile.editProfile')}
                </Button>
              )}
              {!isActive && (
                <Button variant="ghost" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('common.signOut')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">{t('profile.personalInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_names">{t('profile.firstNames')}</Label>
                  <Input id="first_names" value={formData.first_names} onChange={(e) => updateField("first_names", e.target.value)} placeholder="Juan Carlos" disabled={!isEditing} />
                  {errors.first_names && <p className="text-sm text-destructive">{errors.first_names}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_names">{t('profile.lastNames')}</Label>
                  <Input id="last_names" value={formData.last_names} onChange={(e) => updateField("last_names", e.target.value)} placeholder="Pérez López" disabled={!isEditing} />
                  {errors.last_names && <p className="text-sm text-destructive">{errors.last_names}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personal_id_number">{t('profile.personalIdNumber')}</Label>
                  <Input id="personal_id_number" value={formData.personal_id_number} onChange={(e) => updateField("personal_id_number", e.target.value)} placeholder="0900000000" disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">{t('profile.phoneNumber')}</Label>
                  <Input id="phone_number" value={formData.phone_number} onChange={(e) => updateField("phone_number", e.target.value)} placeholder="+593 99 000 0000" disabled={!isEditing} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">{t('profile.emailCannotChange')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('profile.address')}</Label>
                <Textarea id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Guayaquil, Ecuador" rows={2} disabled={!isEditing} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">{t('profile.employmentInfo')}</h3>
              <div className="space-y-2">
                <Label>{t('profile.employedSince')}</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !employedSinceDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {employedSinceDate ? format(employedSinceDate, "PPP") : t('profile.selectDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={employedSinceDate} onSelect={(date) => { setEmployedSinceDate(date); updateField("employed_since", date ? format(date, "yyyy-MM-dd") : ""); }} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input value={employedSinceDate ? format(employedSinceDate, "PPP") : t('profile.notSet')} disabled />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{t('profile.driversLicense')}</h3>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="has_driver_license">{t('profile.hasDriversLicense')}</Label>
                <Switch id="has_driver_license" checked={formData.has_driver_license} onCheckedChange={(checked) => updateField("has_driver_license", checked)} disabled={!isEditing} />
              </div>

              {formData.has_driver_license && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="driver_license_type">{t('profile.licenseType')}</Label>
                    {isEditing ? (
                      <Select value={formData.driver_license_type} onValueChange={(value) => updateField("driver_license_type", value)}>
                        <SelectTrigger><SelectValue placeholder={t('profile.selectType')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Class A</SelectItem>
                          <SelectItem value="B">Class B</SelectItem>
                          <SelectItem value="C">Class C</SelectItem>
                          <SelectItem value="D">Class D</SelectItem>
                          <SelectItem value="CDL">Commercial (CDL)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={formData.driver_license_type || t('profile.notSet')} disabled />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('profile.licenseExpiryDate')}</Label>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !licenseExpiryDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {licenseExpiryDate ? format(licenseExpiryDate, "PPP") : t('profile.selectDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={licenseExpiryDate} onSelect={(date) => { setLicenseExpiryDate(date); updateField("driver_license_expiry_date", date ? format(date, "yyyy-MM-dd") : ""); }} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input value={licenseExpiryDate ? format(licenseExpiryDate, "PPP") : t('profile.notSet')} disabled />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <h3 className="text-lg font-semibold text-foreground">{t('profile.emergencyContact')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">{t('profile.contactName')}</Label>
                  <Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(e) => updateField("emergency_contact_name", e.target.value)} placeholder="María García" disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_number">{t('profile.contactPhone')}</Label>
                  <Input id="emergency_contact_number" value={formData.emergency_contact_number} onChange={(e) => updateField("emergency_contact_number", e.target.value)} placeholder="+593 99 000 0000" disabled={!isEditing} />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('profile.saveProfile')}
                </Button>
                {isProfileComplete && (
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={updateProfile.isPending}>
                    <X className="mr-2 h-4 w-4" />
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </form>
      </Card>
    </div>
  );

  if (isActive) {
    return <AppLayout>{profileContent}</AppLayout>;
  }

  return profileContent;
}
