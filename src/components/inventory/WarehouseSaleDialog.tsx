import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WarehouseSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemDetailId: string;
  itemName: string;
}

export function WarehouseSaleDialog({ open, onOpenChange, itemDetailId, itemName }: WarehouseSaleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(0);
  const [warehouseId, setWarehouseId] = useState("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_system", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async () => {
    if (quantity <= 0 || !warehouseId) return;
    setProcessing(true);
    try {
      // Get current running balance
      const { data: lastEntry } = await supabase
        .from("inventory_ledger")
        .select("running_balance")
        .eq("item_detail_id", itemDetailId)
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentBalance = lastEntry?.running_balance ?? 0;
      const newBalance = currentBalance - quantity;

      const { error } = await supabase.from("inventory_ledger").insert({
        item_detail_id: itemDetailId,
        warehouse_id: warehouseId,
        movement_type: "warehouse_sale",
        quantity: -quantity,
        running_balance: newBalance,
        reference_type: "manual",
        performed_by: user?.id || null,
        notes: note || `Warehouse sale — ${quantity} units of ${itemName}`,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["item-inventory-ledger", itemDetailId] });
      queryClient.invalidateQueries({ queryKey: ["item-warehouse-stock", itemDetailId] });
      onOpenChange(false);
      setQuantity(0);
      setNote("");
      setWarehouseId("");
      toast({ title: "Warehouse sale recorded", description: `${quantity} units deducted from inventory.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Warehouse Sale — {itemName}</AlertDialogTitle>
          <AlertDialogDescription>
            Record a wholesale/direct sale from warehouse inventory. This will deduct units and create a ledger entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity || ""}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Number of units sold"
            />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Wholesale to Bodega XYZ, 500 capsules"
              rows={2}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={processing || quantity <= 0 || !warehouseId}>
            {processing ? "Processing..." : "Record Sale"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
