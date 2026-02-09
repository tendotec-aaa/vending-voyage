import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyInfo, CompanyInfoFormData } from "@/hooks/useCompanyInfo";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Building2, Edit2, Save, X, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const currencies = ["USD", "EUR", "GBP", "MXN", "COP", "PEN", "CLP", "ARS", "BRL", "CAD", "AUD"];

const emptyForm: CompanyInfoFormData = {
  company_name: "",
  trade_name: null,
  tax_id: null,
  registration_number: null,
  country: null,
  state_province: null,
  city: null,
  address: null,
  postal_code: null,
  phone: null,
  email: null,
  website: null,
  default_currency: "USD",
  logo_url: null,
  notes: null,
};

export default function CompanyProfile() {
  const { companyInfo, isLoading, upsertCompanyInfo } = useCompanyInfo();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CompanyInfoFormData>(emptyForm);

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        company_name: companyInfo.company_name,
        trade_name: companyInfo.trade_name,
        tax_id: companyInfo.tax_id,
        registration_number: companyInfo.registration_number,
        country: companyInfo.country,
        state_province: companyInfo.state_province,
        city: companyInfo.city,
        address: companyInfo.address,
        postal_code: companyInfo.postal_code,
        phone: companyInfo.phone,
        email: companyInfo.email,
        website: companyInfo.website,
        default_currency: companyInfo.default_currency,
        logo_url: companyInfo.logo_url,
        notes: companyInfo.notes,
      });
    }
  }, [companyInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) return;
    upsertCompanyInfo.mutate(formData, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleCancel = () => {
    if (companyInfo) {
      setFormData({
        company_name: companyInfo.company_name,
        trade_name: companyInfo.trade_name,
        tax_id: companyInfo.tax_id,
        registration_number: companyInfo.registration_number,
        country: companyInfo.country,
        state_province: companyInfo.state_province,
        city: companyInfo.city,
        address: companyInfo.address,
        postal_code: companyInfo.postal_code,
        phone: companyInfo.phone,
        email: companyInfo.email,
        website: companyInfo.website,
        default_currency: companyInfo.default_currency,
        logo_url: companyInfo.logo_url,
        notes: companyInfo.notes,
      });
    } else {
      setFormData(emptyForm);
    }
    setIsEditing(false);
  };

  const updateField = (field: keyof CompanyInfoFormData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Empty state for no company info yet
  if (!companyInfo && !isEditing) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Company Profile Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {isAdmin
                  ? "Set up your company profile to store business information, contact details, and preferences."
                  : "Your administrator hasn't set up the company profile yet."}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsEditing(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Set Up Company Profile
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {companyInfo?.company_name || "Company Profile"}
              </h1>
              {companyInfo?.trade_name && (
                <p className="text-muted-foreground">{companyInfo.trade_name}</p>
              )}
            </div>
          </div>
          {isAdmin && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Legal business name"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Trade Name / DBA</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name || ""}
                    onChange={(e) => updateField("trade_name", e.target.value)}
                    placeholder="Brand name"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id || ""}
                    onChange={(e) => updateField("tax_id", e.target.value)}
                    placeholder="RUC, EIN, etc."
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number || ""}
                    onChange={(e) => updateField("registration_number", e.target.value)}
                    placeholder="Business license number"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+1 234 567 890"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="info@company.com"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://www.company.com"
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country || ""}
                    onChange={(e) => updateField("country", e.target.value)}
                    placeholder="Country"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state_province">State / Province</Label>
                  <Input
                    id="state_province"
                    value={formData.state_province || ""}
                    onChange={(e) => updateField("state_province", e.target.value)}
                    placeholder="State or province"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full street address"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ""}
                    onChange={(e) => updateField("postal_code", e.target.value)}
                    placeholder="ZIP / Postal"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="default_currency">Default Currency</Label>
                {isEditing ? (
                  <Select
                    value={formData.default_currency || "USD"}
                    onValueChange={(value) => updateField("default_currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formData.default_currency || "USD"} disabled />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Internal notes about the company..."
                rows={4}
                disabled={!isEditing}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={upsertCompanyInfo.isPending}>
                {upsertCompanyInfo.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
