import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CreatableCombobox } from "@/components/purchases/CreatableCombobox";
import { useCategories } from "@/hooks/useCategories";
import { useItemTypes } from "@/hooks/useItemTypes";
import { useAssemblies, type AssemblyComponent } from "@/hooks/useAssemblies";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmt2, fmt3 } from "@/lib/formatters";

interface ComponentLine {
  item_detail_id: string;
  item_name: string;
  quantity_per_unit: number;
  unit_cost: number;
  available_qty: number;
}

export default function NewAssembly() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { categories, createCategory, createSubcategory, getSubcategoriesByCategory } = useCategories();
  const { itemTypes, createItemType } = useItemTypes();
  const { createAssembly, isCreating } = useAssemblies();
  const { warehouses } = useWarehouseInventory();

  // Output item state — non-admins forced to "Link Existing"
  const [isNewItem, setIsNewItem] = useState(isAdmin);
  const [outputItemDetailId, setOutputItemDetailId] = useState<string>();
  const [outputItemName, setOutputItemName] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  const [subcategoryId, setSubcategoryId] = useState<string>();
  const [itemTypeId, setItemTypeId] = useState<string>();
  const [outputQuantity, setOutputQuantity] = useState(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");

  // Labor
  const [laborMode, setLaborMode] = useState<"per_unit" | "batch">("per_unit");
  const [laborPerUnit, setLaborPerUnit] = useState(0);
  const [laborBatchTotal, setLaborBatchTotal] = useState(0);

  // Components
  const [components, setComponents] = useState<ComponentLine[]>([]);
  const [componentCategoryFilter, setComponentCategoryFilter] = useState("all");

  // Fetch products for linking
  const { data: products = [] } = useQuery({
    queryKey: ["item_details_with_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, category_id, subcategory_id, cost_price")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch inventory for component availability
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-for-assembly", warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("item_detail_id, quantity_on_hand, item_detail:item_details(id, name, sku, cost_price, category_id, item_type_id)")
        .not("warehouse_id", "is", null);
      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  const componentTypeIds = useMemo(() => {
    return new Set(itemTypes.filter(t => t.is_component).map(t => t.id));
  }, [itemTypes]);

  const availableComponents = useMemo(() => {
    const selectedIds = new Set(components.map((c) => c.item_detail_id));
    return inventoryItems
      .filter((inv: any) => {
        if (!inv.item_detail || selectedIds.has(inv.item_detail_id)) return false;
        const detail = inv.item_detail as any;
        // Only show items whose item_type has is_component = true
        if (componentTypeIds.size > 0 && detail?.item_type_id && !componentTypeIds.has(detail.item_type_id)) return false;
        if (componentCategoryFilter !== "all" && detail?.category_id !== componentCategoryFilter) return false;
        return true;
      })
      .map((inv: any) => ({
        id: inv.item_detail_id,
        name: (inv.item_detail as any)?.name || "Unknown",
        sku: (inv.item_detail as any)?.sku || "",
        cost_price: (inv.item_detail as any)?.cost_price || 0,
        available_qty: inv.quantity_on_hand || 0,
      }));
  }, [inventoryItems, components, componentCategoryFilter, componentTypeIds]);

  const addComponent = (itemId: string) => {
    const inv = inventoryItems.find((i: any) => i.item_detail_id === itemId) as any;
    if (!inv) return;
    const detail = inv.item_detail as any;
    setComponents([
      ...components,
      {
        item_detail_id: itemId,
        item_name: detail?.name || "Unknown",
        quantity_per_unit: 1,
        unit_cost: detail?.cost_price || 0,
        available_qty: inv.quantity_on_hand || 0,
      },
    ]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ComponentLine, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  // Calculations
  const effectiveLaborPerUnit = laborMode === "per_unit" ? laborPerUnit : (outputQuantity > 0 ? laborBatchTotal / outputQuantity : 0);

  const summary = useMemo(() => {
    const componentCost = components.reduce(
      (sum, c) => sum + c.quantity_per_unit * outputQuantity * c.unit_cost,
      0
    );
    const totalLabor = effectiveLaborPerUnit * outputQuantity;
    const totalCost = componentCost + totalLabor;
    const unitCost = outputQuantity > 0 ? totalCost / outputQuantity : 0;
    return { componentCost, totalLabor, totalCost, unitCost };
  }, [components, outputQuantity, effectiveLaborPerUnit]);

  const handleSubmit = async () => {
    if (!warehouseId) return;
    if (isNewItem && !outputItemName.trim()) return;
    if (!isNewItem && !outputItemDetailId) return;
    if (components.length === 0) return;

    await createAssembly({
      item_detail_id: isNewItem ? undefined : outputItemDetailId,
      item_name: isNewItem ? outputItemName : undefined,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      item_type_id: itemTypeId,
      output_quantity: outputQuantity,
      labor_cost_per_unit: effectiveLaborPerUnit,
      warehouse_id: warehouseId,
      notes: notes || undefined,
      components: components.map((c) => ({
        item_detail_id: c.item_detail_id,
        quantity_per_unit: c.quantity_per_unit,
        unit_cost: c.unit_cost,
      })),
    });
    navigate("/warehouse");
  };

  const userWarehouses = warehouses.filter((w) => !w.is_system);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/warehouse")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">New Assembly</h1>
            <p className="text-muted-foreground">Assemble components into a new product</p>
          </div>
        </div>

        {/* Section 1: Assembly Header */}
        <Card>
          <CardHeader><CardTitle>Output Product</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn("text-sm", isNewItem ? "text-foreground font-medium" : "text-muted-foreground")}>New Item</span>
              <Switch checked={!isNewItem} onCheckedChange={(checked) => setIsNewItem(!checked)} />
              <span className={cn("text-sm", !isNewItem ? "text-foreground font-medium" : "text-muted-foreground")}>Link Existing</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {isNewItem ? (
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input value={outputItemName} onChange={(e) => setOutputItemName(e.target.value)} placeholder="e.g., Complete Toy Capsule" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Link to Existing Product *</Label>
                  <Select value={outputItemDetailId || ""} onValueChange={setOutputItemDetailId}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Output Quantity *</Label>
                <Input type="number" min={1} value={outputQuantity} onChange={(e) => setOutputQuantity(parseInt(e.target.value) || 1)} />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <CreatableCombobox
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onChange={setCategoryId}
                  onCreateNew={async (name) => {
                    const created = await createCategory(name);
                    return created ? { id: created.id, name: created.name } : undefined;
                  }}
                  placeholder="Select category"
                  searchPlaceholder="Search or create..."
                />
              </div>

              <div className="space-y-2">
                <Label>Subcategory</Label>
                <CreatableCombobox
                  options={getSubcategoriesByCategory(categoryId).map((s) => ({ value: s.id, label: s.name }))}
                  value={subcategoryId}
                  onChange={setSubcategoryId}
                  onCreateNew={categoryId ? async (name) => {
                    const created = await createSubcategory({ name, categoryId: categoryId! });
                    return created ? { id: created.id, name: created.name } : undefined;
                  } : undefined}
                  placeholder={categoryId ? "Select subcategory" : "Select category first"}
                  disabled={!categoryId}
                />
              </div>

              <div className="space-y-2">
                <Label>Item Type</Label>
                <CreatableCombobox
                  options={itemTypes.map((t) => ({ value: t.id, label: t.name }))}
                  value={itemTypeId}
                  onChange={setItemTypeId}
                  onCreateNew={async (name) => {
                    const created = await createItemType({ name });
                    return created ? { id: created.id, name: created.name } : undefined;
                  }}
                  placeholder="Select item type"
                  searchPlaceholder="Search or create..."
                />
              </div>

              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {userWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional assembly notes..." />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Components */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add component */}
            <div className="space-y-3">
              <Label>Add Component from Inventory</Label>
              <Select value={componentCategoryFilter} onValueChange={setComponentCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(val) => addComponent(val)}>
                <SelectTrigger><SelectValue placeholder="Search and select component..." /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableComponents.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.sku}) — {item.available_qty} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No components added yet.</p>
            ) : (
              <div className="space-y-3">
                {components.map((comp, index) => {
                  const totalNeeded = comp.quantity_per_unit * outputQuantity;
                  const insufficient = totalNeeded > comp.available_qty;
                  return (
                    <div key={comp.item_detail_id} className="p-4 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">{comp.item_name}</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeComponent(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Qty per Unit</Label>
                          <Input type="number" min={1} value={comp.quantity_per_unit} onChange={(e) => updateComponent(index, "quantity_per_unit", parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit Cost</Label>
                          <Input type="number" min={0} step={0.01} value={comp.unit_cost} onChange={(e) => updateComponent(index, "unit_cost", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total Needed</Label>
                          <p className={cn("text-sm font-medium pt-2", insufficient ? "text-destructive" : "text-foreground")}>
                            {totalNeeded} {insufficient && `(only ${comp.available_qty} available)`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subtotal</Label>
                          <p className="text-sm font-medium pt-2 text-foreground">${fmt2(totalNeeded * comp.unit_cost)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Labor */}
        <Card>
          <CardHeader><CardTitle>Labor & Overhead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn("text-sm", laborMode === "per_unit" ? "text-foreground font-medium" : "text-muted-foreground")}>Per Unit</span>
              <Switch checked={laborMode === "batch"} onCheckedChange={(checked) => setLaborMode(checked ? "batch" : "per_unit")} />
              <span className={cn("text-sm", laborMode === "batch" ? "text-foreground font-medium" : "text-muted-foreground")}>Batch Total</span>
            </div>

            {laborMode === "per_unit" ? (
              <div className="space-y-2 max-w-xs">
                <Label>Labor Cost per Unit</Label>
                <Input type="number" min={0} step={0.01} value={laborPerUnit} onChange={(e) => setLaborPerUnit(parseFloat(e.target.value) || 0)} />
              </div>
            ) : (
              <div className="space-y-2 max-w-xs">
                <Label>Total Labor Cost (Batch)</Label>
                <Input type="number" min={0} step={0.01} value={laborBatchTotal} onChange={(e) => setLaborBatchTotal(parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">= ${fmt3(effectiveLaborPerUnit)} per unit</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Assembly Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Component Cost</span>
              <span className="text-foreground">${fmt2(summary.componentCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Labor</span>
              <span className="text-foreground">${fmt2(summary.totalLabor)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span className="text-foreground">Total Cost</span>
              <span className="text-foreground">${fmt2(summary.totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Final Unit Cost</span>
              <span className="text-foreground font-semibold">${fmt3(summary.unitCost)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/warehouse")}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || components.length === 0 || !warehouseId || (isNewItem ? !outputItemName.trim() : !outputItemDetailId)}
          >
            {isCreating ? "Assembling..." : "Complete Assembly"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
