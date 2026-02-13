import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, CalendarIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePurchases, type PurchaseLineItem, type GlobalFee, type DistributionMethod } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCategories } from "@/hooks/useCategories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatableCombobox } from "@/components/purchases/CreatableCombobox";

interface LineItemFee {
  fee_name: string;
  amount: number;
}

interface LineItem extends PurchaseLineItem {
  item_name: string;
  sku: string;
  fees: LineItemFee[];
  category_id?: string;
  subcategory_id?: string;
  item_detail_id?: string;
}

export default function NewPurchase() {
  const navigate = useNavigate();
  const { createPurchase, warehouses, createWarehouse, isCreating } = usePurchases();
  const {
    categories,
    createCategory,
    createSubcategory,
    getSubcategoriesByCategory,
  } = useCategories();
  const { suppliers } = useSuppliers();

  // Order details state
  const [orderType, setOrderType] = useState<"local" | "import">("local");
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>();
  const [localTaxRate, setLocalTaxRate] = useState(0);
  const [currency, setCurrency] = useState("USD");

  // New warehouse dialog
  const [showNewWarehouse, setShowNewWarehouse] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState("");

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_name: "", sku: "", quantity_ordered: 1, unit_cost: 0, cbm: 0, fees: [] },
  ]);

  // Global fees state
  const [globalFees, setGlobalFees] = useState<GlobalFee[]>([]);

  // Fetch products for linking (with category/subcategory)
  const { data: products = [] } = useQuery({
    queryKey: ["item_details_with_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, category_id, subcategory_id")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Generate SKU
  const generateSku = () => `SKU-${Date.now().toString(36).toUpperCase()}`;

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { item_name: "", sku: generateSku(), quantity_ordered: 1, unit_cost: 0, cbm: 0, fees: [] },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // If linking to an existing product, autopopulate name, category/subcategory and make name readonly
    if (field === "item_detail_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].item_name = product.name;
        updated[index].category_id = product.category_id || undefined;
        updated[index].subcategory_id = product.subcategory_id || undefined;
      }
    }
    
    // If clearing product link, allow name editing again
    if (field === "item_detail_id" && !value) {
      // Keep name but allow editing
    }
    
    // Clear subcategory when category changes
    if (field === "category_id") {
      updated[index].subcategory_id = undefined;
    }
    
    setLineItems(updated);
  };

  // Add fee to line item
  const addLineItemFee = (lineIndex: number) => {
    const updated = [...lineItems];
    updated[lineIndex].fees.push({ fee_name: "", amount: 0 });
    setLineItems(updated);
  };

  // Remove fee from line item
  const removeLineItemFee = (lineIndex: number, feeIndex: number) => {
    const updated = [...lineItems];
    updated[lineIndex].fees = updated[lineIndex].fees.filter((_, i) => i !== feeIndex);
    setLineItems(updated);
  };

  // Update line item fee
  const updateLineItemFee = (lineIndex: number, feeIndex: number, field: keyof LineItemFee, value: any) => {
    const updated = [...lineItems];
    updated[lineIndex].fees[feeIndex] = { ...updated[lineIndex].fees[feeIndex], [field]: value };
    setLineItems(updated);
  };

  // Add global fee
  const addGlobalFee = () => {
    setGlobalFees([...globalFees, { fee_name: "", amount: 0, distribution_method: "by_value" }]);
  };

  // Remove global fee
  const removeGlobalFee = (index: number) => {
    setGlobalFees(globalFees.filter((_, i) => i !== index));
  };

  // Update global fee
  const updateGlobalFee = (index: number, field: keyof GlobalFee, value: any) => {
    const updated = [...globalFees];
    updated[index] = { ...updated[index], [field]: value };
    setGlobalFees(updated);
  };

  // Create new warehouse
  const handleCreateWarehouse = async () => {
    if (newWarehouseName.trim()) {
      const warehouse = await createWarehouse(newWarehouseName.trim());
      setWarehouseId(warehouse.id);
      setNewWarehouseName("");
      setShowNewWarehouse(false);
    }
  };

  // Calculate summary
  const summary = useMemo(() => {
    const itemsSubtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity_ordered * item.unit_cost,
      0
    );

    const itemFeesTotal = lineItems.reduce(
      (sum, item) => sum + item.fees.reduce((feeSum, fee) => feeSum + fee.amount, 0),
      0
    );

    const globalFeesTotal = globalFees.reduce((sum, fee) => sum + fee.amount, 0);

    const subtotalBeforeTax = itemsSubtotal + itemFeesTotal + globalFeesTotal;
    const taxAmount = orderType === "local" ? subtotalBeforeTax * (localTaxRate / 100) : 0;
    const total = subtotalBeforeTax + taxAmount;

    // Calculate per-item landed costs
    const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalCbm = lineItems.reduce((sum, item) => sum + (item.cbm || 0), 0);

    const landedCosts = lineItems.map((item) => {
      const itemValue = item.quantity_ordered * item.unit_cost;
      const itemFees = item.fees.reduce((sum, fee) => sum + fee.amount, 0);

      let distributedFees = 0;
      globalFees.forEach((fee) => {
        switch (fee.distribution_method) {
          case "by_value":
            distributedFees += itemsSubtotal > 0 ? (itemValue / itemsSubtotal) * fee.amount : 0;
            break;
          case "by_quantity":
            distributedFees += totalQuantity > 0 ? (item.quantity_ordered / totalQuantity) * fee.amount : 0;
            break;
          case "by_cbm":
            distributedFees += totalCbm > 0 ? ((item.cbm || 0) / totalCbm) * fee.amount : 0;
            break;
        }
      });

      const itemTax = orderType === "local" ? (itemValue + itemFees + distributedFees) * (localTaxRate / 100) : 0;
      const landedCost = itemValue + itemFees + distributedFees + itemTax;
      const perUnitLandedCost = item.quantity_ordered > 0 ? landedCost / item.quantity_ordered : 0;

      return {
        item_name: item.item_name,
        total_landed: landedCost,
        per_unit_landed: perUnitLandedCost,
      };
    });

    return {
      itemsSubtotal,
      itemFeesTotal,
      globalFeesTotal,
      taxAmount,
      total,
      landedCosts,
    };
  }, [lineItems, globalFees, localTaxRate, orderType]);

  // Submit form
  const handleSubmit = () => {
    if (!supplierId) {
      return;
    }

    createPurchase(
      {
        type: orderType,
        supplier_id: supplierId,
        expected_arrival_date: purchaseDate?.toISOString(),
        local_tax_rate: orderType === "local" ? localTaxRate : 0,
        currency,
        line_items: lineItems.map((item) => ({
          item_name: item.item_name,
          sku: item.sku || generateSku(),
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
          cbm: item.cbm,
          item_detail_id: item.item_detail_id,
          category_id: item.category_id,
          subcategory_id: item.subcategory_id,
          fees: item.fees,
        } as any)),
        global_fees: globalFees,
        total_amount: summary.total,
      },
      {
        onSuccess: () => {
          navigate("/purchases");
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">New Purchase Order</h1>
            <p className="text-muted-foreground">Create a new purchase order for inventory</p>
          </div>
        </div>

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Order Type</Label>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm", orderType === "local" ? "text-foreground font-medium" : "text-muted-foreground")}>
                  Local
                </span>
                <Switch
                  checked={orderType === "import"}
                  onCheckedChange={(checked) => setOrderType(checked ? "import" : "local")}
                />
                <span className={cn("text-sm", orderType === "import" ? "text-foreground font-medium" : "text-muted-foreground")}>
                  Import
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Warehouse Destination</Label>
                <div className="flex gap-2">
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewWarehouse(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !purchaseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {purchaseDate ? format(purchaseDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={purchaseDate}
                      onSelect={setPurchaseDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {orderType === "local" && (
              <div className="space-y-2 max-w-xs">
                <Label>Local Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={localTaxRate}
                  onChange={(e) => setLocalTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {lineItems.map((item, index) => (
              <div key={index} className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm">Item {index + 1}</h4>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => updateLineItem(index, "item_name", e.target.value)}
                      placeholder="Enter item name"
                      disabled={!!item.item_detail_id}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Link to Product</Label>
                    <div className="flex gap-2">
                      <Select
                        value={item.item_detail_id || ""}
                        onValueChange={(value) => updateLineItem(index, "item_detail_id", value || undefined)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.item_detail_id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive"
                          onClick={() => updateLineItem(index, "item_detail_id", undefined)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <CreatableCombobox
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={item.category_id}
                      onChange={(value) => updateLineItem(index, "category_id", value)}
                      onCreateNew={async (name) => {
                        const created = await createCategory(name);
                        return created ? { id: created.id, name: created.name } : undefined;
                      }}
                      placeholder="Select category"
                      searchPlaceholder="Search or create..."
                      emptyText="No categories found"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <CreatableCombobox
                      options={getSubcategoriesByCategory(item.category_id).map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                      value={item.subcategory_id}
                      onChange={(value) => updateLineItem(index, "subcategory_id", value)}
                      onCreateNew={
                        item.category_id
                          ? async (name) => {
                              const created = await createSubcategory({
                                name,
                                categoryId: item.category_id!,
                              });
                              return created ? { id: created.id, name: created.name } : undefined;
                            }
                          : undefined
                      }
                      placeholder={item.category_id ? "Select subcategory" : "Select category first"}
                      searchPlaceholder="Search or create..."
                      emptyText="No subcategories"
                      disabled={!item.category_id}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={item.sku}
                      placeholder="Auto-generated"
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity_ordered}
                      onChange={(e) => updateLineItem(index, "quantity_ordered", parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Cost *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_cost}
                      onChange={(e) => updateLineItem(index, "unit_cost", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CBM (Cubic Meters)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.001}
                      value={item.cbm}
                      onChange={(e) => updateLineItem(index, "cbm", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Item-Specific Fees */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Item-Specific Fees</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addLineItemFee(index)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Fee
                    </Button>
                  </div>
                  {item.fees.map((fee, feeIndex) => (
                    <div key={feeIndex} className="flex gap-2 items-center">
                      <Input
                        placeholder="Fee name"
                        value={fee.fee_name}
                        onChange={(e) => updateLineItemFee(index, feeIndex, "fee_name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={fee.amount}
                        onChange={(e) => updateLineItemFee(index, feeIndex, "amount", parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeLineItemFee(index, feeIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Global Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Global Fees</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addGlobalFee}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {globalFees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No global fees added. Click "Add Fee" to add shipping, customs, or other fees.
              </p>
            ) : (
              globalFees.map((fee, index) => (
                <div key={index} className="flex gap-4 items-center">
                  <Input
                    placeholder="Fee name"
                    value={fee.fee_name}
                    onChange={(e) => updateGlobalFee(index, "fee_name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={fee.amount}
                    onChange={(e) => updateGlobalFee(index, "amount", parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Select
                    value={fee.distribution_method}
                    onValueChange={(value) => updateGlobalFee(index, "distribution_method", value as DistributionMethod)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="by_value">By Value</SelectItem>
                      <SelectItem value="by_quantity">By Quantity</SelectItem>
                      <SelectItem value="by_cbm">By CBM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeGlobalFee(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items Subtotal</span>
                <span>${summary.itemsSubtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item Fees</span>
                <span>${summary.itemFeesTotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Global Fees</span>
                <span>${summary.globalFeesTotal.toFixed(2)} {currency}</span>
              </div>
              {orderType === "local" && localTaxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({localTaxRate}%)</span>
                  <span>${summary.taxAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${summary.total.toFixed(2)} {currency}</span>
              </div>
            </div>

            {summary.landedCosts.length > 0 && summary.landedCosts.some((lc) => lc.item_name) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Per-Item Landed Costs</h4>
                  <div className="space-y-1">
                    {summary.landedCosts.map((lc, index) => (
                      lc.item_name && (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{lc.item_name}</span>
                          <span>
                            ${lc.per_unit_landed.toFixed(3)} {currency}/unit
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate("/purchases")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!supplierId || isCreating}>
            {isCreating ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </div>

      {/* New Warehouse Dialog */}
      <Dialog open={showNewWarehouse} onOpenChange={setShowNewWarehouse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Warehouse Name</Label>
              <Input
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                placeholder="Enter warehouse name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewWarehouse(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWarehouse} disabled={!newWarehouseName.trim()}>
              Add Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
