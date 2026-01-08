import { useState } from "react";
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
import { Plus, MapPin, Search, Layers, Grid3X3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Location = {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  spots_count: number;
  created_at: string;
};

type LocationSpot = {
  id: string;
  location_id: string;
  spot_number: number;
  setup_id: string | null;
};

type Setup = {
  id: string;
  name: string;
};

export default function Locations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isManageSpotsOpen, setIsManageSpotsOpen] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newSpotsCount, setNewSpotsCount] = useState("1");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Location[];
    },
  });

  // Fetch all spots
  const { data: spots = [] } = useQuery({
    queryKey: ["location_spots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_spots")
        .select("*")
        .order("spot_number");
      if (error) throw error;
      return data as LocationSpot[];
    },
  });

  // Fetch all setups
  const { data: setups = [] } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setups")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Setup[];
    },
  });

  // Create location
  const createLocation = useMutation({
    mutationFn: async () => {
      const spotsNum = parseInt(newSpotsCount, 10);
      if (isNaN(spotsNum) || spotsNum < 1) {
        throw new Error("Spots must be at least 1");
      }
      const { error } = await supabase.from("locations").insert({
        name: newName.trim(),
        address: newAddress.trim() || null,
        contact_name: newContactName.trim() || null,
        contact_phone: newContactPhone.trim() || null,
        spots_count: spotsNum,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["location_spots"] });
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
      queryClient.invalidateQueries({ queryKey: ["location_spots"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting location", description: error.message, variant: "destructive" });
    },
  });

  // Assign setup to spot
  const assignSetupToSpot = useMutation({
    mutationFn: async ({ spotId, setupId }: { spotId: string; setupId: string | null }) => {
      const { error } = await supabase
        .from("location_spots")
        .update({ setup_id: setupId })
        .eq("id", spotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_spots"] });
      toast({ title: "Spot updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating spot", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewAddress("");
    setNewContactName("");
    setNewContactPhone("");
    setNewSpotsCount("1");
  };

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpotsForLocation = (locationId: string) =>
    spots.filter((s) => s.location_id === locationId).sort((a, b) => a.spot_number - b.spot_number);

  const getOccupiedCount = (locationId: string) =>
    spots.filter((s) => s.location_id === locationId && s.setup_id !== null).length;

  // Get setups that are already assigned to any spot
  const getAssignedSetupIds = () => new Set(spots.filter((s) => s.setup_id).map((s) => s.setup_id));

  const getSetupName = (setupId: string | null) => {
    if (!setupId) return null;
    return setups.find((s) => s.id === setupId)?.name || "Unknown Setup";
  };

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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
                <DialogDescription>
                  Add a new venue with available spots for setups.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input
                      id="contact_name"
                      placeholder="John Doe"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      placeholder="+1 555-1234"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spots_count">Number of Spots *</Label>
                  <Input
                    id="spots_count"
                    type="number"
                    min="1"
                    placeholder="8"
                    value={newSpotsCount}
                    onChange={(e) => setNewSpotsCount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This determines how many setups can be placed at this location.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createLocation.mutate()}
                  disabled={!newName.trim() || !newSpotsCount || createLocation.isPending}
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
              const occupied = getOccupiedCount(location.id);
              return (
                <Card key={location.id}>
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
                      <Badge variant={occupied === location.spots_count ? "default" : "secondary"}>
                        {occupied}/{location.spots_count} spots
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact info */}
                    {(location.contact_name || location.contact_phone) && (
                      <div className="text-sm text-muted-foreground">
                        {location.contact_name && <p>{location.contact_name}</p>}
                        {location.contact_phone && <p>{location.contact_phone}</p>}
                      </div>
                    )}

                    {/* Spots preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {getSpotsForLocation(location.id).map((spot) => (
                        <div
                          key={spot.id}
                          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium border ${
                            spot.setup_id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                          title={spot.setup_id ? getSetupName(spot.setup_id) || "" : "Empty"}
                        >
                          {spot.spot_number}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedLocation(location);
                          setIsManageSpotsOpen(true);
                        }}
                      >
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        Manage Spots
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLocation.mutate(location.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Manage Spots Dialog */}
        <Dialog open={isManageSpotsOpen} onOpenChange={setIsManageSpotsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Spots - {selectedLocation?.name}</DialogTitle>
              <DialogDescription>
                Assign setups to each spot. Each setup can only be assigned to one spot across all locations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
              {selectedLocation &&
                getSpotsForLocation(selectedLocation.id).map((spot) => {
                  const assignedSetupIds = getAssignedSetupIds();
                  const availableSetups = setups.filter(
                    (s) => !assignedSetupIds.has(s.id) || s.id === spot.setup_id
                  );

                  return (
                    <div
                      key={spot.id}
                      className="flex items-center gap-4 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-sm font-semibold">
                        #{spot.spot_number}
                      </div>
                      <div className="flex-1">
                        <Select
                          value={spot.setup_id || "empty"}
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
                    </div>
                  );
                })}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsManageSpotsOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
