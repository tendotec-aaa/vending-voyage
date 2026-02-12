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
import { ArrowLeft, Pencil, Save, X, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Textarea } from "@/components/ui/textarea";

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" as "active" | "inactive" });

  const { data: spot, isLoading } = useQuery({
    queryKey: ["spot", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("*, locations(id, name, rent_amount, total_spots)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: siblingCount = 1 } = useQuery({
    queryKey: ["sibling-count", spot?.location_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("spots")
        .select("id", { count: "exact", head: true })
        .eq("location_id", spot!.location_id!);
      if (error) throw error;
      return count || 1;
    },
    enabled: !!spot?.location_id,
  });

  const { data: setups = [] } = useQuery({
    queryKey: ["spot-setups", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, type").eq("spot_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: availableSetups = [] } = useQuery({
    queryKey: ["available-setups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, type").is("spot_id", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: spotMachines = [] } = useQuery({
    queryKey: ["spot-machines", id],
    queryFn: async () => {
      const setupIds = setups.map((s) => s.id);
      if (setupIds.length === 0) return [];
      const { data, error } = await supabase
        .from("machines")
        .select("id, serial_number, status, position_on_setup, model_id, setup_id, item_details:model_id(name)")
        .in("setup_id", setupIds)
        .order("position_on_setup");
      if (error) throw error;
      return data;
    },
    enabled: setups.length > 0,
  });

  // Fetch machine slots for all machines in this spot
  const { data: machineSlots = [] } = useQuery({
    queryKey: ["spot-machine-slots", id],
    queryFn: async () => {
      const machineIds = spotMachines.map((m: any) => m.id);
      if (machineIds.length === 0) return [];
      const { data, error } = await supabase
        .from("machine_slots")
        .select("*, item_details:current_product_id(name)")
        .in("machine_id", machineIds)
        .order("slot_number");
      if (error) throw error;
      return data;
    },
    enabled: spotMachines.length > 0,
  });

  const { data: spotInventory = [] } = useQuery({
    queryKey: ["spot-inventory", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, quantity_on_hand, item_detail:item_details(id, name, sku)")
        .eq("spot_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ["spot-recent-visits", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_visits")
        .select("id, visit_date, total_cash_collected, status")
        .eq("spot_id", id!)
        .order("visit_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (spot) setForm({ name: spot.name, description: spot.description || "", status: spot.status || "active" });
  }, [spot]);

  const updateSpot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("spots").update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spot", id] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      setIsEditing(false);
      toast({ title: "Spot updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignSetup = useMutation({
    mutationFn: async (setupId: string) => {
      await supabase.from("setups").update({ spot_id: null }).eq("spot_id", id!);
      if (setupId !== "none") {
        const { error } = await supabase.from("setups").update({ spot_id: id }).eq("id", setupId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spot-setups", id] });
      queryClient.invalidateQueries({ queryKey: ["available-setups"] });
      queryClient.invalidateQueries({ queryKey: ["spot-machines", id] });
      queryClient.invalidateQueries({ queryKey: ["spot-machine-slots", id] });
      toast({ title: "Setup assignment updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground p-6">Loading...</div></AppLayout>;
  if (!spot) return <AppLayout><div className="text-muted-foreground p-6">Spot not found</div></AppLayout>;

  const location = spot.locations as any;
  const rentPerSpot = location?.rent_amount && siblingCount > 0 ? (location.rent_amount / siblingCount) : 0;
  const currentSetup = setups[0];

  const getSlotsForMachine = (machineId: string) =>
    machineSlots.filter((s: any) => s.machine_id === machineId);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{spot.name}</h1>
              <p className="text-muted-foreground cursor-pointer hover:underline" onClick={() => location && navigate(`/locations/${location.id}`)}>
                {location?.name || "Unassigned"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                  <Button onClick={() => updateSpot.mutate()} disabled={!form.name.trim() || updateSpot.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
              )}
            </div>
          )}
        </div>

        {/* Spot Information */}
        <Card>
          <CardHeader><CardTitle>Spot Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> : <p className="text-foreground">{spot.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <Badge variant={spot.status === "active" ? "default" : "secondary"}>{spot.status}</Badge>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                {isEditing ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /> : <p className="text-foreground">{spot.description || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rent Information */}
        <Card>
          <CardHeader><CardTitle>Rent Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location Total Rent</p>
                <p className="text-lg font-semibold text-foreground">${location?.rent_amount || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spots at Location</p>
                <p className="text-lg font-semibold text-foreground">{siblingCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rent per Spot</p>
                <p className="text-lg font-semibold text-foreground">${rentPerSpot.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Setup</CardTitle>
              {isAdmin && (
                <Select value={currentSetup?.id || "none"} onValueChange={(v) => assignSetup.mutate(v)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Assign setup" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {currentSetup && <SelectItem value={currentSetup.id}>{currentSetup.name} (current)</SelectItem>}
                    {availableSetups.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentSetup ? (
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{currentSetup.type}</Badge>
                <span className="font-medium text-foreground">{currentSetup.name}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No setup assigned to this spot.</p>
            )}
          </CardContent>
        </Card>

        {/* Machines with Slots */}
        <Card>
          <CardHeader><CardTitle>Machines ({spotMachines.length})</CardTitle></CardHeader>
          <CardContent>
            {spotMachines.length === 0 ? (
              <p className="text-muted-foreground">No machines at this spot.</p>
            ) : (
              <div className="space-y-4">
                {spotMachines.map((machine: any) => {
                  const slots = getSlotsForMachine(machine.id);
                  return (
                    <div key={machine.id} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => navigate(`/machines/${machine.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-foreground">{machine.serial_number}</span>
                            {machine.item_details?.name && (
                              <p className="text-xs text-muted-foreground">{machine.item_details.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {machine.position_on_setup && <Badge variant="outline">Pos {machine.position_on_setup}</Badge>}
                          <Badge variant={machine.status === "deployed" ? "default" : "secondary"}>{machine.status}</Badge>
                        </div>
                      </div>
                      {slots.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Slot</TableHead>
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs text-right">Stock</TableHead>
                              <TableHead className="text-xs text-right">Capacity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {slots.map((slot: any) => (
                              <TableRow key={slot.id}>
                                <TableCell className="py-1 text-sm">{slot.slot_number}</TableCell>
                                <TableCell className="py-1 text-sm">{slot.item_details?.name || "—"}</TableCell>
                                <TableCell className="py-1 text-sm text-right">{slot.current_stock ?? 0}</TableCell>
                                <TableCell className="py-1 text-sm text-right">{slot.capacity ?? 150}</TableCell>
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
          </CardContent>
        </Card>

        {/* Spot Inventory */}
        <Card>
          <CardHeader><CardTitle>Inventory ({spotInventory.length})</CardTitle></CardHeader>
          <CardContent>
            {spotInventory.length === 0 ? (
              <p className="text-muted-foreground">No inventory at this spot.</p>
            ) : (
              <div className="space-y-2">
                {spotInventory.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-foreground">{inv.item_detail?.name || "Unknown"}</span>
                        <p className="text-xs text-muted-foreground font-mono">{inv.item_detail?.sku}</p>
                      </div>
                    </div>
                    <span className="font-medium text-foreground">{inv.quantity_on_hand || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Visits */}
        <Card>
          <CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader>
          <CardContent>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground">No visits recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-foreground">{visit.visit_date ? new Date(visit.visit_date).toLocaleDateString() : "—"}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">${visit.total_cash_collected || 0}</span>
                      <Badge variant={visit.status === "completed" ? "default" : "destructive"}>{visit.status}</Badge>
                    </div>
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
