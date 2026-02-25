import { fmt2, fmt3, fmtPct } from "@/lib/formatters";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Pencil, Save, X, Camera, Upload, Trash2, DollarSign, Warehouse, Truck, ShoppingCart, AlertTriangle, Copy, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useCategories } from "@/hooks/useCategories";
import { format } from "date-fns";

const typeColors: Record<string, string> = {
  merchandise: "bg-primary/10 text-primary border-primary/20",
  machine_model: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  spare_part: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  supply: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const actionColors: Record<string, string> = {
  restock: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  collection: "bg-primary/10 text-primary border-primary/20",
  service: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  swap: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const movementColors: Record<string, string> = {
  receive: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  refill: "bg-primary/10 text-primary border-primary/20",
  removal: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  swap_in: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  swap_out: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  reversal: "bg-destructive/10 text-destructive border-destructive/20",
  adjustment: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  transfer: "bg-primary/10 text-primary border-primary/20",
  initial: "bg-muted text-muted-foreground border-border",
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { categories, getSubcategoriesByCategory } = useCategories();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    subcategory_id: "",
  });

  // --- Existing queries ---
  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select(`*, category:categories(id, name), subcategory:subcategories(id, name)`)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: warehouseStock = [] } = useQuery({
    queryKey: ["item-warehouse-stock", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("quantity_on_hand, warehouse:warehouses(id, name)")
        .eq("item_detail_id", id!)
        .not("warehouse_id", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: machineStock = [] } = useQuery({
    queryKey: ["item-machine-stock", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_slots")
        .select("current_stock, machine:machines(serial_number)")
        .eq("current_product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: purchaseBatches = [] } = useQuery({
    queryKey: ["item-purchase-batches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_items")
        .select(`
          id, quantity_ordered, quantity_received, quantity_remaining,
          unit_cost, landed_unit_cost, active_item, arrival_order, final_unit_cost,
          purchase:purchases(id, purchase_order_number, status, created_at, received_at)
        `)
        .eq("item_detail_id", id!)
        .order("arrival_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // --- New queries ---
  const { data: salesData } = useQuery({
    queryKey: ["item-sales-total", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_line_items")
        .select("units_sold, cash_collected, quantity_added, quantity_removed, false_coins")
        .eq("product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: logisticsHistory = [] } = useQuery({
    queryKey: ["item-logistics-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_line_items")
        .select(`
          id, spot_visit_id, slot_id, action_type, quantity_added, quantity_removed,
          cash_collected, meter_reading, units_sold, computed_current_stock,
          false_coins, jam_status, created_at,
          spot_visit:spot_visits(
            id, visit_date, status,
            spot:spots(name, location:locations(name))
          )
        `)
        .eq("product_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["item-visit-snapshots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_slot_snapshots")
        .select("visit_id, slot_id, previous_stock, previous_product_id")
        .eq("previous_product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ["item-inventory-ledger", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_ledger")
        .select(`
          id, created_at, movement_type, quantity, running_balance,
          reference_id, reference_type, notes,
          warehouse_id, slot_id, performed_by
        `)
        .eq("item_detail_id", id!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description || "",
        category_id: item.category_id || "",
        subcategory_id: item.subcategory_id || "",
      });
    }
  }, [item]);

  const subcategories = getSubcategoriesByCategory(form.category_id || undefined);

  const updateItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("item_details")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id || null,
          subcategory_id: form.subcategory_id || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["consolidated-inventory"] });
      setIsEditing(false);
      toast({ title: "Item updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${id}/photo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("item_details")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      toast({ title: "Photo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!id || !item?.photo_url) return;
    try {
      const { error } = await supabase
        .from("item_details")
        .update({ photo_url: null })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      toast({ title: "Photo removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCopyId = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading)
    return (
      <AppLayout>
        <div className="text-muted-foreground p-6">Loading...</div>
      </AppLayout>
    );
  if (!item)
    return (
      <AppLayout>
        <div className="text-muted-foreground p-6">Item not found</div>
      </AppLayout>
    );

  // --- Computed values ---
  const totalWarehouse = warehouseStock.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
  const totalMachine = machineStock.reduce((s, i) => s + (i.current_stock || 0), 0);
  const totalStock = totalWarehouse + totalMachine;

  const activeBatches = purchaseBatches.filter((b: any) => b.active_item && (b.quantity_remaining || 0) > 0);
  const totalInventoryCost = activeBatches.reduce((sum: number, b: any) => {
    return sum + (b.quantity_remaining || 0) * (b.final_unit_cost || 0);
  }, 0);
  const weightedAvgCost = totalStock > 0 ? totalInventoryCost / totalStock : 0;

  const totalUnitsSold = (salesData || []).reduce(
    (sum, s) => sum + (s.units_sold || 0), 0
  );
  const totalRevenue = (salesData || []).reduce(
    (sum, s) => sum + (Number(s.cash_collected) || 0), 0
  );
  const grossProfit = totalRevenue - totalInventoryCost;
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalReceived = purchaseBatches.reduce(
    (sum: number, b: any) => sum + (b.quantity_received || 0), 0
  );
  const totalFalseCoins = (salesData || []).reduce(
    (sum, s) => sum + (s.false_coins || 0), 0
  );

  const typeLabel = item.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—";
  const categoryLabel = (item as any).category?.name || null;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl p-4 md:p-6">
        {/* ===== SECTION 1: Navigation & Identity Header ===== */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground truncate">{item.name}</h1>
                <Badge className={typeColors[item.type] || ""}>{typeLabel}</Badge>
                {categoryLabel && (
                  <Badge variant="outline">{categoryLabel}</Badge>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm mt-0.5">{item.sku}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => updateItem.mutate()} disabled={!form.name.trim() || updateItem.isPending}>
                    <Save className="mr-1 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Edit form (shown only when editing) */}
        {isEditing && (
          <Card>
            <CardHeader><CardTitle>Edit Item Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Camera className="mr-1 h-4 w-4" /> {item.photo_url ? "Change" : "Upload"}
                    </Button>
                    {item.photo_url && (
                      <Button variant="outline" size="sm" onClick={handleRemovePhoto}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SECTION 2: High-Level Metric Cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unit Cost</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${fmt3(weightedAvgCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Warehouse</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalWarehouse.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Deployed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalMachine.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Sold</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalUnitsSold.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== SECTION 3: Financial Performance Panel ===== */}
        <Card>
          <CardHeader><CardTitle>Financial Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-lg font-semibold text-foreground">{totalReceived.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-lg font-semibold text-foreground">${fmt2(totalInventoryCost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold text-foreground">${fmt2(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className={`text-lg font-semibold ${grossProfit >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  ${fmt2(grossProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className={`text-lg font-semibold ${marginPct >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  {totalRevenue > 0 ? `${fmtPct(marginPct)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discrepancy alert (stock vs computed) */}
        {totalStock > 0 && totalReceived > 0 && (() => {
          const totalLost = totalUnitsSold + totalFalseCoins;
          const expectedStock = totalReceived - totalLost;
          const diff = totalStock - expectedStock;
          if (diff !== 0) {
            return (
              <Alert className="border-chart-4/50 bg-chart-4/5">
                <AlertTriangle className="h-4 w-4 text-chart-4" />
                <AlertTitle className="text-chart-4">
                  Stock Discrepancy Detected: {diff > 0 ? `Surplus of ${diff.toLocaleString()}` : `Shortage of ${Math.abs(diff).toLocaleString()}`} units
                </AlertTitle>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 transition-colors">
                    <ChevronDown className="h-3.5 w-3.5" />
                    View Breakdown
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-1 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Received (purchases)</span>
                        <span className="text-foreground">{totalReceived.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">− Units Sold (visits)</span>
                        <span className="text-destructive">−{totalUnitsSold.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">− False Coins (lost)</span>
                        <span className="text-destructive">−{totalFalseCoins.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border my-1" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">Expected Stock</span>
                        <span className="text-foreground">{expectedStock.toLocaleString()}</span>
                      </div>

                      <div className="mt-3 flex justify-between">
                        <span className="text-muted-foreground pl-2">Warehouse</span>
                        <span className="text-foreground">{totalWarehouse.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground pl-2">Deployed in Machines</span>
                        <span className="text-foreground">{totalMachine.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border my-1" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">Actual Stock</span>
                        <span className="text-foreground">{totalStock.toLocaleString()}</span>
                      </div>

                      <div className="border-t border-border my-1" />
                      <div className="flex justify-between font-bold">
                        <span className={diff > 0 ? "text-chart-2" : "text-destructive"}>Discrepancy</span>
                        <span className={diff > 0 ? "text-chart-2" : "text-destructive"}>
                          {diff > 0 ? "+" : ""}{diff.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Alert>
            );
          }
          return null;
        })()}

        {/* ===== SECTION 4: Detailed History Tabs ===== */}
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList>
            <TabsTrigger value="ledger">Inventory Ledger</TabsTrigger>
            <TabsTrigger value="logistics">Logistics History</TabsTrigger>
            <TabsTrigger value="acquisition">Acquisition History</TabsTrigger>
          </TabsList>

          {/* ── Inventory Ledger Tab ── */}
          <TabsContent value="ledger">
            <Card>
              <CardContent className="p-2 sm:p-4">
                {ledgerEntries.length === 0 ? (
                  <p className="text-muted-foreground p-4">No ledger entries yet.</p>
                ) : (
                  <div className="space-y-1">
                    {ledgerEntries.map((entry) => {
                      const locationLabel = entry.warehouse_id
                        ? warehouseStock.find((w: any) => w.warehouse?.id === entry.warehouse_id)?.warehouse?.name || "Warehouse"
                        : entry.slot_id
                        ? machineStock.find((m: any) => m.machine)?.machine?.serial_number || "Slot"
                        : "—";
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 border-b border-border/40 last:border-0"
                        >
                          {/* Left: date + type badge */}
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`text-[10px] px-1.5 py-0 ${movementColors[entry.movement_type] || ""}`}>
                                {entry.movement_type.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {entry.warehouse_id ? "🏭" : entry.slot_id ? "🎰" : ""} {locationLabel}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {entry.notes || "—"}
                            </span>
                          </div>
                          {/* Right: qty + balance + date */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${entry.quantity > 0 ? "text-chart-2" : entry.quantity < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                              </span>
                              <p className="text-[10px] text-muted-foreground">
                                bal: {entry.running_balance}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground w-14 text-right">
                              {entry.created_at ? format(new Date(entry.created_at), "MMM d") : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Logistics History Tab ── */}
          <TabsContent value="logistics">
            <Card>
              <CardContent className="p-2 sm:p-4">
                {logisticsHistory.length === 0 ? (
                  <p className="text-muted-foreground p-4">No logistics history yet.</p>
                ) : (
                  <div className="space-y-2">
                    {logisticsHistory.map((row: any) => {
                      const visit = row.spot_visit;
                      const spot = visit?.spot;
                      const location = spot?.location;
                      const snap = snapshots.find(
                        (s: any) => s.visit_id === row.spot_visit_id && s.slot_id === row.slot_id
                      );
                      const lastStock = snap?.previous_stock ?? null;
                      const currentStock = row.computed_current_stock ?? null;
                      const unitsSold = row.units_sold ?? 0;
                      const added = row.quantity_added || 0;
                      const removed = row.quantity_removed || 0;
                      const falseCoins = row.false_coins ?? 0;
                      const jamStatus = row.jam_status ?? "no_jam";
                      const auditedCount = row.meter_reading;
                      const jamLabel = jamStatus === "by_coin" ? "Jam (+1)" : jamStatus === "mechanical" ? "Jam (mech)" : "—";

                      return (
                        <div
                          key={row.id}
                          className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => row.spot_visit_id && navigate(`/visits/${row.spot_visit_id}`)}
                        >
                          {/* Header row: location + date + action */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${actionColors[row.action_type] || ""}`}>
                                {row.action_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate">
                                {location?.name ? `${location.name} › ${spot?.name || ""}` : spot?.name || "—"}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {visit?.visit_date ? format(new Date(visit.visit_date), "MMM d, yyyy") : "—"}
                            </span>
                          </div>
                          {/* Movement breakdown grid */}
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-2 gap-y-1 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Last</p>
                              <p className="text-sm font-medium text-foreground">{lastStock ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Current</p>
                              <p className="text-sm font-medium text-foreground">{currentStock ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Audited</p>
                              <p className="text-sm font-medium text-foreground">{auditedCount ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Sold</p>
                              <p className="text-sm font-medium text-primary">{unitsSold || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Added</p>
                              <p className="text-sm font-medium text-chart-2">{added > 0 ? `+${added}` : "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Removed</p>
                              <p className="text-sm font-medium text-destructive">{removed > 0 ? `-${removed}` : "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">False</p>
                              <p className="text-sm font-medium text-chart-4">{falseCoins || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Jam</p>
                              <p className="text-[11px] font-medium text-muted-foreground">{jamLabel}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acquisition">
            <Card>
              <CardContent className="p-0">
                {purchaseBatches.length === 0 ? (
                  <p className="text-muted-foreground p-6">No purchase history.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Batch Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseBatches.map((pi: any) => (
                        <TableRow
                          key={pi.id}
                          className={`cursor-pointer ${!pi.active_item ? "opacity-60" : ""}`}
                          onClick={() => pi.purchase && navigate(`/purchases/${pi.purchase.id}`)}
                        >
                          <TableCell className="text-sm">
                            {pi.purchase?.received_at
                              ? format(new Date(pi.purchase.received_at), "MMM d, yyyy")
                              : pi.purchase?.created_at
                              ? format(new Date(pi.purchase.created_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {pi.purchase?.purchase_order_number || "—"}
                          </TableCell>
                          <TableCell>
                            {pi.active_item ? (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Depleted</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{pi.quantity_ordered}</TableCell>
                          <TableCell className="text-right text-sm">{pi.quantity_received || 0}</TableCell>
                          <TableCell className="text-right text-sm">{pi.quantity_remaining || 0}</TableCell>
                          <TableCell className="text-right text-sm">${fmt3(Number(pi.final_unit_cost))}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {pi.active_item && (pi.quantity_remaining || 0) > 0
                              ? `$${fmt2((pi.quantity_remaining || 0) * (pi.final_unit_cost || 0))}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===== SECTION 5: Metadata Footer ===== */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-4">
          <span>Created: {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "—"}</span>
          <span>Updated: {item.updated_at ? format(new Date(item.updated_at), "MMM d, yyyy") : "—"}</span>
          <span className="flex items-center gap-1">
            ID: <code className="font-mono">{item.id.slice(0, 8)}…</code>
            <button onClick={handleCopyId} className="hover:text-foreground transition-colors">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
