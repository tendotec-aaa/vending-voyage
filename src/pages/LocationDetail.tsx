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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Save, X, MapPin, ChevronDown, Truck, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type NegotiationType = Database["public"]["Enums"]["negotiation_type"];
type ContractTerm = Database["public"]["Enums"]["contract_term"];

export default function LocationDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSpots, setExpandedSpots] = useState<Set<string>>(new Set());
  const [unassignConfirm, setUnassignConfirm] = useState<{ setupId: string; setupName: string; spotName: string } | null>(null);
  const [form, setForm] = useState({
    name: "", address: "", contact_person_name: "", contact_person_number: "",
    contact_person_email: "", negotiation_type: "fixed_rent" as NegotiationType,
    rent_amount: 0, commission_percentage: 0, total_spots: 0,
    contract_start_date: "", contract_end_date: "", contract_term: "indefinite" as ContractTerm,
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

  // Fetch setups for spots at this location
  const { data: setups = [] } = useQuery({
    queryKey: ["location-setups", id],
    queryFn: async () => {
      const spotIds = spots.map((s) => s.id);
      if (spotIds.length === 0) return [];
      const { data, error } = await supabase.from("setups").select("id, name, type, spot_id").in("spot_id", spotIds);
      if (error) throw error;
      return data;
    },
    enabled: spots.length > 0,
  });

  // Fetch machines for those setups
  const { data: machines = [] } = useQuery({
    queryKey: ["location-machines", id],
    queryFn: async () => {
      const setupIds = setups.map((s) => s.id);
      if (setupIds.length === 0) return [];
      const { data, error } = await supabase
        .from("machines")
        .select("id, serial_number, setup_id, position_on_setup, model_id, item_details:model_id(name)")
        .in("setup_id", setupIds)
        .order("position_on_setup");
      if (error) throw error;
      return data;
    },
    enabled: setups.length > 0,
  });

  // Fetch slots for machines
  const { data: machineSlots = [] } = useQuery({
    queryKey: ["location-machine-slots", id],
    queryFn: async () => {
      const machineIds = machines.map((m: any) => m.id);
      if (machineIds.length === 0) return [];
      const { data, error } = await supabase
        .from("machine_slots")
        .select("*, item_details:current_product_id(name)")
        .in("machine_id", machineIds)
        .order("slot_number");
      if (error) throw error;
      return data;
    },
    enabled: machines.length > 0,
  });

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name || "", address: location.address || "",
        contact_person_name: location.contact_person_name || "",
        contact_person_number: location.contact_person_number || "",
        contact_person_email: location.contact_person_email || "",
        negotiation_type: (location.negotiation_type as NegotiationType) || "fixed_rent",
        rent_amount: location.rent_amount || 0, commission_percentage: location.commission_percentage || 0,
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
        name: form.name.trim(), address: form.address.trim() || null,
        contact_person_name: form.contact_person_name.trim() || null,
        contact_person_number: form.contact_person_number.trim() || null,
        contact_person_email: form.contact_person_email.trim() || null,
        negotiation_type: form.negotiation_type, rent_amount: form.rent_amount,
        commission_percentage: form.commission_percentage, total_spots: form.total_spots,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null, contract_term: form.contract_term,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location", id] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsEditing(false);
      toast({ title: t("locations.toastLocationUpdated", { defaultValue: "Location updated successfully" }) });
    },
    onError: (error) => {
      toast({ title: t("locations.toastErrorUpdating", { defaultValue: "Error updating location" }), description: error.message, variant: "destructive" });
    },
  });

  const unassignSetupFromSpot = useMutation({
    mutationFn: async ({ setupId }: { setupId: string }) => {
      // Update machines status back to in_warehouse
      const { data: setupMachines } = await supabase
        .from("machines")
        .select("id")
        .eq("setup_id", setupId);
      
      if (setupMachines && setupMachines.length > 0) {
        const machineIds = setupMachines.map(m => m.id);
        await supabase.from("machines").update({ status: 'in_warehouse' }).in("id", machineIds);
      }

      const { error } = await supabase.from("setups").update({ spot_id: null }).eq("id", setupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-setups", id] });
      queryClient.invalidateQueries({ queryKey: ["location-machines", id] });
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: t("locations.toastSetupRemoved", { defaultValue: "Setup removed from spot" }) });
    },
    onError: (error) => {
      toast({ title: t("locations.toastErrorRemoving", { defaultValue: "Error removing setup" }), description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground">{t("common.loading")}</div></AppLayout>;
  if (!location) return <AppLayout><div className="text-muted-foreground">{t("locations.notfound")}</div></AppLayout>;

  const getSetupForSpot = (spotId: string) => setups.find((s) => s.spot_id === spotId);
  const getMachinesForSetup = (setupId: string) => machines.filter((m: any) => m.setup_id === setupId);
  const getSlotsForMachine = (machineId: string) => machineSlots.filter((s: any) => s.machine_id === machineId);

  const toggleSpot = (spotId: string) => {
    setExpandedSpots((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) next.delete(spotId); else next.add(spotId);
      return next;
    });
  };

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
              <p className="text-muted-foreground">{location.address || t("locations.noAddress")}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> {t("common.cancel")}</Button>
                  <Button onClick={() => updateLocation.mutate()} disabled={!form.name.trim() || updateLocation.isPending}>
                    <Save className="mr-2 h-4 w-4" /> {t("common.save")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}</Button>
              )}
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>{t("locations.generalInfo")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("common.name")}</Label>
                {isEditing ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> : <p className="text-foreground">{location.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("common.address")}</Label>
                {isEditing ? <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /> : <p className="text-foreground">{location.address || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("locations.contactInfo")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("locations.contactName")}</Label>
                {isEditing ? <Input value={form.contact_person_name} onChange={(e) => setForm({ ...form, contact_person_name: e.target.value })} /> : <p className="text-foreground">{location.contact_person_name || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("common.phone")}</Label>
                {isEditing ? <Input value={form.contact_person_number} onChange={(e) => setForm({ ...form, contact_person_number: e.target.value })} /> : <p className="text-foreground">{location.contact_person_number || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("common.email")}</Label>
                {isEditing ? <Input value={form.contact_person_email} onChange={(e) => setForm({ ...form, contact_person_email: e.target.value })} /> : <p className="text-foreground">{location.contact_person_email || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("locations.contractAndRent")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("locations.negotiationType")}</Label>
                {isEditing ? (
                  <Select value={form.negotiation_type} onValueChange={(v) => setForm({ ...form, negotiation_type: v as NegotiationType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_rent">{t("locations.fixedRent")}</SelectItem>
                      <SelectItem value="commission">{t("locations.commission")}</SelectItem>
                      <SelectItem value="hybrid">{t("locations.hybrid")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-foreground capitalize">{location.negotiation_type === "fixed_rent" ? t("locations.fixedRent") : location.negotiation_type === "commission" ? t("locations.commission") : t("locations.hybrid")}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.rentAmount")}</Label>
                {isEditing ? <Input type="number" min={0} step={0.01} value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: parseFloat(e.target.value) || 0 })} /> : <p className="text-foreground">${location.rent_amount || 0}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.commissionPercentage")}</Label>
                {isEditing ? <Input type="number" min={0} max={100} step={0.01} value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: parseFloat(e.target.value) || 0 })} /> : <p className="text-foreground">{location.commission_percentage || 0}%</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.numberOfSpots")}</Label>
                {isEditing ? <Input type="number" min={0} value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: parseInt(e.target.value) || 0 })} /> : <p className="text-foreground">{location.total_spots || 0}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.contractTerm")}</Label>
                {isEditing ? (
                  <Select value={form.contract_term} onValueChange={(v) => setForm({ ...form, contract_term: v as ContractTerm })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_year">{t("locations.oneYear")}</SelectItem>
                      <SelectItem value="2_years">{t("locations.twoYears")}</SelectItem>
                      <SelectItem value="indefinite">{t("locations.indefinite")}</SelectItem>
                      <SelectItem value="custom">{t("locations.custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-foreground capitalize">{location.contract_term?.replace("_", " ") || "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.contractStart")}</Label>
                {isEditing ? <Input type="date" value={form.contract_start_date} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} /> : <p className="text-foreground">{location.contract_start_date ? new Date(location.contract_start_date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t("locations.contractEnd")}</Label>
                {isEditing ? <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} /> : <p className="text-foreground">{location.contract_end_date ? new Date(location.contract_end_date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spots with Setups, Machines, and Slots */}
        <Card>
          <CardHeader><CardTitle>{t("locations.spotsTitle")} ({spots.length})</CardTitle></CardHeader>
          <CardContent>
            {spots.length === 0 ? (
              <p className="text-muted-foreground">{t("locations.noSpotsAssigned")}</p>
            ) : (
              <div className="space-y-2">
                {spots.map((spot) => {
                  const spotSetup = getSetupForSpot(spot.id);
                  const spotMachines = spotSetup ? getMachinesForSetup(spotSetup.id) : [];
                  const isExpanded = expandedSpots.has(spot.id);

                  return (
                    <Collapsible key={spot.id} open={isExpanded} onOpenChange={() => toggleSpot(spot.id)}>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-muted/50">
                          <div className="flex items-center gap-3">
                            <button
                              className="font-medium text-primary hover:underline"
                              onClick={() => navigate(`/spots/${spot.id}`)}
                            >
                              {spot.name}
                            </button>
                            <Badge variant={spot.status === "active" ? "default" : "secondary"}>{spot.status}</Badge>
                            {spotSetup && <Badge variant="outline">{spotSetup.name}</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            {spotSetup && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnassignConfirm({
                                    setupId: spotSetup.id,
                                    setupName: spotSetup.name || "Unknown",
                                    spotName: spot.name,
                                  });
                                }}
                                title={t("locations.removeSetupFromSpot")}
                              >
                                <Unlink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <CollapsibleContent>
                          {spotMachines.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground">{t("locations.noMachinesAtSpot")}</div>
                          ) : (
                            <div className="p-3 space-y-3">
                              {spotMachines.map((machine: any) => {
                                const slots = getSlotsForMachine(machine.id);
                                return (
                                  <div key={machine.id} className="border rounded-md overflow-hidden">
                                    <div
                                      className="flex items-center justify-between p-2 bg-background cursor-pointer hover:bg-muted/30"
                                      onClick={() => navigate(`/machines/${machine.id}`)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{machine.serial_number}</span>
                                        {machine.item_details?.name && (
                                          <span className="text-xs text-muted-foreground">({machine.item_details.name})</span>
                                        )}
                                      </div>
                                      {machine.position_on_setup && <Badge variant="outline" className="text-xs">{t("locations.pos")} {machine.position_on_setup}</Badge>}
                                    </div>
                                    {slots.length > 0 && (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs py-1">{t("machines.slot")}</TableHead>
                                            <TableHead className="text-xs py-1">{t("common.product")}</TableHead>
                                            <TableHead className="text-xs py-1 text-right">{t("common.stock")}</TableHead>
                                            <TableHead className="text-xs py-1 text-right">{t("machines.capacity")}</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {slots.map((slot: any) => (
                                            <TableRow key={slot.id}>
                                              <TableCell className="text-xs py-1">{t("machines.slot")} {slot.slot_number}</TableCell>
                                              <TableCell className="text-xs py-1">{slot.item_details?.name || t("common.empty")}</TableCell>
                                              <TableCell className="text-xs py-1 text-right">{slot.current_stock ?? 0}</TableCell>
                                              <TableCell className="text-xs py-1 text-right">{slot.capacity ?? 150}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unassign Setup Confirmation Dialog */}
      <AlertDialog open={!!unassignConfirm} onOpenChange={(open) => { if (!open) setUnassignConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("locations.removeSetupFromSpot")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("locations.removeSetupFromSpotDesc", { setup: unassignConfirm?.setupName, spot: unassignConfirm?.spotName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (unassignConfirm) {
                  unassignSetupFromSpot.mutate({ setupId: unassignConfirm.setupId });
                  setUnassignConfirm(null);
                }
              }}
            >
              {t("locations.yesRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
