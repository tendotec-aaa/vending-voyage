import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PurchaseStatus = Database["public"]["Enums"]["purchase_status"];

interface LocalGlobalFee {
  id?: string;
  fee_name: string;
  amount: number;
  distribution_method: string;
  _isNew?: boolean;
  _isDeleted?: boolean;
}

interface LocalLineFee {
  id?: string;
  purchase_line_id: string;
  fee_name: string;
  amount: number;
  _isNew?: boolean;
  _isDeleted?: boolean;
}

const statusFlow: PurchaseStatus[] = ["draft", "pending", "in_transit", "arrived"];
const statusColors: Record<PurchaseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-600",
  in_transit: "bg-blue-500/20 text-blue-600",
  arrived: "bg-orange-500/20 text-orange-600",
  received: "bg-green-500/20 text-green-600",
  cancelled: "bg-destructive/20 text-destructive",
};

const fmt2 = (n: number) => n.toFixed(2);
const fmt3 = (n: number) => n.toFixed(3);

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local fee editing state
  const [localGlobalFees, setLocalGlobalFees] = useState<LocalGlobalFee[]>([]);
  const [localLineFees, setLocalLineFees] = useState<LocalLineFee[]>([]);
  const [feesInitialized, setFeesInitialized] = useState(false);
  const [hasFeeChanges, setHasFeeChanges] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchase-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          *,
          supplier:suppliers(id, name),
          purchase_items(
            id, quantity_ordered, unit_cost, cbm, quantity_received, quantity_remaining,
            landed_unit_cost, final_unit_cost, line_fees_total, global_fees_allocated, tax_allocated,
            item_detail_id,
            item_detail:item_details(id, name, sku)
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: globalFees = [] } = useQuery({
    queryKey: ["purchase-global-fees", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_global_fees")
        .select("*")
        .eq("purchase_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: lineFees = [] } = useQuery({
    queryKey: ["purchase-line-fees", id],
    queryFn: async () => {
      const itemIds = purchase?.purchase_items?.map((i: any) => i.id) || [];
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from("purchase_line_fees")
        .select("*")
        .in("purchase_line_id", itemIds);
      if (error) throw error;
      return data;
    },
    enabled: !!purchase?.purchase_items,
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (globalFees.length > 0 || lineFees.length > 0 || (purchase && !feesInitialized)) {
      setLocalGlobalFees(globalFees.map((f) => ({
        id: f.id,
        fee_name: f.fee_name,
        amount: f.amount,
        distribution_method: f.distribution_method,
      })));
      setLocalLineFees(lineFees.map((f) => ({
        id: f.id,
        purchase_line_id: f.purchase_line_id,
        fee_name: f.fee_name,
        amount: f.amount,
      })));
      setFeesInitialized(true);
      setHasFeeChanges(false);
    }
  }, [globalFees, lineFees, purchase, feesInitialized]);

  // Local fee editing helpers
  const addLocalGlobalFee = () => {
    setLocalGlobalFees([...localGlobalFees, {
      fee_name: "",
      amount: 0,
      distribution_method: "by_value",
      _isNew: true,
    }]);
    setHasFeeChanges(true);
  };

  const updateLocalGlobalFee = (index: number, field: string, value: any) => {
    const updated = [...localGlobalFees];
    updated[index] = { ...updated[index], [field]: value };
    setLocalGlobalFees(updated);
    setHasFeeChanges(true);
  };

  const deleteLocalGlobalFee = (index: number) => {
    const fee = localGlobalFees[index];
    if (fee._isNew) {
      setLocalGlobalFees(localGlobalFees.filter((_, i) => i !== index));
    } else {
      const updated = [...localGlobalFees];
      updated[index] = { ...updated[index], _isDeleted: true };
      setLocalGlobalFees(updated);
    }
    setHasFeeChanges(true);
  };

  const addLocalLineFee = (purchaseLineId: string) => {
    setLocalLineFees([...localLineFees, {
      purchase_line_id: purchaseLineId,
      fee_name: "",
      amount: 0,
      _isNew: true,
    }]);
    setHasFeeChanges(true);
  };

  const updateLocalLineFee = (index: number, field: string, value: any) => {
    const updated = [...localLineFees];
    updated[index] = { ...updated[index], [field]: value };
    setLocalLineFees(updated);
    setHasFeeChanges(true);
  };

  const deleteLocalLineFee = (index: number) => {
    const fee = localLineFees[index];
    if (fee._isNew) {
      setLocalLineFees(localLineFees.filter((_, i) => i !== index));
    } else {
      const updated = [...localLineFees];
      updated[index] = { ...updated[index], _isDeleted: true };
      setLocalLineFees(updated);
    }
    setHasFeeChanges(true);
  };

  // Batch save all fee changes + recalculate
  const applyFeesMutation = useMutation({
    mutationFn: async () => {
      // 1. Delete removed global fees
      const deletedGlobal = localGlobalFees.filter((f) => f._isDeleted && f.id);
      for (const fee of deletedGlobal) {
        await supabase.from("purchase_global_fees").delete().eq("id", fee.id!);
      }

      // 2. Delete removed line fees
      const deletedLine = localLineFees.filter((f) => f._isDeleted && f.id);
      for (const fee of deletedLine) {
        await supabase.from("purchase_line_fees").delete().eq("id", fee.id!);
      }

      // 3. Insert new global fees
      const newGlobal = localGlobalFees.filter((f) => f._isNew && !f._isDeleted);
      if (newGlobal.length > 0) {
        const { error } = await supabase.from("purchase_global_fees").insert(
          newGlobal.map((f) => ({
            purchase_id: id!,
            fee_name: f.fee_name || "Unnamed Fee",
            amount: f.amount,
            distribution_method: f.distribution_method,
          }))
        );
        if (error) throw error;
      }

      // 4. Insert new line fees
      const newLine = localLineFees.filter((f) => f._isNew && !f._isDeleted);
      if (newLine.length > 0) {
        const { error } = await supabase.from("purchase_line_fees").insert(
          newLine.map((f) => ({
            purchase_line_id: f.purchase_line_id,
            fee_name: f.fee_name || "Unnamed Fee",
            amount: f.amount,
          }))
        );
        if (error) throw error;
      }

      // 5. Update existing global fees
      const existingGlobal = localGlobalFees.filter((f) => !f._isNew && !f._isDeleted && f.id);
      for (const fee of existingGlobal) {
        await supabase.from("purchase_global_fees").update({
          fee_name: fee.fee_name,
          amount: fee.amount,
          distribution_method: fee.distribution_method,
        }).eq("id", fee.id!);
      }

      // 6. Update existing line fees
      const existingLine = localLineFees.filter((f) => !f._isNew && !f._isDeleted && f.id);
      for (const fee of existingLine) {
        await supabase.from("purchase_line_fees").update({
          fee_name: fee.fee_name,
          amount: fee.amount,
        }).eq("id", fee.id!);
      }

      // 7. Recalculate landed costs
      // Re-fetch the saved fees for accurate calculation
      const { data: savedGlobalFees } = await supabase
        .from("purchase_global_fees")
        .select("*")
        .eq("purchase_id", id!);

      const items = (purchase?.purchase_items || []) as any[];
      const itemIds = items.map((i: any) => i.id);
      const { data: savedLineFees } = await supabase
        .from("purchase_line_fees")
        .select("*")
        .in("purchase_line_id", itemIds.length > 0 ? itemIds : ["__none__"]);

      const currentGlobalFees = savedGlobalFees || [];
      const currentLineFees = savedLineFees || [];

      const itemsSubtotal = items.reduce((sum: number, i: any) => sum + i.quantity_ordered * i.unit_cost, 0);
      const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity_ordered, 0);
      const totalCbm = items.reduce((sum: number, i: any) => sum + (i.cbm || 0), 0);

      for (const item of items) {
        const itemLineFees = currentLineFees.filter((f) => f.purchase_line_id === item.id);
        const lineFeesTotal = itemLineFees.reduce((sum, f) => sum + (f.amount || 0), 0);

        const itemValue = item.quantity_ordered * item.unit_cost;
        let distributedGlobalFees = 0;
        for (const gf of currentGlobalFees) {
          switch (gf.distribution_method) {
            case "by_value":
              distributedGlobalFees += itemsSubtotal > 0 ? (itemValue / itemsSubtotal) * gf.amount : 0;
              break;
            case "by_quantity":
              distributedGlobalFees += totalQuantity > 0 ? (item.quantity_ordered / totalQuantity) * gf.amount : 0;
              break;
            case "by_cbm":
              distributedGlobalFees += totalCbm > 0 ? ((item.cbm || 0) / totalCbm) * gf.amount : 0;
              break;
          }
        }

        const taxRate = purchase?.type === "local" && purchase?.local_tax_rate ? purchase.local_tax_rate / 100 : 0;
        const taxAllocated = (itemValue + lineFeesTotal + distributedGlobalFees) * taxRate;
        const totalItemCost = itemValue + lineFeesTotal + distributedGlobalFees + taxAllocated;
        const landedUnitCost = item.quantity_ordered > 0 ? totalItemCost / item.quantity_ordered : 0;
        const finalUnitCost = landedUnitCost;

        await supabase
          .from("purchase_items")
          .update({
            line_fees_total: Math.round(lineFeesTotal * 1000) / 1000,
            global_fees_allocated: Math.round(distributedGlobalFees * 1000) / 1000,
            tax_allocated: Math.round(taxAllocated * 1000) / 1000,
            landed_unit_cost: Math.round(landedUnitCost * 1000) / 1000,
            final_unit_cost: Math.round(finalUnitCost * 1000) / 1000,
          } as any)
          .eq("id", item.id);
      }

      const allLineFeesTotal = currentLineFees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const globalFeesTotal = currentGlobalFees.reduce((sum, f) => sum + (f.amount || 0), 0);
      const subtotalBeforeTax = itemsSubtotal + allLineFeesTotal + globalFeesTotal;
      const taxAmount = purchase?.type === "local" && purchase?.local_tax_rate ? subtotalBeforeTax * (purchase.local_tax_rate / 100) : 0;
      const total = subtotalBeforeTax + taxAmount;

      await supabase
        .from("purchases")
        .update({ total_amount: Math.round(total * 100) / 100 })
        .eq("id", id!);
    },
    onSuccess: () => {
      setFeesInitialized(false);
      setHasFeeChanges(false);
      queryClient.invalidateQueries({ queryKey: ["purchase-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-global-fees", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-line-fees", id] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: "Fees applied", description: "All fee changes have been saved and costs recalculated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to apply fees: ${error.message}`, variant: "destructive" });
    },
  });

  // Arrived date dialog state
  const [showArrivedDialog, setShowArrivedDialog] = useState(false);
  const [arrivedDate, setArrivedDate] = useState<Date>(new Date());

  const updateStatus = useMutation({
    mutationFn: async ({ status, arrivedAt }: { status: PurchaseStatus; arrivedAt?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "arrived" && arrivedAt) {
        updateData.received_at = arrivedAt;
      }
      const { error } = await supabase.from("purchases").update(updateData).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: "Status updated" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!purchase) return <AppLayout><div className="text-muted-foreground">Purchase not found</div></AppLayout>;

  const isEditable = purchase.status !== "received" && purchase.status !== "cancelled";
  const isFeesEditable = isEditable;
  const currentStatusIndex = statusFlow.indexOf(purchase.status as PurchaseStatus);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < statusFlow.length - 1 ? statusFlow[currentStatusIndex + 1] : null;
  const supplier = purchase.supplier as any;
  const items = (purchase.purchase_items || []) as any[];
  const showLandedCost = purchase.status === "arrived" || purchase.status === "received";

  // Use local fees for display calculations
  const activeLocalLineFees = localLineFees.filter((f) => !f._isDeleted);
  const activeLocalGlobalFees = localGlobalFees.filter((f) => !f._isDeleted);

  const itemsSubtotal = items.reduce((sum: number, i: any) => sum + i.quantity_ordered * i.unit_cost, 0);
  const lineFeesTotal = activeLocalLineFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const globalFeesTotal = activeLocalGlobalFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const subtotalBeforeTax = itemsSubtotal + lineFeesTotal + globalFeesTotal;
  const taxAmount = purchase.type === "local" && purchase.local_tax_rate ? subtotalBeforeTax * (purchase.local_tax_rate / 100) : 0;
  const total = subtotalBeforeTax + taxAmount;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/purchases")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{purchase.purchase_order_number}</h1>
              <p className="text-muted-foreground">{supplier?.name || "No supplier"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[purchase.status as PurchaseStatus] || ""}>
              {(purchase.status || "draft").replace("_", " ").toUpperCase()}
            </Badge>
            {isEditable && nextStatus && (
              <Button onClick={() => {
                if (nextStatus === "arrived") {
                  setArrivedDate(new Date());
                  setShowArrivedDialog(true);
                } else {
                  updateStatus.mutate({ status: nextStatus });
                }
              }} disabled={updateStatus.isPending}>
                Mark as {nextStatus.replace("_", " ")}
              </Button>
            )}
            {isEditable && purchase.status !== "cancelled" && (
              <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate({ status: "cancelled" })}>
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        {/* Order Info */}
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Type</p><p className="text-foreground capitalize">{purchase.type}</p></div>
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Currency</p><p className="text-foreground">{purchase.currency}</p></div>
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Expected Arrival</p><p className="text-foreground">{purchase.expected_arrival_date ? new Date(purchase.expected_arrival_date).toLocaleDateString() : "—"}</p></div>
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Tax Rate</p><p className="text-foreground">{purchase.local_tax_rate || 0}%</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader><CardTitle>Line Items ({items.length})</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground">No items in this order.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item: any) => {
                  const itemLineFees = activeLocalLineFees.filter((f) => f.purchase_line_id === item.id);
                  const itemLineFeesTotal = itemLineFees.reduce((sum, f) => sum + (f.amount || 0), 0);
                  const itemTotal = item.quantity_ordered * item.unit_cost;
                  const globalAllocated = item.global_fees_allocated || 0;
                  const numLineFees = itemLineFees.length;
                  const numGlobalFees = activeLocalGlobalFees.length;
                  const feePerUnitLine = item.quantity_ordered > 0 ? itemLineFeesTotal / item.quantity_ordered : 0;
                  const feePerUnitGlobal = item.quantity_ordered > 0 ? globalAllocated / item.quantity_ordered : 0;

                  return (
                    <div key={item.id} className="p-4 border border-border rounded-lg space-y-2">
                      {/* Item header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{item.item_detail?.name || "Unnamed Item"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.item_detail?.sku || "No SKU"}</p>
                        </div>
                        <Badge variant="outline">
                          {item.quantity_received || 0}/{item.quantity_ordered} received
                        </Badge>
                      </div>

                      {/* Cost breakdown rows */}
                      <div className="bg-muted/30 rounded-md p-3 space-y-1.5 text-sm">
                        {/* Row 1: Base cost */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                          <span><span className="text-muted-foreground">Qty:</span> {item.quantity_ordered.toLocaleString()}</span>
                          <span><span className="text-muted-foreground">Unit Cost:</span> ${fmt3(item.unit_cost)}</span>
                          <span><span className="text-muted-foreground">CBM:</span> {item.cbm || 0}</span>
                          <span className="ml-auto font-medium"><span className="text-muted-foreground">Subtotal:</span> ${fmt2(itemTotal)}</span>
                        </div>

                        {/* Row 2: Line fees summary */}
                        {(numLineFees > 0 || showLandedCost) && (
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                            <span><span className="text-muted-foreground">Line Fees:</span> {numLineFees}</span>
                            <span><span className="text-muted-foreground">Fee/Unit:</span> ${fmt3(feePerUnitLine)}</span>
                            <span className="ml-auto font-medium"><span className="text-muted-foreground">Total Line Fees:</span> ${fmt2(itemLineFeesTotal)}</span>
                          </div>
                        )}

                        {/* Row 3: Global fees allocated summary */}
                        {showLandedCost && (
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                            <span><span className="text-muted-foreground">Global Fees:</span> {numGlobalFees}</span>
                            <span><span className="text-muted-foreground">Fee/Unit:</span> ${fmt3(feePerUnitGlobal)}</span>
                            <span className="ml-auto font-medium"><span className="text-muted-foreground">Total Global Fees:</span> ${fmt2(globalAllocated)}</span>
                          </div>
                        )}

                        {/* Row 4: Tax if applicable */}
                        {showLandedCost && (item.tax_allocated || 0) > 0 && (
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                            <span><span className="text-muted-foreground">Tax Allocated:</span> ${fmt2(item.tax_allocated || 0)}</span>
                          </div>
                        )}

                        {/* Row 5: Landed unit cost */}
                        {showLandedCost && (
                          <>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-semibold text-foreground">
                              <span>Final Unit Cost</span>
                              <span>${fmt3(item.final_unit_cost || item.landed_unit_cost || 0)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Line item fees detail */}
                      {itemLineFees.length > 0 && (
                        <div className="pl-4 border-l-2 border-border space-y-1">
                          {itemLineFees.map((fee, feeIdx) => {
                            const globalIdx = localLineFees.indexOf(fee);
                            return (
                              <div key={fee.id || `new-${feeIdx}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                                {isFeesEditable ? (
                                  <>
                                    <Input
                                      value={fee.fee_name}
                                      onChange={(e) => updateLocalLineFee(globalIdx, "fee_name", e.target.value)}
                                      className="h-7 text-xs flex-1"
                                      placeholder="Fee name"
                                    />
                                    <Input
                                      type="number"
                                      value={fee.amount}
                                      onChange={(e) => updateLocalLineFee(globalIdx, "amount", parseFloat(e.target.value) || 0)}
                                      className="h-7 text-xs w-24"
                                      placeholder="Amount"
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLocalLineFee(globalIdx)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span>{fee.fee_name}</span>
                                    <span className="ml-auto">${fmt2(fee.amount)}</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isFeesEditable && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => addLocalLineFee(item.id)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Line Fee
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Fees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Global Fees</CardTitle>
            {isFeesEditable && (
              <Button variant="outline" size="sm" onClick={addLocalGlobalFee}>
                <Plus className="mr-2 h-4 w-4" /> Add Fee
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {activeLocalGlobalFees.length === 0 ? (
              <p className="text-muted-foreground text-sm">No global fees.</p>
            ) : (
              <div className="space-y-3">
                {localGlobalFees.map((fee, index) => {
                  if (fee._isDeleted) return null;
                  return (
                    <div key={fee.id || `new-${index}`} className="flex gap-3 items-center">
                      <Input
                        value={fee.fee_name}
                        onChange={(e) => updateLocalGlobalFee(index, "fee_name", e.target.value)}
                        disabled={!isFeesEditable}
                        className="flex-1"
                        placeholder="Fee name"
                      />
                      <Input
                        type="number"
                        value={fee.amount}
                        onChange={(e) => updateLocalGlobalFee(index, "amount", parseFloat(e.target.value) || 0)}
                        disabled={!isFeesEditable}
                        className="w-32"
                        placeholder="Amount"
                      />
                      <Select
                        value={fee.distribution_method}
                        onValueChange={(v) => updateLocalGlobalFee(index, "distribution_method", v)}
                        disabled={!isFeesEditable}
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="by_value">By Value</SelectItem>
                          <SelectItem value="by_quantity">By Quantity</SelectItem>
                          <SelectItem value="by_cbm">By CBM</SelectItem>
                        </SelectContent>
                      </Select>
                      {isFeesEditable && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteLocalGlobalFee(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply Fees Button */}
        {isFeesEditable && hasFeeChanges && (
          <div className="flex justify-end">
            <Button
              onClick={() => applyFeesMutation.mutate()}
              disabled={applyFeesMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {applyFeesMutation.isPending ? "Applying..." : "Apply Fee Changes"}
            </Button>
          </div>
        )}

        {/* Cost Summary */}
        <Card>
          <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items Subtotal</span><span className="text-foreground">${fmt2(itemsSubtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Line Item Fees</span><span className="text-foreground">${fmt2(lineFeesTotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Global Fees</span><span className="text-foreground">${fmt2(globalFeesTotal)}</span></div>
            {taxAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({purchase.local_tax_rate}%)</span><span className="text-foreground">${fmt2(taxAmount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-semibold text-lg"><span className="text-foreground">Total</span><span className="text-foreground">${fmt2(total)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Arrived Date Dialog */}
      <Dialog open={showArrivedDialog} onOpenChange={setShowArrivedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Arrival Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arrival Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !arrivedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {arrivedDate ? format(arrivedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={arrivedDate}
                    onSelect={(date) => date && setArrivedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArrivedDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateStatus.mutate({ status: "arrived", arrivedAt: arrivedDate.toISOString() });
                setShowArrivedDialog(false);
              }}
              disabled={updateStatus.isPending}
            >
              Confirm Arrival
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
