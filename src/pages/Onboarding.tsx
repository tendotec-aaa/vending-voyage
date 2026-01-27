import { useState } from "react";
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
import { Loader2, UserCircle, Car, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

const profileSchema = z.object({
  first_names: z.string().trim().min(1, "First name is required").max(100),
  last_names: z.string().trim().min(1, "Last name is required").max(100),
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

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    updateProfile.mutate(
      {
        ...formData,
        profile_completed: true,
      },
      {
        onSuccess: () => {
          navigate("/");
        },
      }
    );
  };

  const updateField = (field: keyof ProfileFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Welcome to Vending ERP! Please fill out your profile information to get started.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_names">First Name(s) *</Label>
                  <Input
                    id="first_names"
                    value={formData.first_names}
                    onChange={(e) => updateField("first_names", e.target.value)}
                    placeholder="John"
                  />
                  {errors.first_names && (
                    <p className="text-sm text-destructive">{errors.first_names}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_names">Last Name(s) *</Label>
                  <Input
                    id="last_names"
                    value={formData.last_names}
                    onChange={(e) => updateField("last_names", e.target.value)}
                    placeholder="Doe"
                  />
                  {errors.last_names && (
                    <p className="text-sm text-destructive">{errors.last_names}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personal_id_number">Personal ID Number</Label>
                  <Input
                    id="personal_id_number"
                    value={formData.personal_id_number}
                    onChange={(e) => updateField("personal_id_number", e.target.value)}
                    placeholder="ID number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => updateField("phone_number", e.target.value)}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Your full address"
                  rows={2}
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Employment Information</h3>
              
              <div className="space-y-2">
                <Label>Employed Since</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !employedSinceDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {employedSinceDate ? format(employedSinceDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={employedSinceDate}
                      onSelect={(date) => {
                        setEmployedSinceDate(date);
                        updateField("employed_since", date ? format(date, "yyyy-MM-dd") : "");
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Driver's License */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Driver's License</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="has_driver_license">Do you have a driver's license?</Label>
                <Switch
                  id="has_driver_license"
                  checked={formData.has_driver_license}
                  onCheckedChange={(checked) => updateField("has_driver_license", checked)}
                />
              </div>

              {formData.has_driver_license && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="driver_license_type">License Type</Label>
                    <Select
                      value={formData.driver_license_type}
                      onValueChange={(value) => updateField("driver_license_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Class A</SelectItem>
                        <SelectItem value="B">Class B</SelectItem>
                        <SelectItem value="C">Class C</SelectItem>
                        <SelectItem value="D">Class D</SelectItem>
                        <SelectItem value="CDL">Commercial (CDL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>License Expiry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !licenseExpiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {licenseExpiryDate ? format(licenseExpiryDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={licenseExpiryDate}
                          onSelect={(date) => {
                            setLicenseExpiryDate(date);
                            updateField("driver_license_expiry_date", date ? format(date, "yyyy-MM-dd") : "");
                          }}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <h3 className="text-lg font-semibold text-foreground">Emergency Contact</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_number">Contact Phone</Label>
                  <Input
                    id="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={(e) => updateField("emergency_contact_number", e.target.value)}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Complete Profile
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
