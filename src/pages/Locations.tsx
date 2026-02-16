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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, MapPin, Search, Layers, ChevronDown, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export default function Locations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

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

  // All setups not assigned to any spot (for assignment dropdown)
  const unassignedSetups = setups.filter((s) => !s.spot_id);

  const assignSetupToSpot = useMutation({
    mutationFn: async ({ setupId, spotId }: { setupId: string; spotId: string }) => {
      const { error } = await supabase.from("setups").update({ spot_id: spotId }).eq("id", setupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      toast({ title: "Setup assigned to spot" });
    },
    onError: (error) => {
      toast({ title: "Error assigning setup", description: error.message, variant: "destructive" });
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
      toast({ title: "Location created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating location", description: error.message, variant: "destructive" });
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
    spots.filter((s) => s.location_id === locationId).sort((a, b) => a.name.localeCompare(b.name));

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
            <h1 className="text-2xl font-bold text-foreground">Locations</h1>
            <p className="text-muted-foreground">Manage venues and assign setups to spots</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Location</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
                <DialogDescription>Add a new venue with available spots for setups.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="e.g., Mall Plaza Downtown" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input placeholder="123 Main Street" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input value={newContactPersonName} onChange={(e) => setNewContactPersonName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={newContactPersonNumber} onChange={(e) => setNewContactPersonNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={newContactPersonEmail} onChange={(e) => setNewContactPersonEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Negotiation Type</Label>
                  <Select value={newNegotiationType} onValueChange={(v) => setNewNegotiationType(v as typeof newNegotiationType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_rent">Fixed Rent</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newNegotiationType === "fixed_rent" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label>Rent Amount</Label>
                    <Input type="number" min="0" step="0.01" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} />
                  </div>
                )}
                {(newNegotiationType === "commission" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label>Commission %</Label>
                    <Input type="number" min="0" max="100" step="0.01" value={newCommissionPercentage} onChange={(e) => setNewCommissionPercentage(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Number of Spots *</Label>
                  <Input type="number" min="0" value={newTotalSpots} onChange={(e) => setNewTotalSpots(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contract Term</Label>
                  <Select value={newContractTerm} onValueChange={(v) => setNewContractTerm(v as typeof newContractTerm)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_year">1 Year</SelectItem>
                      <SelectItem value="2_years">2 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contract Start</Label>
                    <Input type="date" value={newContractStartDate} onChange={(e) => setNewContractStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contract End</Label>
                    <Input type="date" value={newContractEndDate} onChange={(e) => setNewContractEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={() => createLocation.mutate()} disabled={!newName.trim() || createLocation.isPending}>Create Location</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading locations...</div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>Create your first location</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLocations.map((location) => {
              const locationSpots = getSpotsForLocation(location.id);
              const totalSpots = location.total_spots || locationSpots.length;

              return (
                <Card key={location.id}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <button
                          className="text-lg font-semibold text-primary hover:underline text-left"
                          onClick={() => navigate(`/locations/${location.id}`)}
                        >
                          {location.name}
                        </button>
                        <p className="text-sm text-muted-foreground">{location.address || "No address"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{locationSpots.length}/{totalSpots} spots</Badge>
                        <span className="text-sm text-foreground font-medium">${fmt2(Number(location.rent_amount || 0))}</span>
                      </div>
                    </div>

                    {locationSpots.length > 0 && (
                      <Accordion type="multiple" className="w-full">
                        {locationSpots.map((spot) => {
                          const assignedSetup = getSetupForSpot(spot.id);
                          const setupMachines = assignedSetup ? getMachinesForSetup(assignedSetup.id) : [];

                          // Calculate overall spot stock
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

                          return (
                            <AccordionItem key={spot.id} value={spot.id}>
                              <AccordionTrigger className="py-2 px-3 hover:no-underline">
                                <div className="flex items-center gap-3 flex-1 mr-2">
                                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium">{spot.name}</span>
                                  <Badge variant={spot.status === "active" ? "default" : "secondary"} className="text-xs">{spot.status}</Badge>
                                  {assignedSetup ? (
                                    <Badge variant="outline" className="text-xs">{assignedSetup.name}</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">No setup</Badge>
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
                                    <p className="text-sm text-muted-foreground">No setup assigned to this spot.</p>
                                    {unassignedSetups.length > 0 ? (
                                      <Select onValueChange={(setupId) => assignSetupToSpot.mutate({ setupId, spotId: spot.id })}>
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
                                      <p className="text-xs text-muted-foreground">No unassigned setups available. Create one in the Setups page.</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <span>Setup: <strong className="text-foreground">{assignedSetup.name}</strong></span>
                                      <Badge variant="outline" className="text-xs capitalize">{assignedSetup.type}</Badge>
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
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
