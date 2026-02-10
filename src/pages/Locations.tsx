import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, MapPin, Search, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type Spot = Database["public"]["Tables"]["spots"]["Row"];
type Setup = Database["public"]["Tables"]["setups"]["Row"];

export default function Locations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form state - matches database columns
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

  // Fetch locations from 'locations' table
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all spots from 'spots' table (NOT location_spots)
  const { data: spots = [] } = useQuery({
    queryKey: ["spots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all setups
  const { data: setups = [] } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setups")
        .select("id, name, spot_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Create location mutation - uses correct column names
  const createLocation = useMutation({
    mutationFn: async () => {
      const totalSpotsNum = parseInt(newTotalSpots, 10);
      if (isNaN(totalSpotsNum) || totalSpotsNum < 0) {
        throw new Error("Total spots must be a valid number");
      }
      
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
      
      const { data, error } = await supabase
        .from("locations")
        .insert(locationData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Auto-create spots for this location based on total_spots
      if (totalSpotsNum > 0 && data) {
        const spotsToCreate = Array.from({ length: totalSpotsNum }, (_, i) => ({
          location_id: data.id,
          name: `Spot ${i + 1}`,
          status: 'active' as const,
        }));
        
        const { error: spotsError } = await supabase
          .from("spots")
          .insert(spotsToCreate);
        
        if (spotsError) {
          console.error("Error creating spots:", spotsError);
          // Don't throw - location was created successfully
        }
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

  // Delete location
  const deleteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting location", description: error.message, variant: "destructive" });
    },
  });

  // Assign setup to spot - updates setups.spot_id
  const assignSetupToSpot = useMutation({
    mutationFn: async ({ spotId, setupId }: { spotId: string; setupId: string | null }) => {
      // First, unassign any setup currently assigned to this spot
      const { error: unassignError } = await supabase
        .from("setups")
        .update({ spot_id: null })
        .eq("spot_id", spotId);
      
      if (unassignError) throw unassignError;
      
      // Then assign the new setup if one was selected
      if (setupId) {
        const { error: assignError } = await supabase
          .from("setups")
          .update({ spot_id: spotId })
          .eq("id", setupId);
        
        if (assignError) throw assignError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      toast({ title: "Spot updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating spot", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewAddress("");
    setNewContactPersonName("");
    setNewContactPersonNumber("");
    setNewContactPersonEmail("");
    setNewTotalSpots("1");
    setNewNegotiationType("fixed_rent");
    setNewRentAmount("");
    setNewCommissionPercentage("");
    setNewContractStartDate("");
    setNewContractEndDate("");
    setNewContractTerm("indefinite");
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

  const getOccupiedCount = (locationId: string) => {
    const locationSpots = spots.filter((s) => s.location_id === locationId);
    return locationSpots.filter((spot) => setups.some((setup) => setup.spot_id === spot.id)).length;
  };

  // Get setups that are not assigned to any spot
  const getAvailableSetups = (currentSpotId?: string) => 
    setups.filter((s) => !s.spot_id || s.spot_id === currentSpotId);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Locations</h1>
            <p className="text-muted-foreground">Manage venues and assign setups to spots</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
                <DialogDescription>
                  Add a new venue with available spots for setups.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mall Plaza Downtown"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person_name">Contact Name</Label>
                    <Input
                      id="contact_person_name"
                      placeholder="John Doe"
                      value={newContactPersonName}
                      onChange={(e) => setNewContactPersonName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person_number">Contact Phone</Label>
                    <Input
                      id="contact_person_number"
                      placeholder="+1 555-1234"
                      value={newContactPersonNumber}
                      onChange={(e) => setNewContactPersonNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person_email">Contact Email</Label>
                  <Input
                    id="contact_person_email"
                    type="email"
                    placeholder="contact@example.com"
                    value={newContactPersonEmail}
                    onChange={(e) => setNewContactPersonEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negotiation_type">Negotiation Type</Label>
                  <Select value={newNegotiationType} onValueChange={(v) => setNewNegotiationType(v as typeof newNegotiationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_rent">Fixed Rent</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newNegotiationType === "fixed_rent" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label htmlFor="rent_amount">Rent Amount</Label>
                    <Input
                      id="rent_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newRentAmount}
                      onChange={(e) => setNewRentAmount(e.target.value)}
                    />
                  </div>
                )}
                {(newNegotiationType === "commission" || newNegotiationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label htmlFor="commission_percentage">Commission Percentage</Label>
                    <Input
                      id="commission_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0.00"
                      value={newCommissionPercentage}
                      onChange={(e) => setNewCommissionPercentage(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="total_spots">Number of Spots *</Label>
                  <Input
                    id="total_spots"
                    type="number"
                    min="0"
                    placeholder="8"
                    value={newTotalSpots}
                    onChange={(e) => setNewTotalSpots(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This determines how many setups can be placed at this location.
                  </p>
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
                    <Label htmlFor="contract_start_date">Contract Start Date</Label>
                    <Input
                      id="contract_start_date"
                      type="date"
                      value={newContractStartDate}
                      onChange={(e) => setNewContractStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_end_date">Contract End Date</Label>
                    <Input
                      id="contract_end_date"
                      type="date"
                      value={newContractEndDate}
                      onChange={(e) => setNewContractEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createLocation.mutate()}
                  disabled={!newName.trim() || createLocation.isPending}
                >
                  Create Location
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Locations Grid */}
        {isLoading ? (
          <div className="text-muted-foreground">Loading locations...</div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location) => {
              const locationSpots = getSpotsForLocation(location.id);
              const occupied = getOccupiedCount(location.id);
              const totalSpots = location.total_spots || locationSpots.length;

              return (
                <Card key={location.id} className="cursor-pointer" onClick={() => navigate(`/locations/${location.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {location.name}
                        </CardTitle>
                        {location.address && (
                          <CardDescription className="mt-1">{location.address}</CardDescription>
                        )}
                      </div>
                      <Badge variant={occupied === totalSpots ? "default" : "secondary"}>
                        {occupied}/{totalSpots} spots
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact info */}
                    {(location.contact_person_name || location.contact_person_number) && (
                      <div className="text-sm text-muted-foreground">
                        {location.contact_person_name && <p>{location.contact_person_name}</p>}
                        {location.contact_person_number && <p>{location.contact_person_number}</p>}
                      </div>
                    )}

                    {/* Spots Accordion */}
                    {locationSpots.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        {locationSpots.map((spot) => {
                          const assignedSetup = getSetupForSpot(spot.id);
                          const availableSetups = getAvailableSetups(spot.id);

                          return (
                            <AccordionItem key={spot.id} value={spot.id}>
                              <AccordionTrigger className="py-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium border ${
                                      assignedSetup
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted text-muted-foreground border-border"
                                    }`}
                                  >
                                    <Layers className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm">
                                    {spot.name}: {assignedSetup ? assignedSetup.name : "Empty"}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-2 pb-1">
                                  <Label className="text-xs text-muted-foreground mb-2 block">
                                    Assign Setup
                                  </Label>
                                  <Select
                                    value={assignedSetup?.id || "empty"}
                                    onValueChange={(value) =>
                                      assignSetupToSpot.mutate({
                                        spotId: spot.id,
                                        setupId: value === "empty" ? null : value,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a setup" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="empty">
                                        <span className="text-muted-foreground">Empty</span>
                                      </SelectItem>
                                      {availableSetups.map((setup) => (
                                        <SelectItem key={setup.id} value={setup.id}>
                                          <span className="flex items-center gap-2">
                                            <Layers className="h-4 w-4" />
                                            {setup.name}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}

                    {/* Delete Action */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteLocation.mutate(location.id)}
                    >
                      Delete Location
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
