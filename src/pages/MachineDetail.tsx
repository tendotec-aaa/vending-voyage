import { fmt2 } from "@/lib/formatters";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Fetch slot-level inventory ledger entries for all slots of this machine
  const slotIds = slots.map((s: any) => s.id);
  const { data: slotLedgerEntries = [] } = useQuery({
    queryKey: ["machine-slot-ledger", id, slotIds],
    queryFn: async () => {
      if (slotIds.length === 0) return [];
      const { data, error } = await supabase
        .from("inventory_ledger")
        .select(`
          id, created_at, movement_type, quantity, running_balance,
          reference_id, reference_type, notes, slot_id, item_detail_id
        `)
        .in("slot_id", slotIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: slotIds.length > 0,
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

  const { data: visitLineItems = [] } = useQuery({
    queryKey: ["machine-visit-lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_line_items")
        .select(`
          id, created_at, action_type, quantity_added, quantity_removed,
          cash_collected, meter_reading, false_coins, jam_status,
          computed_current_stock, units_sold, photo_url,
          product:item_details!visit_line_items_product_id_fkey(id, name),
          slot:machine_slots!visit_line_items_slot_id_fkey(slot_number),
          visit:spot_visits!visit_line_items_spot_visit_id_fkey(id, visit_date, visit_type)
        `)
        .eq("machine_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
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

        {/* Per-Slot Cards */}
        {slots.map((slot: any) => {
          const slotVisitLines = visitLineItems.filter((li: any) => li.slot?.slot_number === slot.slot_number);
          const slotLedger = slotLedgerEntries.filter((e: any) => e.slot_id === slot.id);
          const slotTickets = tickets.filter((t) => t.id && false); // tickets don't have slot filtering currently
          return (
            <Card key={slot.id}>
              <CardHeader><CardTitle>Machine Slot #{slot.slot_number}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {/* Slot Info */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Capacity</TableHead>
                      <TableHead className="text-right">Coin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{slot.item_details?.name || "—"}</TableCell>
                      <TableCell className="text-right">{slot.current_stock ?? 0}</TableCell>
                      <TableCell className="text-right">{slot.capacity ?? 150}</TableCell>
                      <TableCell className="text-right">${fmt2(Number(slot.coin_acceptor ?? 1))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Slot History */}
                <Tabs defaultValue="logistics">
                  <TabsList className="mb-4">
                    <TabsTrigger value="ledger">Inventory Ledger ({slotLedger.length})</TabsTrigger>
                    <TabsTrigger value="logistics">Logistics History ({slotVisitLines.length})</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance (0)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ledger">
                    {slotLedger.length === 0 ? (
                      <p className="text-muted-foreground">No ledger entries for this slot.</p>
                    ) : (
                      <div className="space-y-1">
                        {slotLedger.map((entry: any) => {
                          const movColors: Record<string, string> = {
                            sale: "bg-chart-2/10 text-chart-2 border-chart-2/20",
                            refill: "bg-primary/10 text-primary border-primary/20",
                            removal: "bg-chart-4/10 text-chart-4 border-chart-4/20",
                            swap_in: "bg-chart-2/10 text-chart-2 border-chart-2/20",
                            swap_out: "bg-chart-3/10 text-chart-3 border-chart-3/20",
                            adjustment: "bg-chart-5/20 text-chart-5 border-chart-5/30",
                          };
                          return (
                            <div key={entry.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 border-b border-border/40 last:border-0">
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-[10px] px-1.5 py-0 ${movColors[entry.movement_type] || ""}`}>
                                    {entry.movement_type.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground truncate">{entry.notes || "—"}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right min-w-[35px]">
                                  <span className="text-[10px] text-muted-foreground block">Qty</span>
                                  <span className={`text-sm font-semibold ${entry.quantity > 0 ? "text-chart-2" : "text-destructive"}`}>
                                    {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                                  </span>
                                </div>
                                <div className="text-right min-w-[35px]">
                                  <span className="text-[10px] text-muted-foreground block">Bal</span>
                                  <span className="text-sm font-medium text-foreground">{entry.running_balance}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground w-16 text-right">
                                  {entry.created_at ? format(new Date(entry.created_at), "MMM d, yy") : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>


                  <TabsContent value="logistics">
                    {slotVisitLines.length === 0 ? (
                      <p className="text-muted-foreground">No visit records for this slot.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Last Stock</TableHead>
                              <TableHead className="text-right">Current</TableHead>
                              <TableHead className="text-right">Sold</TableHead>
                              <TableHead className="text-right">Added</TableHead>
                              <TableHead className="text-right">Removed</TableHead>
                              <TableHead className="text-right">Cash</TableHead>
                              <TableHead className="text-right">False</TableHead>
                              <TableHead>Jam</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {slotVisitLines.map((li: any) => {
                              const lastStock = (li.computed_current_stock ?? 0) - (li.quantity_added ?? 0) + (li.quantity_removed ?? 0) + (li.units_sold ?? 0);
                              return (
                                <TableRow key={li.id} className="cursor-pointer hover:bg-muted/50" onClick={() => li.visit?.id && navigate(`/visits/${li.visit.id}`)}>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    {li.visit?.visit_date ? format(new Date(li.visit.visit_date), "MMM d, yyyy") : "—"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{li.action_type}</Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[120px] truncate">{li.product?.name || "—"}</TableCell>
                                  <TableCell className="text-right">{lastStock}</TableCell>
                                  <TableCell className="text-right font-medium">{li.computed_current_stock ?? 0}</TableCell>
                                  <TableCell className="text-right">{li.units_sold ?? 0}</TableCell>
                                  <TableCell className="text-right text-green-600">{li.quantity_added ? `+${li.quantity_added}` : "0"}</TableCell>
                                  <TableCell className="text-right text-red-600">{li.quantity_removed ? `-${li.quantity_removed}` : "0"}</TableCell>
                                  <TableCell className="text-right">${fmt2(Number(li.cash_collected ?? 0))}</TableCell>
                                  <TableCell className="text-right">{li.false_coins ?? 0}</TableCell>
                                  <TableCell>
                                    {li.jam_status && li.jam_status !== "no_jam" ? (
                                      <Badge variant="destructive" className="text-xs">{li.jam_status}</Badge>
                                    ) : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="maintenance">
                    <p className="text-muted-foreground">No maintenance records for this slot.</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          );
        })}

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
