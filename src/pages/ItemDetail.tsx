import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useCategories } from "@/hooks/useCategories";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { categories, getSubcategoriesByCategory } = useCategories();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    subcategory_id: "",
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select(`
          *,
          category:categories(id, name),
          subcategory:subcategories(id, name)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Warehouse stock breakdown
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

  // In-machine stock
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

  // Purchase batches (FIFO) - all batches, not just active
  const { data: purchaseBatches = [] } = useQuery({
    queryKey: ["item-purchase-batches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_items")
        .select(`
          id, quantity_ordered, quantity_received, quantity_remaining,
          unit_cost, landed_unit_cost, active_item, arrival_order,
          purchase:purchases(id, purchase_order_number, status, created_at, received_at)
        `)
        .eq("item_detail_id", id!)
        .order("arrival_order", { ascending: true });
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

  if (isLoading) return <AppLayout><div className="text-muted-foreground p-6">Loading...</div></AppLayout>;
  if (!item) return <AppLayout><div className="text-muted-foreground p-6">Item not found</div></AppLayout>;

  const totalWarehouse = warehouseStock.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
  const totalMachine = machineStock.reduce((s, i) => s + (i.current_stock || 0), 0);
  const totalStock = totalWarehouse + totalMachine;

  // FIFO cost calculations
  const activeBatches = purchaseBatches.filter((b: any) => b.active_item && (b.quantity_remaining || 0) > 0);
  const totalInventoryCost = activeBatches.reduce((sum: number, b: any) => {
    return sum + ((b.quantity_remaining || 0) * (b.landed_unit_cost || 0));
  }, 0);
  const weightedAvgCost = totalStock > 0 ? totalInventoryCost / totalStock : 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
              <p className="text-muted-foreground font-mono text-sm">{item.sku}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                  <Button onClick={() => updateItem.mutate()} disabled={!form.name.trim() || updateItem.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
              )}
            </div>
          )}
        </div>

        {/* Item Info */}
        <Card>
          <CardHeader><CardTitle>Item Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? (
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                ) : (
                  <p className="text-foreground">{item.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <p className="text-foreground font-mono">{item.sku}</p>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                {isEditing ? (
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground">{(item as any).category?.name || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                {isEditing ? (
                  <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground">{(item as any).subcategory?.name || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Badge variant="secondary">{item.type}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              {isEditing ? (
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              ) : (
                <p className="text-foreground">{item.description || "—"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardHeader><CardTitle>Cost Summary (FIFO)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Inventory Cost</p>
                <p className="text-lg font-semibold text-foreground">${totalInventoryCost.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Weighted Avg Cost/Unit</p>
                <p className="text-lg font-semibold text-foreground">${weightedAvgCost.toFixed(3)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Batches</p>
                <p className="text-lg font-semibold text-foreground">{activeBatches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Breakdown */}
        <Card>
          <CardHeader><CardTitle>Stock Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">In Warehouses</p>
                <p className="text-lg font-semibold text-foreground">{totalWarehouse.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deployed</p>
                <p className="text-lg font-semibold text-foreground">{totalMachine.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-foreground">{totalStock.toLocaleString()}</p>
              </div>
            </div>
            {warehouseStock.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">By Warehouse</p>
                <div className="space-y-1">
                  {warehouseStock.map((ws: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-foreground">{ws.warehouse?.name || "Unknown"}</span>
                      <span className="font-medium text-foreground">{(ws.quantity_on_hand || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Batches (FIFO) */}
        <Card>
          <CardHeader><CardTitle>Purchase Batches (FIFO)</CardTitle></CardHeader>
          <CardContent>
            {purchaseBatches.length === 0 ? (
              <p className="text-muted-foreground">No purchase history.</p>
            ) : (
              <div className="space-y-2">
                {purchaseBatches.map((pi: any) => (
                  <div
                    key={pi.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted ${
                      pi.active_item ? "bg-muted/50" : "bg-muted/20 opacity-60"
                    }`}
                    onClick={() => pi.purchase && navigate(`/purchases/${pi.purchase.id}`)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{pi.purchase?.purchase_order_number || "—"}</span>
                        {pi.active_item ? (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Depleted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ordered: {pi.quantity_ordered} | Received: {pi.quantity_received || 0} | Remaining: {pi.quantity_remaining || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">${Number(pi.unit_cost).toFixed(3)}/unit</p>
                      {(pi.landed_unit_cost || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">Landed: ${Number(pi.landed_unit_cost).toFixed(3)}</p>
                      )}
                      {pi.active_item && (pi.quantity_remaining || 0) > 0 && (
                        <p className="text-xs font-medium text-primary">
                          Batch Value: ${((pi.quantity_remaining || 0) * (pi.landed_unit_cost || 0)).toFixed(2)}
                        </p>
                      )}
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
