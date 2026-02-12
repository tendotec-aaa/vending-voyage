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
import { ArrowLeft, Pencil, Save, X, Truck, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MachineStatus = Database["public"]["Enums"]["machine_status"];

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ cash_key: "", toy_key: "", model_id: "" });

  const { data: machine, isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: itemDetails } = useQuery({
    queryKey: ["item-detail-for-machine", machine?.model_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_details").select("id, name, sku").eq("id", machine!.model_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!machine?.model_id,
  });

  const { data: setup } = useQuery({
    queryKey: ["setup-for-machine", machine?.setup_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, type, spot_id").eq("id", machine!.setup_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!machine?.setup_id,
  });

  const { data: spot } = useQuery({
    queryKey: ["spot-for-machine", setup?.spot_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("spots").select("id, name, location_id").eq("id", setup!.spot_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!setup?.spot_id,
  });

  const { data: location } = useQuery({
    queryKey: ["location-for-machine", spot?.location_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("id", spot!.location_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!spot?.location_id,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["machine-slots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_slots")
        .select("*, item_details:current_product_id(id, name, sku)")
        .eq("machine_id", id!)
        .order("slot_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["machine-tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, created_at, issue_type, priority, status, description, resolved_at, cost")
        .eq("machine_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["all-item-details"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_details").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (machine) {
      setForm({
        cash_key: machine.cash_key || "",
        toy_key: machine.toy_key || "",
        model_id: machine.model_id || "",
      });
    }
  }, [machine]);

  const updateMachine = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("machines").update({
        cash_key: form.cash_key.trim() || null,
        toy_key: form.toy_key.trim() || null,
        model_id: form.model_id || null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine", id] });
      setIsEditing(false);
      toast({ title: "Machine updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: MachineStatus) => {
      const updates: any = { status };
      if (status === "in_warehouse") {
        updates.setup_id = null;
        updates.position_on_setup = null;
      }
      const { error } = await supabase.from("machines").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine", id] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: "Status updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground p-6">Loading...</div></AppLayout>;
  if (!machine) return <AppLayout><div className="text-muted-foreground p-6">Machine not found</div></AppLayout>;

  const isRetired = machine.status === "retired";
  const isAssigned = !!machine.setup_id && !isRetired;
  const isDeployed = isAssigned && !!setup?.spot_id;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/machines")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {machine.serial_number}
              </h1>
              <p className="text-muted-foreground">{itemDetails?.name || "No item assigned"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAssigned ? "default" : isRetired ? "outline" : "secondary"}>
              {isRetired ? "Retired" : isAssigned ? "Assigned" : "Unassigned"}
            </Badge>
            <Badge variant={isDeployed ? "default" : isRetired ? "outline" : "secondary"}>
              {isRetired ? "Discarded" : isDeployed ? "Deployed" : "In Warehouse"}
            </Badge>
            {isAdmin && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
            )}
            {isAdmin && isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                <Button onClick={() => updateMachine.mutate()} disabled={updateMachine.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Machine Info */}
        <Card>
          <CardHeader><CardTitle>Machine Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Serial Number</Label>
                <p className="font-medium text-foreground">{machine.serial_number}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Serial Generation</Label>
                <p className="font-medium text-foreground">{machine.serial_generation || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Item Name</Label>
                {isEditing ? (
                  <Select value={form.model_id || "none"} onValueChange={(v) => setForm({ ...form, model_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {allItems.map((item) => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium text-foreground">{itemDetails?.name || "—"}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Number of Slots</Label>
                <p className="font-medium text-foreground">{machine.number_of_slots || 1}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Cash Key</Label>
                {isEditing ? (
                  <Input value={form.cash_key} onChange={(e) => setForm({ ...form, cash_key: e.target.value })} />
                ) : (
                  <p className="font-medium text-foreground">{machine.cash_key || "—"}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Toy Key</Label>
                {isEditing ? (
                  <Input value={form.toy_key} onChange={(e) => setForm({ ...form, toy_key: e.target.value })} />
                ) : (
                  <p className="font-medium text-foreground">{machine.toy_key || "—"}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Start Date</Label>
                <p className="font-medium text-foreground">
                  {machine.created_at ? format(new Date(machine.created_at), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Assignment */}
        <Card>
          <CardHeader><CardTitle>Current Assignment</CardTitle></CardHeader>
          <CardContent>
            {isAssigned ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Setup</Label>
                  <button className="font-medium text-primary hover:underline block" onClick={() => navigate("/setups")}>
                    {setup?.name || "—"}
                  </button>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Spot</Label>
                  {spot ? (
                    <button className="font-medium text-primary hover:underline block" onClick={() => navigate(`/spots/${spot.id}`)}>
                      {spot.name}
                    </button>
                  ) : (
                    <p className="text-muted-foreground">Not deployed</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Location</Label>
                  {location ? (
                    <button className="font-medium text-primary hover:underline block" onClick={() => navigate(`/locations/${location.id}`)}>
                      {location.name}
                    </button>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{isRetired ? "This machine has been retired." : "Not assigned to any setup."}</p>
            )}
          </CardContent>
        </Card>

        {/* Slots */}
        <Card>
          <CardHeader><CardTitle>Machine Slots ({slots.length})</CardTitle></CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <p className="text-muted-foreground">No slots configured.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Coin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot: any) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{slot.slot_number}</TableCell>
                      <TableCell>{slot.item_details?.name || "—"}</TableCell>
                      <TableCell className="text-right">{slot.current_stock ?? 0}</TableCell>
                      <TableCell className="text-right">{slot.capacity ?? 150}</TableCell>
                      <TableCell className="text-right">${Number(slot.coin_acceptor ?? 1).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Maintenance History */}
        <Card>
          <CardHeader><CardTitle>Maintenance History ({tickets.length})</CardTitle></CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-muted-foreground">No maintenance records.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-foreground">{ticket.issue_type}</span>
                        {ticket.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ticket.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ticket.priority === "urgent" || ticket.priority === "high" ? "destructive" : "secondary"}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={ticket.status === "completed" ? "default" : "outline"}>
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Actions */}
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Status Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {machine.status !== "in_warehouse" && (
                  <Button variant="outline" onClick={() => updateStatus.mutate("in_warehouse")}>Return to Warehouse</Button>
                )}
                {machine.status !== "maintenance" && (
                  <Button variant="outline" onClick={() => updateStatus.mutate("maintenance")}>
                    <Wrench className="mr-2 h-4 w-4" /> Set to Maintenance
                  </Button>
                )}
                {machine.status !== "retired" && (
                  <Button variant="destructive" onClick={() => updateStatus.mutate("retired")}>Retire Machine</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
