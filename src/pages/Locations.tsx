import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, MapPin, Search, Layers, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export default function Locations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Form state
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

  const createLocation = useMutation({
    mutationFn: async () => {
      const totalSpotsNum = parseInt(newTotalSpots, 10);
      if (isNaN(totalSpotsNum) || totalSpotsNum < 0) throw new Error("Total spots must be a valid number");

      const locationData: Database["public"]["Tables"]["locations"]["Insert"] = {
        name: newName.trim(),
        address: newAddress.trim() || null,
        contact_person_name: newContactPersonName.trim() || null,
        contact_person_number: newContactPersonNumber.trim() || null,
        contact_person_email: newContactPersonEmail.trim() || null,
        total_spots: totalSpotsNum,
        negotiation_type: newNegotiationType,
        rent_amount: newRentAmount ? parseFloat(newRentAmount) : 0,
        commission_percentage: newCommissionPercentage ? parseFloat(newCommissionPercentage) : 0,
        contract_start_date: newContractStartDate || null,
        contract_end_date: newContractEndDate || null,
        contract_term: newContractTerm,
      };

      const { data, error } = await supabase.from("locations").insert(locationData).select().single();
      if (error) throw error;

      if (totalSpotsNum > 0 && data) {
        const spotsToCreate = Array.from({ length: totalSpotsNum }, (_, i) => ({
          location_id: data.id,
          name: `Spot ${i + 1}`,
          status: "active" as const,
        }));
        await supabase.from("spots").insert(spotsToCreate);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      resetForm();
      setIsCreateOpen(false);
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

  const getSetupForSpot = (spotId: string) =>
    setups.find((s) => s.spot_id === spotId);

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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Spots</TableHead>
                  <TableHead>Contract</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => {
                  const locationSpots = getSpotsForLocation(location.id);
                  const isExpanded = expandedLocations.has(location.id);
                  const totalSpots = location.total_spots || locationSpots.length;
                  const rentPerSpot = totalSpots > 0 ? (location.rent_amount || 0) / totalSpots : 0;

                  return (
                    <>
                      <TableRow key={location.id} className="hover:bg-muted/50">
                        <TableCell>
                          {locationSpots.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpanded(location.id)}>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            className="font-medium text-primary hover:underline text-left"
                            onClick={() => navigate(`/locations/${location.id}`)}
                          >
                            {location.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{location.address || "—"}</TableCell>
                        <TableCell className="text-right text-foreground">${Number(location.rent_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{locationSpots.length}/{totalSpots}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {location.contract_start_date
                            ? `${location.contract_start_date}${location.contract_end_date ? ` → ${location.contract_end_date}` : ""}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && locationSpots.map((spot) => {
                        const assignedSetup = getSetupForSpot(spot.id);
                        return (
                          <TableRow key={spot.id} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell colSpan={2} className="pl-10">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <button
                                  className="text-sm font-medium text-primary hover:underline"
                                  onClick={() => navigate(`/spots/${spot.id}`)}
                                >
                                  {spot.name}
                                </button>
                                <Badge variant={spot.status === "active" ? "default" : "secondary"} className="text-xs">
                                  {spot.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              ${rentPerSpot.toFixed(2)}/spot
                            </TableCell>
                            <TableCell colSpan={2} className="text-sm text-muted-foreground">
                              {assignedSetup ? assignedSetup.name : "No setup assigned"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
