import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type NegotiationType = Database["public"]["Enums"]["negotiation_type"];
type ContractTerm = Database["public"]["Enums"]["contract_term"];

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    contact_person_name: "",
    contact_person_number: "",
    contact_person_email: "",
    negotiation_type: "fixed_rent" as NegotiationType,
    rent_amount: 0,
    commission_percentage: 0,
    total_spots: 0,
    contract_start_date: "",
    contract_end_date: "",
    contract_term: "indefinite" as ContractTerm,
  });

  const { data: location, isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: spots = [] } = useQuery({
    queryKey: ["location-spots", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("spots").select("*").eq("location_id", id!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name || "",
        address: location.address || "",
        contact_person_name: location.contact_person_name || "",
        contact_person_number: location.contact_person_number || "",
        contact_person_email: location.contact_person_email || "",
        negotiation_type: (location.negotiation_type as NegotiationType) || "fixed_rent",
        rent_amount: location.rent_amount || 0,
        commission_percentage: location.commission_percentage || 0,
        total_spots: location.total_spots || 0,
        contract_start_date: location.contract_start_date || "",
        contract_end_date: location.contract_end_date || "",
        contract_term: (location.contract_term as ContractTerm) || "indefinite",
      });
    }
  }, [location]);

  const updateLocation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("locations").update({
        name: form.name.trim(),
        address: form.address.trim() || null,
        contact_person_name: form.contact_person_name.trim() || null,
        contact_person_number: form.contact_person_number.trim() || null,
        contact_person_email: form.contact_person_email.trim() || null,
        negotiation_type: form.negotiation_type,
        rent_amount: form.rent_amount,
        commission_percentage: form.commission_percentage,
        total_spots: form.total_spots,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null,
        contract_term: form.contract_term,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location", id] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsEditing(false);
      toast({ title: "Location updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating location", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!location) return <AppLayout><div className="text-muted-foreground">Location not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/locations")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> {location.name}
              </h1>
              <p className="text-muted-foreground">{location.address || "No address"}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                  <Button onClick={() => updateLocation.mutate()} disabled={!form.name.trim() || updateLocation.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
              )}
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> : <p className="text-foreground">{location.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                {isEditing ? <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /> : <p className="text-foreground">{location.address || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                {isEditing ? <Input value={form.contact_person_name} onChange={(e) => setForm({ ...form, contact_person_name: e.target.value })} /> : <p className="text-foreground">{location.contact_person_name || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                {isEditing ? <Input value={form.contact_person_number} onChange={(e) => setForm({ ...form, contact_person_number: e.target.value })} /> : <p className="text-foreground">{location.contact_person_number || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                {isEditing ? <Input value={form.contact_person_email} onChange={(e) => setForm({ ...form, contact_person_email: e.target.value })} /> : <p className="text-foreground">{location.contact_person_email || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contract & Rent</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Negotiation Type</Label>
                {isEditing ? (
                  <Select value={form.negotiation_type} onValueChange={(v) => setForm({ ...form, negotiation_type: v as NegotiationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_rent">Fixed Rent</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-foreground capitalize">{location.negotiation_type?.replace("_", " ") || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Rent Amount</Label>
                {isEditing ? <Input type="number" min={0} step={0.01} value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: parseFloat(e.target.value) || 0 })} /> : <p className="text-foreground">${location.rent_amount || 0}</p>}
              </div>
              <div className="space-y-2">
                <Label>Commission %</Label>
                {isEditing ? <Input type="number" min={0} max={100} step={0.01} value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: parseFloat(e.target.value) || 0 })} /> : <p className="text-foreground">{location.commission_percentage || 0}%</p>}
              </div>
              <div className="space-y-2">
                <Label>Total Spots</Label>
                {isEditing ? <Input type="number" min={0} value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: parseInt(e.target.value) || 0 })} /> : <p className="text-foreground">{location.total_spots || 0}</p>}
              </div>
              <div className="space-y-2">
                <Label>Contract Term</Label>
                {isEditing ? (
                  <Select value={form.contract_term} onValueChange={(v) => setForm({ ...form, contract_term: v as ContractTerm })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_year">1 Year</SelectItem>
                      <SelectItem value="2_years">2 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-foreground capitalize">{location.contract_term?.replace("_", " ") || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Contract Start Date</Label>
                {isEditing ? <Input type="date" value={form.contract_start_date} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} /> : <p className="text-foreground">{location.contract_start_date || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>Contract End Date</Label>
                {isEditing ? <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} /> : <p className="text-foreground">{location.contract_end_date || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spots ({spots.length})</CardTitle></CardHeader>
          <CardContent>
            {spots.length === 0 ? (
              <p className="text-muted-foreground">No spots assigned to this location.</p>
            ) : (
              <div className="space-y-2">
                {spots.map((spot) => (
                  <div
                    key={spot.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => navigate(`/spots/${spot.id}`)}
                  >
                    <span className="font-medium text-foreground">{spot.name}</span>
                    <Badge variant={spot.status === "active" ? "default" : "secondary"}>
                      {spot.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
