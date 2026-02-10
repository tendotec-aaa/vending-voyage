import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PurchaseStatus = Database["public"]["Enums"]["purchase_status"];

const statusFlow: PurchaseStatus[] = ["draft", "pending", "in_transit", "received"];
const statusColors: Record<PurchaseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-600",
  in_transit: "bg-blue-500/20 text-blue-600",
  received: "bg-green-500/20 text-green-600",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
            landed_unit_cost, line_fees_total, global_fees_allocated, tax_allocated,
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

  const updateStatus = useMutation({
    mutationFn: async (status: PurchaseStatus) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "received") {
        updateData.received_inventory = true;
        updateData.received_at = new Date().toISOString();
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

  const addGlobalFee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_global_fees").insert({
        purchase_id: id!,
        fee_name: "New Fee",
        amount: 0,
        distribution_method: "by_value",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-global-fees", id] }),
  });

  const updateGlobalFee = useMutation({
    mutationFn: async ({ feeId, field, value }: { feeId: string; field: string; value: any }) => {
      const { error } = await supabase.from("purchase_global_fees").update({ [field]: value }).eq("id", feeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-global-fees", id] }),
  });

  const deleteGlobalFee = useMutation({
    mutationFn: async (feeId: string) => {
      const { error } = await supabase.from("purchase_global_fees").delete().eq("id", feeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-global-fees", id] }),
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!purchase) return <AppLayout><div className="text-muted-foreground">Purchase not found</div></AppLayout>;

  const isEditable = purchase.status !== "received" && purchase.status !== "cancelled";
  const currentStatusIndex = statusFlow.indexOf(purchase.status as PurchaseStatus);
  const nextStatus = currentStatusIndex < statusFlow.length - 1 ? statusFlow[currentStatusIndex + 1] : null;
  const supplier = purchase.supplier as any;
  const items = (purchase.purchase_items || []) as any[];

  const itemsSubtotal = items.reduce((sum: number, i: any) => sum + i.quantity_ordered * i.unit_cost, 0);
  const globalFeesTotal = globalFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const taxAmount = purchase.type === "local" && purchase.local_tax_rate ? (itemsSubtotal + globalFeesTotal) * (purchase.local_tax_rate / 100) : 0;

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
              <Button onClick={() => updateStatus.mutate(nextStatus)} disabled={updateStatus.isPending}>
                Mark as {nextStatus.replace("_", " ")}
              </Button>
            )}
            {isEditable && purchase.status !== "cancelled" && (
              <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate("cancelled")}>
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
              <div className="space-y-3">
                {items.map((item: any) => {
                  const itemLineFees = lineFees.filter((f) => f.purchase_line_id === item.id);
                  return (
                    <div key={item.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{item.item_detail?.name || "Unnamed Item"}</p>
                          <p className="text-xs text-muted-foreground">{item.item_detail?.sku || "No SKU"}</p>
                        </div>
                        <Badge variant="outline">
                          {item.quantity_received || 0}/{item.quantity_ordered} received
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Qty: </span>{item.quantity_ordered}</div>
                        <div><span className="text-muted-foreground">Unit Cost: </span>${item.unit_cost}</div>
                        <div><span className="text-muted-foreground">CBM: </span>{item.cbm || 0}</div>
                        <div><span className="text-muted-foreground">Line Fees: </span>${item.line_fees_total || 0}</div>
                        <div><span className="text-muted-foreground">Landed/Unit: </span>${(item.landed_unit_cost || 0).toFixed(2)}</div>
                      </div>
                      {itemLineFees.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-border space-y-1">
                          {itemLineFees.map((fee) => (
                            <div key={fee.id} className="flex justify-between text-sm text-muted-foreground">
                              <span>{fee.fee_name}</span>
                              <span>${fee.amount}</span>
                            </div>
                          ))}
                        </div>
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
            {isEditable && (
              <Button variant="outline" size="sm" onClick={() => addGlobalFee.mutate()}>
                <Plus className="mr-2 h-4 w-4" /> Add Fee
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {globalFees.length === 0 ? (
              <p className="text-muted-foreground text-sm">No global fees.</p>
            ) : (
              <div className="space-y-3">
                {globalFees.map((fee) => (
                  <div key={fee.id} className="flex gap-3 items-center">
                    <Input
                      value={fee.fee_name}
                      onChange={(e) => updateGlobalFee.mutate({ feeId: fee.id, field: "fee_name", value: e.target.value })}
                      disabled={!isEditable}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={fee.amount}
                      onChange={(e) => updateGlobalFee.mutate({ feeId: fee.id, field: "amount", value: parseFloat(e.target.value) || 0 })}
                      disabled={!isEditable}
                      className="w-32"
                    />
                    <Select
                      value={fee.distribution_method}
                      onValueChange={(v) => updateGlobalFee.mutate({ feeId: fee.id, field: "distribution_method", value: v })}
                      disabled={!isEditable}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="by_value">By Value</SelectItem>
                        <SelectItem value="by_quantity">By Quantity</SelectItem>
                        <SelectItem value="by_cbm">By CBM</SelectItem>
                      </SelectContent>
                    </Select>
                    {isEditable && (
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteGlobalFee.mutate(fee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items Subtotal</span><span>${itemsSubtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Global Fees</span><span>${globalFeesTotal.toLocaleString()}</span></div>
            {taxAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({purchase.local_tax_rate}%)</span><span>${taxAmount.toFixed(2)}</span></div>}
            <Separator />
            <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>${(purchase.total_amount || 0).toLocaleString()}</span></div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
