import { fmt2 } from "@/lib/formatters";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, MapPin, Search, Layers, ChevronDown, Truck, Calendar, DollarSign, Percent, Unlink } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

export default function Locations() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Confirmation states
  const [assignConfirm, setAssignConfirm] = useState<{ setupId: string; setupName: string; spotId: string; spotName: string } | null>(null);
  const [unassignConfirm, setUnassignConfirm] = useState<{ setupId: string; setupName: string; spotName: string } | null>(null);

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newContactPersonName, setNewContactPersonName] = useState("");
  const [newContactPersonNumber, setNewContactPersonNumber] = useState("");
  const [newContactPersonEmail, setNewContactPersonEmail] = useState("");
  const [newTotalSpots, setNewTotalSpots] = useState("1");
  const [newNegotiationType, setNewNegotiationType] = useState<"fixed_rent" | "commission" | "hybrid">("fixed_rent");
  const [newRentAmount, setNewRentAmount] = useState("");
  const [newCommissionPercentage, setNewCommissionPercentage] = useState("");
  const [newContractStartDate, setNewContractStartDate] = useState("");
  const [newContractEndDate, setNewContractEndDate] = useState("");
  const [newContractTerm, setNewContractTerm] = useState<"1_year" | "2_years" | "indefinite" | "custom">("indefinite");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: spots = [] } = useQuery({
    queryKey: ["spots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spots").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch last visit date per spot
  const { data: spotLastVisits = [] } = useQuery({
    queryKey: ["spot-last-visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_visits")
        .select("spot_id, visit_date")
        .order("visit_date", { ascending: false });
      if (error) throw error;
      // Group by spot_id, take the first (latest) for each
      const map = new Map<string, string>();
      (data || []).forEach((v: any) => {
        if (!map.has(v.spot_id)) map.set(v.spot_id, v.visit_date);
      });
      return Array.from(map.entries()).map(([spotId, visitDate]) => ({ spot_id: spotId, last_visit_date: visitDate }));
    },
  });

  const { data: setups = [] } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, type, spot_id").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allMachines = [] } = useQuery({
    queryKey: ["all-machines-for-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id, serial_number, setup_id, position_on_setup")
        .order("position_on_setup");
      if (error) throw error;
      return data;
    },
  });

  const { data: allSlots = [] } = useQuery({
    queryKey: ["all-slots-for-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_slots")
        .select("id, machine_id, slot_number, current_stock, capacity, current_product_id, item_details:current_product_id(name)")
        .order("slot_number");
      if (error) throw error;
      return data;
    },
  });

  const unassignedSetups = setups.filter((s) => !s.spot_id);

  const assignSetupToSpot = useMutation({
    mutationFn: async ({ setupId, spotId }: { setupId: string; spotId: string }) => {
      // Update machines status to deployed
      const { data: setupMachines } = await supabase
        .from("machines")
        .select("id")
        .eq("setup_id", setupId);
      
      if (setupMachines && setupMachines.length > 0) {
        const machineIds = setupMachines.map(m => m.id);
        await supabase.from("machines").update({ status: 'deployed' }).in("id", machineIds);
      }

      const { error } = await supabase.from("setups").update({ spot_id: spotId }).eq("id", setupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["all-machines-for-locations"] });
      toast({ title: t("locations.toastSetupAssigned", { defaultValue: "Setup assigned to spot" }) });
    },
    onError: (error) => {
      toast({ title: t("locations.toastErrorAssigning", { defaultValue: "Error assigning setup" }), description: error.message, variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["all-machines-for-locations"] });
      toast({ title: t("locations.toastSetupRemoved", { defaultValue: "Setup removed from spot" }) });
    },
    onError: (error) => {
      toast({ title: t("locations.toastErrorRemoving", { defaultValue: "Error removing setup" }), description: error.message, variant: "destructive" });
    },
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      const totalSpotsNum = parseInt(newTotalSpots, 10);
      if (isNaN(totalSpotsNum) || totalSpotsNum < 0) throw new Error("Total spots must be a valid number");
      const locationData: Database["public"]["Tables"]["locations"]["Insert"] = {
        name: newName.trim(), address: newAddress.trim() || null,
        contact_person_name: newContactPersonName.trim() || null,
        contact_person_number: newContactPersonNumber.trim() || null,
        contact_person_email: newContactPersonEmail.trim() || null,
        total_spots: totalSpotsNum, negotiation_type: newNegotiationType,
        rent_amount: newRentAmount ? parseFloat(newRentAmount) : 0,
        commission_percentage: newCommissionPercentage ? parseFloat(newCommissionPercentage) : 0,
        contract_start_date: newContractStartDate || null,
        contract_end_date: newContractEndDate || null, contract_term: newContractTerm,
      };
      const { data, error } = await supabase.from("locations").insert(locationData).select().single();
      if (error) throw error;
      if (totalSpotsNum > 0 && data) {
        const spotsToCreate = Array.from({ length: totalSpotsNum }, (_, i) => ({
          location_id: data.id, name: `Spot ${i + 1}`, status: "active" as const,
        }));
        await supabase.from("spots").insert(spotsToCreate);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      resetForm(); setIsCreateOpen(false);
      toast({ title: t("locations.toastLocationCreated", { defaultValue: "Location created successfully" }) });
    },
    onError: (error) => {
      toast({ title: t("locations.toastErrorCreating", { defaultValue: "Error creating location" }), description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewName(""); setNewAddress(""); setNewContactPersonName(""); setNewContactPersonNumber("");
    setNewContactPersonEmail(""); setNewTotalSpots("1"); setNewNegotiationType("fixed_rent");
    setNewRentAmount(""); setNewCommissionPercentage(""); setNewContractStartDate("");
    setNewContractEndDate(""); setNewContractTerm("indefinite");
  };

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpotsForLocation = (locationId: string) =>
    spots.filter((s) => s.location_id === locationId).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const getSetupForSpot = (spotId: string) => setups.find((s) => s.spot_id === spotId);
  const getMachinesForSetup = (setupId: string) => allMachines.filter((m) => m.setup_id === setupId).sort((a, b) => (a.position_on_setup || 0) - (b.position_on_setup || 0));
  const getSlotsForMachine = (machineId: string) => allSlots.filter((s: any) => s.machine_id === machineId).sort((a: any, b: any) => a.slot_number - b.slot_number);

  const getStockColor = (stock: number, capacity: number) => {
    if (capacity === 0) return "bg-muted";
    const pct = (stock / capacity) * 100;
    if (pct <= 25) return "bg-red-500";
    if (pct <= 50) return "bg-yellow-500";
    if (pct <= 75) return "bg-blue-500";
    return "bg-green-500";
  };

  const toggleExpanded = (locationId: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) next.delete(locationId);
      else next.add(locationId);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("locations.title")}</h1>
            <p className="text-muted-foreground">{t("locations.subtitle")}</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> {t("locations.newLocation")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("locations.createLocation")}</DialogTitle>
                <DialogDescription>{t("locations.addVenueDesc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>{t("common.name")} *</Label>
                  <Input placeholder={t("locations.egMall")} value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.address")}</Label>
                  <Input placeholder={t("locations.egMainStreet")} value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("locations.contactName")}</Label>
                    <Input value={newContactPersonName} onChange={(e) => setNewContactPersonName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("locations.contactPhone")}</Label>
                    <Input value={newContactPersonNumber} onChange={(e) => setNewContactPersonNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("locations.contactEmail")}</Label>
                  <Input type="email" value={newContactPersonEmail} onChange={(e) => setNewContactPersonEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("locations.negotiationType")}</Label>
                  <Select value={newNegotiationType} onValueChange={(v) => setNewNegotiationType(v as typeof newNegotiationType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_rent">{t("locations.fixedRent")}</SelectItem>
                      <SelectItem value="commission">{t("locations.commission")}</SelectItem>
                      <SelectItem value="hybrid">{t("locations.hybrid")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newNegotiationType === "fixed_rent" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label>{t("locations.rentAmount")}</Label>
                    <Input type="number" min="0" step="0.01" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} />
                  </div>
                )}
                {(newNegotiationType === "commission" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label>{t("locations.commissionPercentage")}</Label>
                    <Input type="number" min="0" max="100" step="0.01" value={newCommissionPercentage} onChange={(e) => setNewCommissionPercentage(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t("locations.numberOfSpots")} *</Label>
                  <Input type="number" min="0" value={newTotalSpots} onChange={(e) => setNewTotalSpots(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("locations.contractTerm")}</Label>
                  <Select value={newContractTerm} onValueChange={(v) => setNewContractTerm(v as typeof newContractTerm)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_year">{t("locations.oneYear")}</SelectItem>
                      <SelectItem value="2_years">{t("locations.twoYears")}</SelectItem>
                      <SelectItem value="indefinite">{t("locations.indefinite")}</SelectItem>
                      <SelectItem value="custom">{t("locations.custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("locations.contractStart")}</Label>
                    <Input type="date" value={newContractStartDate} onChange={(e) => setNewContractStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("locations.contractEnd")}</Label>
                    <Input type="date" value={newContractEndDate} onChange={(e) => setNewContractEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>{t("common.cancel")}</Button>
                <Button onClick={() => createLocation.mutate()} disabled={!newName.trim() || createLocation.isPending}>{t("locations.createLocation")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("locations.searchLocations")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">{t("locations.loadingLocations")}</div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("locations.noLocationsFound")}</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>{t("locations.createFirstLocation")}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLocations.map((location) => {
              const locationSpots = getSpotsForLocation(location.id);
              const totalSpots = location.total_spots || locationSpots.length;
              const spotCount = locationSpots.length || 1;
              const locationRent = Number(location.rent_amount || 0);
              const spotMonthlyRent = spotCount > 0 ? locationRent / spotCount : 0;

              // Calculate accrued rent for entire location (contract start → latest visit across all spots)
              let locationLastVisitDate: string | null = null;
              locationSpots.forEach((spot) => {
                const lastVisit = spotLastVisits.find((v) => v.spot_id === spot.id);
                if (lastVisit && (!locationLastVisitDate || lastVisit.last_visit_date > locationLastVisitDate)) {
                  locationLastVisitDate = lastVisit.last_visit_date;
                }
              });
              const contractStart = location.contract_start_date;
              let locationAccruedRent = 0;
              if (locationRent > 0 && contractStart && locationLastVisitDate) {
                const days = Math.max(0, differenceInDays(new Date(locationLastVisitDate), new Date(contractStart)));
                locationAccruedRent = (locationRent / 30) * days;
              }

              return (
                <Card key={location.id}>
                  <Collapsible>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-lg font-semibold text-primary hover:underline text-left"
                            onClick={() => navigate(`/locations/${location.id}`)}
                          >
                            {location.name}
                          </button>
                          <p className="text-sm text-muted-foreground">{location.address || t("locations.noAddress")}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {location.contract_start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {t("locations.since")} {location.contract_start_date ? new Date(location.contract_start_date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                              </span>
                            )}
                            {location.negotiation_type && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                {location.negotiation_type === "fixed_rent" ? t("locations.fixedRent") : location.negotiation_type === "commission" ? t("locations.commission") : t("locations.hybrid")}
                              </Badge>
                            )}
                            {(location.negotiation_type === "commission" || location.negotiation_type === "hybrid") && location.commission_percentage ? (
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                {Number(location.commission_percentage)}%
                              </span>
                            ) : null}
                            {location.contract_term && location.contract_term !== "indefinite" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                {location.contract_term.replace("_", " ")}
                              </Badge>
                            )}
                            {location.contact_person_name && (
                              <span className="truncate max-w-[150px]">📞 {location.contact_person_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{locationSpots.length}/{totalSpots} {t("locations.spot")}</Badge>
                          {locationRent > 0 && (
                            <span className="text-sm text-foreground font-medium">${fmt2(locationRent)}{t("common.perMonth")}</span>
                          )}
                          {locationAccruedRent > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                              {t("locations.accrued")}: ${fmt2(locationAccruedRent)}
                            </Badge>
                          )}
                          {locationSpots.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </div>
                    </div>

                    {locationSpots.length > 0 && (
                      <CollapsibleContent>
                        <div className="px-4 pb-4">
                          <Accordion type="multiple" className="w-full">
                            {locationSpots.map((spot) => {
                              const assignedSetup = getSetupForSpot(spot.id);
                              const setupMachines = assignedSetup ? getMachinesForSetup(assignedSetup.id) : [];

                              let spotTotalStock = 0;
                              let spotTotalCapacity = 0;
                              setupMachines.forEach((m) => {
                                const slots = getSlotsForMachine(m.id);
                                slots.forEach((s: any) => {
                                  spotTotalStock += s.current_stock || 0;
                                  spotTotalCapacity += s.capacity || 150;
                                });
                              });
                              const spotStockPct = spotTotalCapacity > 0 ? (spotTotalStock / spotTotalCapacity) * 100 : 0;

                              // Per-spot rent calculations
                              const spotLastVisit = spotLastVisits.find((v) => v.spot_id === spot.id);
                              let spotAccruedRent = 0;
                              if (spotMonthlyRent > 0 && contractStart && spotLastVisit) {
                                const days = Math.max(0, differenceInDays(new Date(spotLastVisit.last_visit_date), new Date(contractStart)));
                                spotAccruedRent = (spotMonthlyRent / 30) * days;
                              }

                              return (
                                <AccordionItem key={spot.id} value={spot.id}>
                                  <AccordionTrigger className="py-2 px-3 hover:no-underline">
                                    <div className="flex items-center gap-3 flex-1 mr-2">
                                      <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <button
                                        className="text-sm font-medium text-primary hover:underline text-left"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/spots/${spot.id}`); }}
                                      >
                                        {spot.name}
                                      </button>
                                      <Badge variant={spot.status === "active" ? "default" : "secondary"} className="text-xs">{spot.status}</Badge>
                                      {assignedSetup ? (
                                        <Badge variant="outline" className="text-xs">{assignedSetup.name}</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">{t("locations.noSetup")}</Badge>
                                      )}
                                      {spotMonthlyRent > 0 && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                          <DollarSign className="h-2.5 w-2.5 mr-0.5" />{fmt2(spotMonthlyRent)}{t("common.perMonth")}
                                        </Badge>
                                      )}
                                      {spotAccruedRent > 0 && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                          {t("locations.accrued")}: ${fmt2(spotAccruedRent)}
                                        </Badge>
                                      )}
                                      {assignedSetup && spotTotalCapacity > 0 && (
                                        <div className="hidden sm:flex items-center gap-2 ml-auto">
                                          <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${getStockColor(spotTotalStock, spotTotalCapacity)}`}
                                              style={{ width: `${Math.min(spotStockPct, 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-muted-foreground">{Math.round(spotStockPct)}%</span>
                                        </div>
                                      )}
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-3 pb-3">
                                    {!assignedSetup ? (
                                      <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">{t("locations.noSetupAssigned", { defaultValue: "No setup assigned to this spot." })}</p>
                                        {unassignedSetups.length > 0 ? (
                                          <Select onValueChange={(setupId) => {
                                            const setup = unassignedSetups.find(s => s.id === setupId);
                                            setAssignConfirm({
                                              setupId,
                                              setupName: setup?.name || "Unknown",
                                              spotId: spot.id,
                                              spotName: spot.name,
                                            });
                                          }}>
                                            <SelectTrigger className="w-full sm:w-[250px]">
                                              <SelectValue placeholder="Assign a setup..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {unassignedSetups.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                  {s.name} ({s.type})
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">{t("locations.noUnassignedSetups")}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{t("visitReport.setup")}: <strong className="text-foreground">{assignedSetup.name}</strong></span>
                                            <Badge variant="outline" className="text-xs capitalize">{assignedSetup.type}</Badge>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive gap-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setUnassignConfirm({
                                                setupId: assignedSetup.id,
                                                setupName: assignedSetup.name || "Unknown",
                                                spotName: spot.name,
                                              });
                                            }}
                                          >
                                            <Unlink className="h-3 w-3" />
                                            {t("locations.remove")}
                                          </Button>
                                        </div>
                                        {setupMachines.map((machine) => {
                                          const slots = getSlotsForMachine(machine.id);
                                          return (
                                            <div key={machine.id} className="border rounded-md overflow-hidden">
                                              <div
                                                className="flex items-center justify-between p-2 bg-muted/30 cursor-pointer hover:bg-muted/50"
                                                onClick={() => navigate(`/machines/${machine.id}`)}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                                  <span className="text-sm font-medium">{machine.serial_number}</span>
                                                </div>
                                                {machine.position_on_setup && (
                                                  <Badge variant="outline" className="text-xs">Pos {machine.position_on_setup}</Badge>
                                                )}
                                              </div>
                                              {slots.length > 0 && (
                                                <div className="p-2 space-y-2">
                                                  {slots.map((slot: any) => {
                                                    const stock = slot.current_stock || 0;
                                                    const capacity = slot.capacity || 150;
                                                    const pct = capacity > 0 ? (stock / capacity) * 100 : 0;
                                                    return (
                                                      <div key={slot.id} className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground w-10 shrink-0">S{slot.slot_number}</span>
                                                        <span className="text-xs text-foreground w-24 truncate">{slot.item_details?.name || "Empty"}</span>
                                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                          <div
                                                            className={`h-full rounded-full transition-all ${getStockColor(stock, capacity)}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                          />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground w-16 text-right">{stock}/{capacity}</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Setup Confirmation Dialog */}
      <AlertDialog open={!!assignConfirm} onOpenChange={(open) => { if (!open) setAssignConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("locations.confirmSetupAssignment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("locations.confirmSetupAssignmentDesc", { setup: assignConfirm?.setupName, spot: assignConfirm?.spotName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (assignConfirm) {
                assignSetupToSpot.mutate({ setupId: assignConfirm.setupId, spotId: assignConfirm.spotId });
                setAssignConfirm(null);
              }
            }}>
              {t("locations.yesAssign")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
