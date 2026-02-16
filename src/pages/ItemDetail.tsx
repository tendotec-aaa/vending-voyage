import { fmt2, fmt3 } from "@/lib/formatters";
import { useState, useEffect, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X, Camera, Upload, Trash2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const totalWarehouse = warehouseStock.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
  const totalMachine = machineStock.reduce((s, i) => s + (i.current_stock || 0), 0);
  const totalStock = totalWarehouse + totalMachine;

  const activeBatches = purchaseBatches.filter((b: any) => b.active_item && (b.quantity_remaining || 0) > 0);
  const totalInventoryCost = activeBatches.reduce((sum: number, b: any) => {
    return sum + (b.quantity_remaining || 0) * (b.final_unit_cost || 0);
  }, 0);
  const weightedAvgCost = totalStock > 0 ? totalInventoryCost / totalStock : 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl p-4 md:p-6">
        {/* Header */}
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
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={() => updateItem.mutate()} disabled={!form.name.trim() || updateItem.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Photo + Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo Card */}
          <Card className="md:col-span-1">
            <CardContent className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {item.photo_url ? (
                <div className="relative group">
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {isAdmin && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Camera className="h-4 w-4 mr-1" /> Change
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleRemovePhoto}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 bg-muted/30 ${isAdmin ? "cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors" : ""}`}
                  onClick={() => isAdmin && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground text-center px-4">
                        {isAdmin ? "Click to upload a photo" : "No photo available"}
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Select
                      value={form.category_id}
                      onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
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
                        {subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
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
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                ) : (
                  <p className="text-foreground">{item.description || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost & Stock cards side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost Summary */}
          <Card>
            <CardHeader><CardTitle>Cost Summary (FIFO)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Inventory Cost</p>
                  <p className="text-xl font-semibold text-foreground">${fmt2(totalInventoryCost)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Weighted Avg Cost/Unit</p>
                  <p className="text-xl font-semibold text-foreground">${fmt3(weightedAvgCost)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Batches</p>
                  <p className="text-xl font-semibold text-foreground">{activeBatches.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Breakdown */}
          <Card>
            <CardHeader><CardTitle>Stock Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">In Warehouses</span>
                  <span className="font-semibold text-foreground">{totalWarehouse.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deployed</span>
                  <span className="font-semibold text-foreground">{totalMachine.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">{totalStock.toLocaleString()}</span>
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
        </div>

        {/* Purchase Batches */}
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
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted ${
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
                    <div className="text-right mt-2 sm:mt-0">
                      <p className="text-sm text-foreground">${fmt3(Number(pi.final_unit_cost))}/unit</p>
                      {pi.active_item && (pi.quantity_remaining || 0) > 0 && (
                        <p className="text-xs font-medium text-primary">
                          Batch Value: ${fmt2((pi.quantity_remaining || 0) * (pi.final_unit_cost || 0))}
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
