import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SlotData, PlannedAction } from "@/hooks/useRoutes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: SlotData[];
  onConfirm: (action: PlannedAction) => void;
}

export function PlannedSwapDialog({ open, onOpenChange, slots, onConfirm }: Props) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [newProductId, setNewProductId] = useState("");

  const productsQuery = useQuery({
    queryKey: ["swap-products"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("item_details")
        .select("id, name")
        .eq("type", "toy")
        .order("name");
      return data || [];
    },
  });

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedProduct = productsQuery.data?.find((p) => p.id === newProductId);

  const handleConfirm = () => {
    if (!selectedSlot || !selectedProduct) return;
    onConfirm({
      type: "swap",
      slotId: selectedSlot.id,
      machineSerial: selectedSlot.machine_serial,
      slotNumber: selectedSlot.slot_number,
      oldProductId: selectedSlot.current_product_id || "",
      oldProductName: selectedSlot.product_name || "Empty",
      newProductId: selectedProduct.id,
      newProductName: selectedProduct.name,
      capacity: selectedSlot.capacity || 150,
    });
    setSelectedSlotId("");
    setNewProductId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Plan a Swap</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Slot</Label>
            <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
              <SelectTrigger><SelectValue placeholder="Choose a machine slot" /></SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slot.machine_serial} — Slot {slot.slot_number} ({slot.product_name || "Empty"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>New Product</Label>
            <Select value={newProductId} onValueChange={setNewProductId}>
              <SelectTrigger><SelectValue placeholder="Choose new product" /></SelectTrigger>
              <SelectContent>
                {(productsQuery.data || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSlot && selectedProduct && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p><strong>Swap:</strong> {selectedSlot.product_name || "Empty"} → {selectedProduct.name}</p>
              <p><strong>Load:</strong> {selectedSlot.capacity || 150} units of {selectedProduct.name}</p>
            </div>
          )}
          <Button onClick={handleConfirm} disabled={!selectedSlotId || !newProductId} className="w-full">
            Confirm Swap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
